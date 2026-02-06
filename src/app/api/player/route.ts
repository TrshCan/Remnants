import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
    PlayerAction,
    ActionType,
    PlayerStateSnapshot,
    ActionResponse,
    GameEvent
} from '@/lib/game';
import { getAPState, calculateCurrentAP } from '@/lib/game/ap';
import { checkRateLimit } from '@/lib/game/ratelimit';
import { resolveAction, PlayerData } from '@/lib/game/combat';

const VALID_ACTIONS: ActionType[] = ['attack', 'defend', 'wait', 'look', 'status'];

/**
 * GET /api/player?id={playerId}
 * Get player state.
 */
export async function GET(request: NextRequest) {
    const playerId = request.nextUrl.searchParams.get('id');

    if (!playerId) {
        return NextResponse.json(
            { error: 'Player ID required' },
            { status: 400 }
        );
    }

    try {
        const player = await db.getPlayer(playerId);

        if (!player) {
            return NextResponse.json(
                { error: 'Player not found' },
                { status: 404 }
            );
        }

        const currentAP = calculateCurrentAP(
            player.ap_current,
            new Date(player.ap_last_update),
            player.ap_max,
            player.ap_debt
        );

        const snapshot: PlayerStateSnapshot = {
            hp: player.hp,
            hp_max: player.hp_max,
            ap: Math.floor(currentAP),
            ap_max: player.ap_max,
            ap_state: getAPState({
                ap_current: player.ap_current,
                ap_max: player.ap_max,
                ap_debt: player.ap_debt,
                ap_last_update: new Date(player.ap_last_update),
            }),
            status: player.status,
        };

        return NextResponse.json(snapshot);
    } catch (error) {
        console.error('Error fetching player:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/player
 * Submit player action.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { player_id, instance_id, action, target_id } = body;

        if (!player_id || !instance_id || !action) {
            return NextResponse.json(
                { error: 'Missing required fields: player_id, instance_id, action' },
                { status: 400 }
            );
        }

        if (!VALID_ACTIONS.includes(action)) {
            return NextResponse.json(
                { error: `Invalid action. Valid: ${VALID_ACTIONS.join(', ')}` },
                { status: 400 }
            );
        }

        // Get player
        const player = await db.getPlayer(player_id);
        if (!player) {
            return NextResponse.json(
                { error: 'Player not found' },
                { status: 404 }
            );
        }

        // Check rate limit
        const rateCheck = checkRateLimit(
            player.last_action_at ? new Date(player.last_action_at) : null
        );
        if (!rateCheck.allowed) {
            return NextResponse.json(
                { error: rateCheck.message, wait_ms: rateCheck.wait_ms },
                { status: 429 }
            );
        }

        // Get instance
        const instance = await db.getInstance(instance_id);
        if (!instance) {
            return NextResponse.json(
                { error: 'Instance not found' },
                { status: 404 }
            );
        }

        // Convert to typed objects
        const typedPlayer: PlayerData = {
            id: player.id,
            name: player.name,
            hp: player.hp,
            hp_max: player.hp_max,
            ap_current: player.ap_current,
            ap_max: player.ap_max,
            ap_debt: player.ap_debt,
            ap_last_update: new Date(player.ap_last_update),
            status: player.status,
        };

        const combatState = instance.combat_state || {
            phase: 'IDLE',
            turn_order: [],
            current_turn_index: 0,
            enemies: [],
            round: 0,
        };

        const playerAction: PlayerAction = {
            type: action as ActionType,
            target_id,
            player_id,
            instance_id,
        };

        // Resolve action
        const { newPlayer, newCombatState, events } = resolveAction(
            playerAction,
            typedPlayer,
            combatState
        );

        // Persist changes
        await db.updatePlayer(player_id, {
            hp: newPlayer.hp,
            ap_current: newPlayer.ap_current,
            ap_debt: newPlayer.ap_debt,
            ap_last_update: newPlayer.ap_last_update,
            last_action_at: new Date(),
            status: newPlayer.status,
        });

        await db.updateInstanceCombatState(instance_id, newCombatState);

        // Persist events
        const savedEvents: GameEvent[] = [];
        for (const event of events) {
            const saved = await db.createEvent(
                event.instance_id,
                event.message,
                event.event_type,
                event.player_id || undefined
            );
            savedEvents.push(saved as GameEvent);
        }

        // Build response
        const currentAP = calculateCurrentAP(
            newPlayer.ap_current,
            newPlayer.ap_last_update,
            newPlayer.ap_max,
            newPlayer.ap_debt
        );

        const response: ActionResponse = {
            success: true,
            events: savedEvents,
            player_state: {
                hp: newPlayer.hp,
                hp_max: newPlayer.hp_max,
                ap: Math.floor(currentAP),
                ap_max: newPlayer.ap_max,
                ap_state: getAPState(newPlayer),
                status: newPlayer.status as 'alive' | 'dead' | 'resting' | 'in_combat',
            },
            combat_state: newCombatState,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error processing action:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

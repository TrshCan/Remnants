import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
    PlayerAction,
    ActionType,
    PlayerStateSnapshot,
    ActionResponse,
    GameEvent,
    normalizeStatus,
    CombatState
} from '@/lib/game';
import { getAPState, calculateCurrentAP } from '@/lib/game/ap';
import { checkRateLimit } from '@/lib/game/ratelimit';
import { resolveAction, resolveEnemyTurn, PlayerData } from '@/lib/game/combat';
import { PlayerStatus as PrismaPlayerStatus } from '@prisma/client';

const VALID_ACTIONS: ActionType[] = ['attack', 'defend', 'wait', 'look', 'status', 'explore', 'inventory', 'use', 'talk'];

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
            player.apCurrent,
            new Date(player.apLastUpdate),
            player.apMax,
            player.apDebt
        );

        const snapshot: PlayerStateSnapshot = {
            hp: player.hp,
            hp_max: player.hpMax,
            mp: player.mp,
            mp_max: player.mpMax,
            ap: Math.floor(currentAP),
            ap_max: player.apMax,
            ap_state: getAPState({
                ap_current: player.apCurrent,
                ap_max: player.apMax,
                ap_debt: player.apDebt,
                ap_last_update: new Date(player.apLastUpdate),
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
            player.lastActionAt ? new Date(player.lastActionAt) : null
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

        // Convert to typed objects for combat system
        const typedPlayer: PlayerData = {
            id: player.id,
            name: player.name,
            hp: player.hp,
            hp_max: player.hpMax,
            mp: player.mp,
            mp_max: player.mpMax,
            ap_current: player.apCurrent,
            ap_max: player.apMax,
            ap_debt: player.apDebt,
            ap_last_update: new Date(player.apLastUpdate),
            status: player.status,
        };

        const combatState: CombatState = (instance.combatState as unknown as CombatState) || {
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
        let { newPlayer, newCombatState, events } = resolveAction(
            playerAction,
            typedPlayer,
            combatState
        );

        // If it's now ENEMY_TURN, process enemy actions immediately
        if (newCombatState.phase === 'ENEMY_TURN') {
            const enemyResult = resolveEnemyTurn(newPlayer, newCombatState);

            // Update state with enemy results
            newPlayer = enemyResult.newPlayer;
            newCombatState = enemyResult.newCombatState;
            events = [...events, ...enemyResult.events];

            // Fixup events missing instance_id/player_id from resolveEnemyTurn
            events.forEach(e => {
                if (e.instance_id === 'n/a') e.instance_id = instance_id;
            });
        }

        // Persist changes (map back to Prisma camelCase)
        await db.updatePlayer(player_id, {
            hp: newPlayer.hp,
            mp: newPlayer.mp,
            apCurrent: newPlayer.ap_current,
            apDebt: newPlayer.ap_debt,
            apLastUpdate: newPlayer.ap_last_update,
            lastActionAt: new Date(),
            status: newPlayer.status.toUpperCase() as PrismaPlayerStatus,
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
            // Map Prisma event (camelCase) to GameEvent (snake_case)
            savedEvents.push({
                id: saved.id,
                instance_id: saved.instanceId,
                player_id: saved.playerId,
                message: saved.message,
                event_type: saved.eventType.toLowerCase() as GameEvent['event_type'],
                created_at: saved.createdAt,
            });
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
                mp: newPlayer.mp,
                mp_max: newPlayer.mp_max,
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

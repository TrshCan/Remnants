import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
    createCombatState,
    resolveAction,
    isCombatComplete,
    isPlayerTurn
} from '@/lib/game/combat';
import { checkRateLimit } from '@/lib/game/ratelimit';
import { getAPState, calculateCurrentAP } from '@/lib/game/ap';
import { Enemy, PlayerAction, ActionType } from '@/lib/game';

/**
 * GET /api/combat?instance_id={instanceId}
 * Get current combat state.
 */
export async function GET(request: NextRequest) {
    const instanceId = request.nextUrl.searchParams.get('instance_id');

    if (!instanceId) {
        return NextResponse.json(
            { error: 'instance_id required' },
            { status: 400 }
        );
    }

    try {
        const instance = await db.getInstance(instanceId);

        if (!instance) {
            return NextResponse.json(
                { error: 'Instance not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            instance_id: instance.id,
            zone_type: instance.zoneType,
            combat_state: instance.combatState,
        });
    } catch (error) {
        console.error('Error fetching combat:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/combat
 * Start combat or resolve combat action.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action: actionType, instance_id, player_id, enemies } = body;

        // Start new combat
        if (actionType === 'start' && enemies) {
            return await startCombat(instance_id, player_id, enemies);
        }

        // Resolve combat action - delegate to player API
        // Combat actions go through /api/player
        return NextResponse.json(
            { error: 'Combat actions should be sent to /api/player' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Error in combat:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

async function startCombat(
    instanceId: string,
    playerId: string,
    enemies: Enemy[]
) {
    const instance = await db.getInstance(instanceId);
    if (!instance) {
        return NextResponse.json(
            { error: 'Instance not found' },
            { status: 404 }
        );
    }

    const players = await db.getInstancePlayers(instanceId);
    const playerIds = players.map(p => p.id);

    if (!playerIds.includes(playerId)) {
        return NextResponse.json(
            { error: 'Player not in instance' },
            { status: 403 }
        );
    }

    const combatState = createCombatState(playerIds, enemies);
    await db.updateInstanceCombatState(instanceId, combatState);

    // Create combat start event
    await db.createEvent(
        instanceId,
        'Combat begins.',
        'combat'
    );

    for (const enemy of enemies) {
        await db.createEvent(
            instanceId,
            `${enemy.name} appears.`,
            'combat'
        );
    }

    return NextResponse.json({
        success: true,
        combat_state: combatState,
    });
}

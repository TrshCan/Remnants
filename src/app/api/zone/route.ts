import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/zone?id={instanceId}
 * Get zone/instance state.
 */
export async function GET(request: NextRequest) {
    const instanceId = request.nextUrl.searchParams.get('id');

    if (!instanceId) {
        return NextResponse.json(
            { error: 'Instance ID required' },
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

        const players = await db.getInstancePlayers(instanceId);

        return NextResponse.json({
            id: instance.id,
            zone_type: instance.zoneType,
            combat_state: instance.combatState,
            players: players.map(p => ({
                id: p.id,
                name: p.name,
                status: p.status,
            })),
        });
    } catch (error) {
        console.error('Error fetching zone:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/zone
 * Create instance or join/leave.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, zone_type, instance_id, player_id } = body;

        switch (action) {
            case 'create':
                return await createInstance(zone_type);
            case 'join':
                return await joinInstance(instance_id, player_id);
            case 'leave':
                return await leaveInstance(instance_id, player_id);
            default:
                return NextResponse.json(
                    { error: 'Invalid action. Valid: create, join, leave' },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('Error in zone action:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

async function createInstance(zoneType: string) {
    if (!zoneType) {
        return NextResponse.json(
            { error: 'zone_type required' },
            { status: 400 }
        );
    }

    const instance = await db.createInstance(zoneType);

    await db.createEvent(
        instance.id,
        `You enter ${zoneType}.`,
        'narrative'
    );

    return NextResponse.json({
        success: true,
        instance_id: instance.id,
        zone_type: instance.zoneType,
    });
}

async function joinInstance(instanceId: string, playerId: string) {
    if (!instanceId || !playerId) {
        return NextResponse.json(
            { error: 'instance_id and player_id required' },
            { status: 400 }
        );
    }

    const instance = await db.getInstance(instanceId);
    if (!instance) {
        return NextResponse.json(
            { error: 'Instance not found' },
            { status: 404 }
        );
    }

    const player = await db.getPlayer(playerId);
    if (!player) {
        return NextResponse.json(
            { error: 'Player not found' },
            { status: 404 }
        );
    }

    await db.addPlayerToInstance(instanceId, playerId);

    await db.createEvent(
        instanceId,
        `${player.name} arrives.`,
        'narrative',
        playerId
    );

    return NextResponse.json({
        success: true,
        message: 'Joined instance',
    });
}

async function leaveInstance(instanceId: string, playerId: string) {
    if (!instanceId || !playerId) {
        return NextResponse.json(
            { error: 'instance_id and player_id required' },
            { status: 400 }
        );
    }

    const player = await db.getPlayer(playerId);

    await db.removePlayerFromInstance(instanceId, playerId);

    if (player) {
        await db.createEvent(
            instanceId,
            `${player.name} departs.`,
            'narrative',
            playerId
        );
    }

    return NextResponse.json({
        success: true,
        message: 'Left instance',
    });
}

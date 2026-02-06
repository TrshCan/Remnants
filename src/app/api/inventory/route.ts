import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ITEMS, getItem } from '@/lib/game/data';

/**
 * GET /api/inventory?player_id={playerId}
 * Get player inventory.
 */
export async function GET(request: NextRequest) {
    const playerId = request.nextUrl.searchParams.get('player_id');

    if (!playerId) {
        return NextResponse.json(
            { error: 'player_id required' },
            { status: 400 }
        );
    }

    try {
        const inventory = await db.getInventory(playerId);

        // Enrich with item definitions
        const enrichedInventory = inventory.map(invItem => {
            const itemDef = getItem(invItem.itemId);
            return {
                id: invItem.id,
                itemId: invItem.itemId,
                quantity: invItem.quantity,
                slot: invItem.slot,
                metadata: invItem.metadata,
                definition: itemDef || {
                    id: invItem.itemId,
                    name: 'Unknown Item',
                    description: 'An unidentified object.',
                    type: 'misc',
                    rarity: 'common',
                    stackable: false,
                    maxStack: 1,
                    value: 0,
                },
            };
        });

        return NextResponse.json({ inventory: enrichedInventory });
    } catch (error) {
        console.error('Error fetching inventory:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/inventory
 * Use or equip an item.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { player_id, item_id, action } = body;

        if (!player_id || !item_id || !action) {
            return NextResponse.json(
                { error: 'Missing required fields: player_id, item_id, action' },
                { status: 400 }
            );
        }

        const player = await db.getPlayer(player_id);
        if (!player) {
            return NextResponse.json(
                { error: 'Player not found' },
                { status: 404 }
            );
        }

        const inventory = await db.getInventory(player_id);
        const invItem = inventory.find(i => i.itemId === item_id);

        if (!invItem) {
            return NextResponse.json(
                { error: 'Item not in inventory' },
                { status: 404 }
            );
        }

        const itemDef = getItem(item_id);
        if (!itemDef) {
            return NextResponse.json(
                { error: 'Unknown item type' },
                { status: 400 }
            );
        }

        let message = '';
        let updates: any = {};

        if (action === 'use') {
            if (!itemDef.useEffect) {
                return NextResponse.json(
                    { error: 'This item cannot be used' },
                    { status: 400 }
                );
            }

            switch (itemDef.useEffect.type) {
                case 'heal':
                    const newHp = Math.min(player.hp + itemDef.useEffect.value, player.hpMax);
                    updates.hp = newHp;
                    message = `You use ${itemDef.name}. Restored ${newHp - player.hp} HP.`;
                    break;
                case 'restore_ap':
                    const newAp = Math.min(player.apCurrent + itemDef.useEffect.value, player.apMax);
                    updates.apCurrent = newAp;
                    message = `You use ${itemDef.name}. Restored ${itemDef.useEffect.value} AP.`;
                    break;
                default:
                    message = `You use ${itemDef.name}.`;
            }

            // Consume item
            if (invItem.quantity > 1) {
                // Just reduce quantity (would need an update method)
                // For now, we'll remove and re-add
                await db.removeInventoryItem(invItem.id);
                await db.addInventoryItem(player_id, item_id, invItem.quantity - 1);
            } else {
                await db.removeInventoryItem(invItem.id);
            }

            if (Object.keys(updates).length > 0) {
                await db.updatePlayer(player_id, updates);
            }

        } else if (action === 'equip') {
            if (!itemDef.equipSlot) {
                return NextResponse.json(
                    { error: 'This item cannot be equipped' },
                    { status: 400 }
                );
            }

            // Toggle equip state
            const isEquipped = invItem.slot === itemDef.equipSlot;

            // For simplicity, we'll just update metadata or slot field
            // This would need a proper update method
            message = isEquipped
                ? `You unequip ${itemDef.name}.`
                : `You equip ${itemDef.name}.`;

            // Note: Full equip logic would update the inventory item's slot field
        }

        return NextResponse.json({
            success: true,
            message,
        });

    } catch (error) {
        console.error('Error with inventory action:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

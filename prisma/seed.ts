import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Seeding database...');

    // Clean up existing data (in reverse order of dependencies)
    // Account -> Character -> Stats/Inventory
    //             |-> InstancePlayer -> Instance
    //             |-> PlayerFlag
    //             |-> Event

    // Note: In a real "force-reset" via prisma db push, tables are empty, 
    // but if we re-run seed on existing DB, we want cleanup.
    // For now, let's just create raw data assuming empty or handling conflicts via upsert.

    // 1. Create Account
    // In a real app we'd hash the password. Here we use a dummy hash.
    const account = await prisma.account.upsert({
        where: { email: 'demo@example.com' },
        update: {},
        create: {
            id: 'demo-account',
            email: 'demo@example.com',
            passwordHash: '$2b$10$EpOd.zM0.0000000000000e000000000000000000000000000000', // dummy bcrypt
        },
    });
    console.log('Created account:', account.email);

    // 2. Create Instance (Zone)
    const instance = await prisma.instance.upsert({
        where: { id: 'demo-instance' },
        update: {},
        create: {
            id: 'demo-instance',
            zoneType: 'ruins',
            combatState: {
                phase: 'IDLE',
                round: 0,
                enemies: [],
                turn_order: [],
                current_turn_index: 0
            }
        },
    });
    console.log('Created instance:', instance.id);

    // 3. Create Character (linked to Account)
    const character = await prisma.character.upsert({
        where: { id: 'demo-player' },
        update: {}, // Updates if exists
        create: {
            id: 'demo-player',
            accountId: account.id,
            name: 'Wanderer',
            hp: 100,
            hpMax: 100,
            mp: 20,
            mpMax: 20,
            apCurrent: 3,
            apMax: 3,
            // Create default CombatStats
            combatStats: {
                create: {
                    strength: 10,
                    dexterity: 8,
                    constitution: 10,
                    intelligence: 5,
                    attackPower: 12,
                    defense: 2
                }
            }
        },
    });
    console.log('Created character:', character.name);

    // 3.1 Ensure CombatStats exist if character existed
    // (upsert above only creates stats if creating character)
    const stats = await prisma.combatStats.findUnique({
        where: { characterId: character.id }
    });
    if (!stats) {
        await prisma.combatStats.create({
            data: {
                characterId: character.id,
                strength: 10,
                dexterity: 8,
                constitution: 10,
                intelligence: 5
            }
        });
        console.log('Created missing combat stats');
    }

    // 4. Add Items to Inventory
    // (No UPSERT on many-to-many easily without unique constraints on items, 
    // but InventoryItem has ID. We'll just create a starter sword if list is empty)
    const inventoryCount = await prisma.inventoryItem.count({
        where: { characterId: character.id }
    });

    if (inventoryCount === 0) {
        await prisma.inventoryItem.create({
            data: {
                characterId: character.id,
                itemId: 'rusted_sword',
                quantity: 1,
                slot: 'main_hand',
                metadata: {
                    name: "Rusted Sword",
                    description: "Old but sharp enough."
                }
            }
        });

        await prisma.inventoryItem.create({
            data: {
                characterId: character.id,
                itemId: 'health_stim',
                quantity: 3,
            }
        });

        await prisma.inventoryItem.create({
            data: {
                characterId: character.id,
                itemId: 'ration_pack',
                quantity: 5,
            }
        });

        await prisma.inventoryItem.create({
            data: {
                characterId: character.id,
                itemId: 'leather_vest',
                quantity: 1,
                slot: 'body',
            }
        });

        console.log('Added starter items');
    }

    // 5. Add character to instance
    await prisma.instancePlayer.upsert({
        where: {
            instanceId_playerId: {
                instanceId: 'demo-instance',
                playerId: 'demo-player',
            },
        },
        update: {},
        create: {
            instanceId: 'demo-instance',
            playerId: 'demo-player',
        },
    });
    console.log('Joined instance');

    // 6. Welcome Event
    await prisma.event.create({
        data: {
            instanceId: 'demo-instance',
            message: 'You stand ready. New strength flows through you.',
            eventType: 'SYSTEM',
        },
    });
    console.log('Created welcome event');

    console.log('Seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await pool.end();
        await prisma.$disconnect();
    });

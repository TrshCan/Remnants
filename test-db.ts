import 'dotenv/config';
import { db, prisma } from './src/lib/db';

async function main() {
    console.log('Testing db.getPlayer...');
    const playerId = 'demo-player';

    try {
        const player = await db.getPlayer(playerId);
        console.log('Player found:', player ? 'YES' : 'NO');
        if (player) {
            console.log('Name:', player.name);
            console.log('HP:', player.hp);
            console.log('Stats:', player.combatStats);
            console.log('Inventory:', player.inventory);
        }
    } catch (error) {
        console.error('Error fetching player:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

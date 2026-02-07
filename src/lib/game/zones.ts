// ============================================
// ZONE DEFINITIONS
// ============================================

export type ZoneType = 'safe' | 'danger';
export type ZoneId =
    | 'village' | 'town' | 'city' | 'campfire'  // Safe zones
    | 'catacomb' | 'forest' | 'mountain' | 'ruins' | 'wasteland';  // Danger zones

export interface ZoneDefinition {
    id: ZoneId;
    name: string;
    type: ZoneType;
    description: string;
    welcomeMessages: string[];
    ambientMessages: string[];
    exploreChance: number;  // Chance to trigger exploration event (0-1)
    enemyTypes?: string[];  // Enemy IDs that can spawn here
}

export const ZONES: Record<ZoneId, ZoneDefinition> = {
    // ============ SAFE ZONES ============
    village: {
        id: 'village',
        name: 'Dusty Hollow',
        type: 'safe',
        description: 'A small settlement of survivors. Makeshift homes huddle together for warmth.',
        welcomeMessages: [
            "You arrive at Dusty Hollow. Smoke rises from scattered chimneys.",
            "The village gates creak open. Wary eyes watch from the shadows.",
            "You've reached Dusty Hollow. A child waves from behind a rusted fence.",
            "The familiar scent of cooking fires greets you. Home, for now.",
        ],
        ambientMessages: [
            "A merchant hawks salvaged goods nearby.",
            "You hear distant hammering — someone repairing the walls.",
            "An old woman offers you a knowing nod.",
        ],
        exploreChance: 0.1,  // Low chance of events in safe zones
    },

    town: {
        id: 'town',
        name: 'Iron Haven',
        type: 'safe',
        description: 'A fortified trading post. Walls of scrap metal protect those within.',
        welcomeMessages: [
            "You pass through the gates of Iron Haven. The marketplace buzzes with activity.",
            "Iron Haven welcomes you. Guards nod as you enter.",
            "The town's metal walls gleam in the pale light. Sanctuary at last.",
            "You've arrived at Iron Haven. The smell of oil and cooking meat fills the air.",
        ],
        ambientMessages: [
            "Traders argue over the price of power cells.",
            "A guard patrol marches past, weapons ready.",
            "Someone plays a makeshift instrument in the square.",
        ],
        exploreChance: 0.05,
    },

    city: {
        id: 'city',
        name: 'New Bastion',
        type: 'safe',
        description: 'The largest known settlement. Civilization clings to life here.',
        welcomeMessages: [
            "The towering walls of New Bastion rise before you. Humanity's last stronghold.",
            "You enter New Bastion. The city hums with desperate purpose.",
            "Lights flicker in the city's heart. New Bastion still stands.",
            "The gates of New Bastion open. Inside, life persists against all odds.",
        ],
        ambientMessages: [
            "A newsmonger shouts headlines of distant battles.",
            "Tech scavengers display their latest finds.",
            "The Council's guards watch from elevated platforms.",
        ],
        exploreChance: 0.02,
    },

    campfire: {
        id: 'campfire',
        name: 'Wanderer\'s Rest',
        type: 'safe',
        description: 'A temporary camp. The fire keeps the darkness at bay.',
        welcomeMessages: [
            "You find a sheltered spot and light a fire. The flames dance against the night.",
            "A campfire crackles before you. Time to rest.",
            "You set up camp. The warmth is a small comfort in this cold world.",
            "The fire springs to life. For a moment, you can pretend things are normal.",
        ],
        ambientMessages: [
            "The fire pops and sparks fly upward.",
            "Strange sounds echo in the distance, but the light keeps them away.",
            "You stare into the flames, memories flickering.",
        ],
        exploreChance: 0.15,
    },

    // ============ DANGER ZONES ============
    catacomb: {
        id: 'catacomb',
        name: 'The Bone Halls',
        type: 'danger',
        description: 'Ancient tunnels beneath the earth. The dead do not rest easy here.',
        welcomeMessages: [
            "You descend into The Bone Halls. The air grows cold and still.",
            "Darkness swallows you as you enter the catacombs. Your footsteps echo endlessly.",
            "The tunnels yawn before you. Something stirs in the depths.",
            "You push into The Bone Halls. Skulls watch from niches in the walls.",
        ],
        ambientMessages: [
            "Water drips somewhere in the darkness.",
            "You hear scratching sounds behind you... or was it ahead?",
            "The bones seem to shift when you're not looking.",
        ],
        exploreChance: 0.6,
        enemyTypes: ['scavenger_drone', 'corrupted_sentinel'],
    },

    forest: {
        id: 'forest',
        name: 'The Withered Woods',
        type: 'danger',
        description: 'Dead trees stretch toward a grey sky. Things hunt among the shadows.',
        welcomeMessages: [
            "You enter The Withered Woods. Twisted branches claw at the colorless sky.",
            "The forest closes around you. Every shadow might hide teeth.",
            "Dead leaves crunch underfoot as you push into the woods.",
            "The Withered Woods welcome no one. Yet here you are.",
        ],
        ambientMessages: [
            "A branch snaps somewhere in the undergrowth.",
            "You glimpse movement between the dead trees.",
            "The wind carries sounds that might be growls... or whispers.",
        ],
        exploreChance: 0.5,
        enemyTypes: ['feral_hound', 'raider'],
    },

    mountain: {
        id: 'mountain',
        name: 'The Iron Peaks',
        type: 'danger',
        description: 'Jagged mountains where the old machines still wander.',
        welcomeMessages: [
            "You climb into The Iron Peaks. The air thins, but the danger grows thicker.",
            "The mountains loom before you, cold and unforgiving.",
            "You ascend into hostile territory. Metal glints among the rocks.",
            "The Iron Peaks test all who dare their slopes. Few return.",
        ],
        ambientMessages: [
            "Servo motors whine somewhere above you.",
            "Rocks clatter down the slope — disturbed by what?",
            "You spot old war machines, frozen mid-stride, waiting.",
        ],
        exploreChance: 0.55,
        enemyTypes: ['corrupted_sentinel', 'proto_construct', 'scavenger_drone'],
    },

    ruins: {
        id: 'ruins',
        name: 'The Shattered District',
        type: 'danger',
        description: 'Remains of the old city. Scavengers and worse pick through the bones.',
        welcomeMessages: [
            "You enter The Shattered District. Collapsed towers cast long shadows.",
            "The ruins stretch endlessly. What was once home is now a tomb.",
            "You pick your way through rubble. Every building might hold treasure... or death.",
            "The old city surrounds you. Its ghosts have not forgotten.",
        ],
        ambientMessages: [
            "Glass crunches beneath your boots.",
            "A building groans, threatening to collapse.",
            "You hear voices... but there's no one there.",
        ],
        exploreChance: 0.45,
        enemyTypes: ['raider', 'feral_hound', 'scavenger_drone'],
    },

    wasteland: {
        id: 'wasteland',
        name: 'The Scorched Expanse',
        type: 'danger',
        description: 'An endless desert of ash and bone. Nothing lives here that doesn\'t kill.',
        welcomeMessages: [
            "You venture into The Scorched Expanse. The horizon shimmers with heat.",
            "Ash crunches beneath your feet. The wasteland offers nothing but death.",
            "The sun beats down mercilessly. This is the end of all roads.",
            "You cross into the Expanse. Survival here is measured in hours.",
        ],
        ambientMessages: [
            "The wind howls, carrying stinging ash.",
            "You spot tracks in the dust... something large.",
            "A dust devil spirals in the distance, carrying debris.",
        ],
        exploreChance: 0.65,
        enemyTypes: ['proto_construct', 'raider', 'corrupted_sentinel'],
    },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getZone(zoneId: ZoneId): ZoneDefinition {
    return ZONES[zoneId];
}

export function getRandomZone(type?: ZoneType): ZoneDefinition {
    const zoneList = Object.values(ZONES).filter(
        z => type === undefined || z.type === type
    );
    return zoneList[Math.floor(Math.random() * zoneList.length)];
}

export function getRandomWelcome(zone: ZoneDefinition): string {
    return zone.welcomeMessages[Math.floor(Math.random() * zone.welcomeMessages.length)];
}

export function getRandomAmbient(zone: ZoneDefinition): string {
    return zone.ambientMessages[Math.floor(Math.random() * zone.ambientMessages.length)];
}

export const SAFE_ZONES: ZoneId[] = ['village', 'town', 'city', 'campfire'];
export const DANGER_ZONES: ZoneId[] = ['catacomb', 'forest', 'mountain', 'ruins', 'wasteland'];

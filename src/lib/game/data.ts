import { EnemyIntent } from './types';

// ============================================
// ITEM DEFINITIONS
// ============================================

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ItemType = 'weapon' | 'armor' | 'consumable' | 'material' | 'key' | 'misc';
export type EquipSlot = 'main_hand' | 'off_hand' | 'head' | 'body' | 'legs' | 'accessory';

export interface ItemDefinition {
    id: string;
    name: string;
    description: string;
    type: ItemType;
    rarity: ItemRarity;
    stackable: boolean;
    maxStack: number;
    equipSlot?: EquipSlot;
    stats?: {
        attackPower?: number;
        defense?: number;
        hpBonus?: number;
        mpBonus?: number;
    };
    useEffect?: {
        type: 'heal' | 'restore_ap' | 'buff' | 'damage';
        value: number;
    };
    value: number; // Base sell/buy value
}

// Item Database
export const ITEMS: Record<string, ItemDefinition> = {
    // Weapons
    rusted_sword: {
        id: 'rusted_sword',
        name: 'Rusted Sword',
        description: 'Old but sharp enough to cut.',
        type: 'weapon',
        rarity: 'common',
        stackable: false,
        maxStack: 1,
        equipSlot: 'main_hand',
        stats: { attackPower: 5 },
        value: 10,
    },
    iron_blade: {
        id: 'iron_blade',
        name: 'Iron Blade',
        description: 'A reliable weapon forged from quality iron.',
        type: 'weapon',
        rarity: 'uncommon',
        stackable: false,
        maxStack: 1,
        equipSlot: 'main_hand',
        stats: { attackPower: 12 },
        value: 50,
    },
    plasma_cutter: {
        id: 'plasma_cutter',
        name: 'Plasma Cutter',
        description: 'High-tech weapon that sears through armor.',
        type: 'weapon',
        rarity: 'rare',
        stackable: false,
        maxStack: 1,
        equipSlot: 'main_hand',
        stats: { attackPower: 25 },
        value: 200,
    },

    // Armor
    leather_vest: {
        id: 'leather_vest',
        name: 'Leather Vest',
        description: 'Basic protection against the elements.',
        type: 'armor',
        rarity: 'common',
        stackable: false,
        maxStack: 1,
        equipSlot: 'body',
        stats: { defense: 3 },
        value: 15,
    },
    scrap_helmet: {
        id: 'scrap_helmet',
        name: 'Scrap Helmet',
        description: 'Cobbled together from salvage. Better than nothing.',
        type: 'armor',
        rarity: 'common',
        stackable: false,
        maxStack: 1,
        equipSlot: 'head',
        stats: { defense: 2, hpBonus: 10 },
        value: 20,
    },

    // Consumables
    health_stim: {
        id: 'health_stim',
        name: 'Health Stim',
        description: 'Injects regenerative compounds. Restores 30 HP.',
        type: 'consumable',
        rarity: 'common',
        stackable: true,
        maxStack: 10,
        useEffect: { type: 'heal', value: 30 },
        value: 25,
    },
    adrenaline_shot: {
        id: 'adrenaline_shot',
        name: 'Adrenaline Shot',
        description: 'A burst of combat readiness. Restores 2 AP immediately.',
        type: 'consumable',
        rarity: 'uncommon',
        stackable: true,
        maxStack: 5,
        useEffect: { type: 'restore_ap', value: 2 },
        value: 50,
    },
    ration_pack: {
        id: 'ration_pack',
        name: 'Ration Pack',
        description: 'Preserved food. Restores 15 HP.',
        type: 'consumable',
        rarity: 'common',
        stackable: true,
        maxStack: 20,
        useEffect: { type: 'heal', value: 15 },
        value: 10,
    },

    // Materials
    scrap_metal: {
        id: 'scrap_metal',
        name: 'Scrap Metal',
        description: 'Salvaged metal. Useful for crafting.',
        type: 'material',
        rarity: 'common',
        stackable: true,
        maxStack: 99,
        value: 5,
    },
    circuit_board: {
        id: 'circuit_board',
        name: 'Circuit Board',
        description: 'Salvaged electronics. High demand.',
        type: 'material',
        rarity: 'uncommon',
        stackable: true,
        maxStack: 50,
        value: 15,
    },
    power_cell: {
        id: 'power_cell',
        name: 'Power Cell',
        description: 'Compact energy storage. Powers advanced tech.',
        type: 'material',
        rarity: 'rare',
        stackable: true,
        maxStack: 20,
        value: 75,
    },

    // Key Items
    sector_keycard: {
        id: 'sector_keycard',
        name: 'Sector Keycard',
        description: 'Grants access to restricted areas.',
        type: 'key',
        rarity: 'rare',
        stackable: false,
        maxStack: 1,
        value: 0,
    },
};

// ============================================
// ENEMY DEFINITIONS
// ============================================

export interface EnemyDefinition {
    id: string;
    name: string;
    description: string;
    hp: number;
    damage: { min: number; max: number };
    defense: number;
    xpReward: number;
    lootTable: { itemId: string; chance: number }[];
    intents: EnemyIntent[];
}

export const ENEMIES: Record<string, EnemyDefinition> = {
    scavenger_drone: {
        id: 'scavenger_drone',
        name: 'Scavenger Drone',
        description: 'A small autonomous collector, repurposed for violence.',
        hp: 20,
        damage: { min: 5, max: 8 },
        defense: 0,
        xpReward: 10,
        lootTable: [
            { itemId: 'scrap_metal', chance: 0.6 },
            { itemId: 'circuit_board', chance: 0.2 },
        ],
        intents: ['attack', 'attack', 'wait'],
    },
    feral_hound: {
        id: 'feral_hound',
        name: 'Feral Hound',
        description: 'Once a companion. Now a predator.',
        hp: 35,
        damage: { min: 8, max: 12 },
        defense: 2,
        xpReward: 20,
        lootTable: [
            { itemId: 'ration_pack', chance: 0.3 },
        ],
        intents: ['attack', 'attack', 'charge'],
    },
    corrupted_sentinel: {
        id: 'corrupted_sentinel',
        name: 'Corrupted Sentinel',
        description: 'Security robot infected with rogue code.',
        hp: 60,
        damage: { min: 10, max: 18 },
        defense: 5,
        xpReward: 50,
        lootTable: [
            { itemId: 'circuit_board', chance: 0.5 },
            { itemId: 'power_cell', chance: 0.15 },
            { itemId: 'iron_blade', chance: 0.05 },
        ],
        intents: ['defend', 'attack', 'attack', 'charge'],
    },
    raider: {
        id: 'raider',
        name: 'Wasteland Raider',
        description: 'Desperate survivor turned bandit.',
        hp: 45,
        damage: { min: 8, max: 15 },
        defense: 3,
        xpReward: 35,
        lootTable: [
            { itemId: 'health_stim', chance: 0.25 },
            { itemId: 'ration_pack', chance: 0.4 },
            { itemId: 'scrap_metal', chance: 0.5 },
        ],
        intents: ['attack', 'defend', 'attack'],
    },
    proto_construct: {
        id: 'proto_construct',
        name: 'Proto-Construct',
        description: 'Experimental war machine. Extremely dangerous.',
        hp: 100,
        damage: { min: 15, max: 25 },
        defense: 8,
        xpReward: 100,
        lootTable: [
            { itemId: 'power_cell', chance: 0.4 },
            { itemId: 'plasma_cutter', chance: 0.1 },
        ],
        intents: ['charge', 'attack', 'attack', 'defend'],
    },
};

// ============================================
// NPC DEFINITIONS
// ============================================

export type NPCType = 'merchant' | 'quest_giver' | 'lore' | 'trainer';

export interface NPCDialogue {
    id: string;
    text: string;
    responses?: { text: string; nextDialogueId?: string; action?: string }[];
}

export interface NPCDefinition {
    id: string;
    name: string;
    type: NPCType;
    description: string;
    dialogues: NPCDialogue[];
    inventory?: string[]; // For merchants - item IDs they sell
}

export const NPCS: Record<string, NPCDefinition> = {
    merchant_vera: {
        id: 'merchant_vera',
        name: 'Vera',
        type: 'merchant',
        description: 'A weathered trader with keen eyes and a sharper tongue.',
        dialogues: [
            {
                id: 'greeting',
                text: "Well now, another survivor crawls out of the dust. Looking to trade, or just to bleed on my floor?",
                responses: [
                    { text: "Show me what you've got.", action: 'open_shop' },
                    { text: "Just passing through.", nextDialogueId: 'farewell' },
                    { text: "Any news from the wastes?", nextDialogueId: 'rumors' },
                ],
            },
            {
                id: 'rumors',
                text: "Heard the old refinery's crawling with constructs again. Military-grade, they say. Someone's activating the old security systems.",
                responses: [
                    { text: "Interesting. Let me see your wares.", action: 'open_shop' },
                    { text: "Thanks for the tip.", nextDialogueId: 'farewell' },
                ],
            },
            {
                id: 'farewell',
                text: "Watch yourself out there. Dead customers don't pay.",
            },
        ],
        inventory: ['health_stim', 'adrenaline_shot', 'ration_pack', 'leather_vest', 'iron_blade'],
    },
    old_chen: {
        id: 'old_chen',
        name: 'Old Chen',
        type: 'lore',
        description: 'An elderly man who remembers the world before the collapse.',
        dialogues: [
            {
                id: 'greeting',
                text: "Ah, a visitor. Rare these days. Sit, if you have time. The young never do.",
                responses: [
                    { text: "Tell me about this place.", nextDialogueId: 'history' },
                    { text: "What happened here?", nextDialogueId: 'collapse' },
                    { text: "I should go.", nextDialogueId: 'farewell' },
                ],
            },
            {
                id: 'history',
                text: "This was Sector 7. Industrial heart of the old city. The factories never slept. Neither did we. Now look at it. Rust and silence.",
                responses: [
                    { text: "What happened?", nextDialogueId: 'collapse' },
                    { text: "Thank you for sharing.", nextDialogueId: 'farewell' },
                ],
            },
            {
                id: 'collapse',
                text: "The Cascade, they called it. Started in the central grid. Machines turning on their masters. By the time we understood, it was too late. Now we survive in the bones of our own creation.",
                responses: [
                    { text: "Is there any hope?", nextDialogueId: 'hope' },
                    { text: "I'll find a way to fix this.", nextDialogueId: 'farewell' },
                ],
            },
            {
                id: 'hope',
                text: "Hope? Perhaps. There are whispers of a central node. The source. Shut it down, and maybe... but no one who's gone looking has returned.",
            },
            {
                id: 'farewell',
                text: "Go carefully, young one. The machines remember.",
            },
        ],
    },
    trainer_kira: {
        id: 'trainer_kira',
        name: 'Kira',
        type: 'trainer',
        description: 'A battle-hardened warrior who trains survivors.',
        dialogues: [
            {
                id: 'greeting',
                text: "You move like prey. Let me guess—you want to stop being hunted?",
                responses: [
                    { text: "Train me.", action: 'open_training' },
                    { text: "I can handle myself.", nextDialogueId: 'skeptic' },
                    { text: "Maybe later.", nextDialogueId: 'farewell' },
                ],
            },
            {
                id: 'skeptic',
                text: "Sure you can. Until you meet something faster. Stronger. Smarter. Come back when you're tired of almost dying.",
            },
            {
                id: 'farewell',
                text: "Don't die out there. Corpses don't pay tuition.",
            },
        ],
    },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getRandomEnemy(): EnemyDefinition {
    const enemyIds = Object.keys(ENEMIES);
    const randomId = enemyIds[Math.floor(Math.random() * enemyIds.length)];
    return ENEMIES[randomId];
}

export function getRandomLoot(enemy: EnemyDefinition): ItemDefinition[] {
    const loot: ItemDefinition[] = [];
    for (const drop of enemy.lootTable) {
        if (Math.random() < drop.chance) {
            const item = ITEMS[drop.itemId];
            if (item) loot.push(item);
        }
    }
    return loot;
}

export function getItem(itemId: string): ItemDefinition | undefined {
    return ITEMS[itemId];
}

export function getEnemy(enemyId: string): EnemyDefinition | undefined {
    return ENEMIES[enemyId];
}

export function getNPC(npcId: string): NPCDefinition | undefined {
    return NPCS[npcId];
}

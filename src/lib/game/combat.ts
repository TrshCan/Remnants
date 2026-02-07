import {
    CombatState,
    PlayerAction,
    Enemy,
    GameEvent,
    ACTION_COSTS
} from './types';
import { applyAPCost, applyWait, getAPState, getAPNarrative, APData } from './ap';
import {
    getAttackNarrative,
    getRandomMessage,
    DEFEND_MESSAGES,
    WAIT_MESSAGES,
    getEnemyAttackNarrative
} from './narratives';
import { EXPLORE_MESSAGES, MONSTER_NAMES } from './explore_narratives';
import { getRandomEnemy, ENEMIES } from './data';
import { getRandomZone, getRandomWelcome, ZoneDefinition, DANGER_ZONES, SAFE_ZONES } from './zones';

// Player data required for combat (works with db records)
export interface PlayerData extends APData {
    id: string;
    name: string;
    hp: number;
    hp_max: number;
    mp: number;
    mp_max: number;
    status: string;
}

/**
 * Create initial combat state for an instance.
 */
export function createCombatState(
    playerIds: string[],
    enemies: Enemy[]
): CombatState {
    const turnOrder = [...playerIds, ...enemies.map(e => e.id)];

    return {
        phase: 'PLAYER_TURN',
        turn_order: turnOrder,
        current_turn_index: 0,
        enemies,
        round: 1,
    };
}

/**
 * Resolve a player action and return new state + events.
 * Pure function - no side effects.
 */
export function resolveAction(
    action: PlayerAction,
    player: PlayerData,
    combatState: CombatState
): {
    newPlayer: PlayerData;
    newCombatState: CombatState;
    events: Omit<GameEvent, 'id' | 'created_at'>[];
} {
    switch (action.type) {
        case 'attack':
            return resolveAttack(action, player, combatState);

        case 'defend':
            return resolveDefend(action, player, combatState);

        case 'wait':
            return resolveWait(action, player, combatState);

        case 'look':
            return resolveLook(action, player, combatState);

        case 'status':
            return resolveStatus(action, player, combatState);

        case 'explore':
            return resolveExplore(action, player, combatState);

        case 'inventory':
        case 'use':
        case 'talk':
            // These are handled client-side or via separate API
            return {
                newPlayer: player,
                newCombatState: combatState,
                events: [{
                    instance_id: action.instance_id,
                    player_id: action.player_id,
                    message: action.type === 'inventory' ? 'You check your belongings.' :
                        action.type === 'use' ? 'You rummage through your pack...' :
                            'You look around for someone to talk to.',
                    event_type: 'narrative' as const,
                }]
            };
    }
}

/**
 * Resolve enemy turn.
 * Iterates through enemies and executes their actions.
 */
export function resolveEnemyTurn(
    player: PlayerData,
    combatState: CombatState
): {
    newPlayer: PlayerData;
    newCombatState: CombatState;
    events: Omit<GameEvent, 'id' | 'created_at'>[];
} {
    let currentPlayer = { ...player };
    let currentCombatState = { ...combatState };
    const events: Omit<GameEvent, 'id' | 'created_at'>[] = [];

    // Process all enemies effectively in one go for now
    // In a real system, you might want step-by-step turns

    // Filter for enemies whose turn it is
    // For simplicity in this demo, all enemies act on the enemy phase

    for (const enemy of currentCombatState.enemies) {
        // Simple AI: Randomly attack or defend
        // For now, mostly attack
        const action = Math.random() > 0.2 ? 'attack' : 'wait';

        if (action === 'attack') {
            // Enemy attacks player
            const damage = 10 + Math.floor(Math.random() * 5); // Simple damage for now
            const newHP = Math.max(0, currentPlayer.hp - damage);

            events.push({
                instance_id: 'n/a', // Context handled by caller usually, but we need it here. fixme
                player_id: null,
                message: getEnemyAttackNarrative(enemy.name, damage, currentPlayer.hp_max) + ` (${damage} dmg)`,
                event_type: 'enemy_action'
            });

            currentPlayer.hp = newHP;

            if (currentPlayer.hp <= 0) {
                currentPlayer.status = 'dead';
                events.push({
                    instance_id: 'n/a',
                    player_id: currentPlayer.id,
                    message: 'You have been defeated.',
                    event_type: 'system'
                });
                currentCombatState.phase = 'COMPLETE';
                break;
            }
        } else {
            events.push({
                instance_id: 'n/a',
                player_id: null,
                message: `${enemy.name} hesitates, watching you closely.`,
                event_type: 'enemy_action'
            });
        }
    }

    if (currentPlayer.status !== 'dead') {
        currentCombatState.phase = 'PLAYER_TURN';
        currentCombatState.current_turn_index = 0; // Reset to player
        currentCombatState.round++;
    }

    return {
        newPlayer: currentPlayer,
        newCombatState: currentCombatState,
        events
    };
}

function resolveAttack(
    action: PlayerAction,
    player: PlayerData,
    combatState: CombatState
): ReturnType<typeof resolveAction> {
    const events: Omit<GameEvent, 'id' | 'created_at'>[] = [];
    const cost = ACTION_COSTS.attack;

    const { player: updatedPlayer, narrative } = applyAPCost(player, cost);

    if (narrative) {
        events.push({
            instance_id: action.instance_id,
            player_id: action.player_id,
            message: narrative,
            event_type: 'combat',
        });
    }

    // Find target
    const targetId = action.target_id || combatState.enemies[0]?.id;
    const targetIndex = combatState.enemies.findIndex(e => e.id === targetId);

    if (targetIndex === -1) {
        events.push({
            instance_id: action.instance_id,
            player_id: action.player_id,
            message: 'You strike at nothing. The enemy is gone.',
            event_type: 'combat',
        });
        return { newPlayer: updatedPlayer, newCombatState: combatState, events };
    }

    const target = combatState.enemies[targetIndex];
    const damage = calculateDamage(player, target);
    const newHP = Math.max(0, target.hp - damage);

    events.push({
        instance_id: action.instance_id,
        player_id: action.player_id,
        message: getAttackNarrative(damage, target.hp_max) + ` (${damage} dmg)`,
        event_type: 'combat',
    });

    if (newHP <= 0) {
        events.push({
            instance_id: action.instance_id,
            player_id: null,
            message: `${target.name} collapses, defeated.`,
            event_type: 'combat',
        });
    }

    // Update combat state
    const newEnemies = [...combatState.enemies];
    newEnemies[targetIndex] = { ...target, hp: newHP };

    const newCombatState = advanceTurn({
        ...combatState,
        enemies: newEnemies.filter(e => e.hp > 0),
    });

    return { newPlayer: updatedPlayer, newCombatState, events };
}

function resolveDefend(
    action: PlayerAction,
    player: PlayerData,
    combatState: CombatState
): ReturnType<typeof resolveAction> {
    const events: Omit<GameEvent, 'id' | 'created_at'>[] = [];
    const cost = ACTION_COSTS.defend;

    const { player: updatedPlayer, narrative } = applyAPCost(player, cost);

    if (narrative) {
        events.push({
            instance_id: action.instance_id,
            player_id: action.player_id,
            message: narrative,
            event_type: 'combat',
        });
    }

    events.push({
        instance_id: action.instance_id,
        player_id: action.player_id,
        message: getRandomMessage(DEFEND_MESSAGES),
        event_type: 'combat',
    });

    const newCombatState = advanceTurn(combatState);

    return { newPlayer: updatedPlayer, newCombatState, events };
}

function resolveWait(
    action: PlayerAction,
    player: PlayerData,
    combatState: CombatState
): ReturnType<typeof resolveAction> {
    const events: Omit<GameEvent, 'id' | 'created_at'>[] = [];

    const { player: updatedPlayer, narrative } = applyWait(player);

    events.push({
        instance_id: action.instance_id,
        player_id: action.player_id,
        message: getRandomMessage(WAIT_MESSAGES), // Override default narrative with variety
        event_type: 'combat',
    });

    const apState = getAPState(updatedPlayer);
    events.push({
        instance_id: action.instance_id,
        player_id: action.player_id,
        message: getAPNarrative(apState),
        event_type: 'narrative',
    });

    const newCombatState = advanceTurn(combatState);

    return { newPlayer: updatedPlayer, newCombatState, events };
}

function resolveLook(
    action: PlayerAction,
    player: PlayerData,
    combatState: CombatState
): ReturnType<typeof resolveAction> {
    const events: Omit<GameEvent, 'id' | 'created_at'>[] = [];

    if (combatState.enemies.length === 0) {
        events.push({
            instance_id: action.instance_id,
            player_id: action.player_id,
            message: 'The area is quiet. Nothing stirs.',
            event_type: 'narrative',
        });
    } else {
        for (const enemy of combatState.enemies) {
            const healthDesc = getHealthDescription(enemy.hp, enemy.hp_max);
            events.push({
                instance_id: action.instance_id,
                player_id: action.player_id,
                message: `${enemy.name} — ${healthDesc}. Intent: ${enemy.intent}.`,
                event_type: 'narrative',
            });
        }
    }

    return { newPlayer: player, newCombatState: combatState, events };
}

function resolveStatus(
    action: PlayerAction,
    player: PlayerData,
    combatState: CombatState
): ReturnType<typeof resolveAction> {
    const events: Omit<GameEvent, 'id' | 'created_at'>[] = [];
    const apState = getAPState(player);
    const healthDesc = getHealthDescription(player.hp, player.hp_max);

    const statusMessage = [
        `HP: ${player.hp}/${player.hp_max} — ${healthDesc}`,
        `AP: ${Math.floor(player.ap_current)}/${player.ap_max} — ${getAPNarrative(apState)}`
    ];

    if (player.ap_debt > 0) {
        statusMessage.push(`Strain: ${player.ap_debt.toFixed(1)} — recovery slowed.`);
    }

    events.push({
        instance_id: action.instance_id,
        player_id: action.player_id,
        message: statusMessage.join('\n'),
        event_type: 'system',
    });

    return { newPlayer: player, newCombatState: combatState, events };
}

function resolveExplore(
    action: PlayerAction,
    player: PlayerData,
    combatState: CombatState
): ReturnType<typeof resolveAction> {
    const events: Omit<GameEvent, 'id' | 'created_at'>[] = [];
    const cost = ACTION_COSTS.explore;

    // Check if already in combat
    if (combatState.enemies.length > 0) {
        return {
            newPlayer: player,
            newCombatState: combatState,
            events: [{
                instance_id: action.instance_id,
                player_id: action.player_id,
                message: "You cannot explore while in combat!",
                event_type: 'system'
            }]
        };
    }

    const { player: updatedPlayer, narrative } = applyAPCost(player, cost);

    if (narrative) {
        events.push({
            instance_id: action.instance_id,
            player_id: action.player_id,
            message: narrative,
            event_type: 'combat',
        });
    }

    // Roll for outcome - first check for zone transition
    const roll = Math.random();
    let newCombatState = { ...combatState };

    // Outcome probabilities:
    // 0.0 - 0.25: Zone transition (25%)
    // 0.25 - 0.45: Nothing (20%)
    // 0.45 - 0.60: Item (15%)
    // 0.60 - 0.70: Trap (10%)
    // 0.70 - 0.90: Encounter (20%)
    // 0.90 - 1.0: Ambush (10%)

    if (roll < 0.25) {
        // Zone transition
        const newZone = getRandomZone();
        const welcomeMsg = getRandomWelcome(newZone);

        events.push({
            instance_id: action.instance_id,
            player_id: action.player_id,
            message: `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n  📍 ${newZone.name.toUpperCase()}\n  ${newZone.type === 'safe' ? '🛡️ Safe Zone' : '⚠️ Danger Zone'}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            event_type: 'system',
        });
        events.push({
            instance_id: action.instance_id,
            player_id: action.player_id,
            message: welcomeMsg,
            event_type: 'narrative',
        });
        events.push({
            instance_id: action.instance_id,
            player_id: action.player_id,
            message: newZone.description,
            event_type: 'narrative',
        });

        // Update combat state with new zone
        newCombatState = {
            ...combatState,
            currentZone: newZone.id,
        };

    } else if (roll < 0.45) {
        // Nothing
        events.push({
            instance_id: action.instance_id,
            player_id: action.player_id,
            message: getRandomMessage(EXPLORE_MESSAGES.nothing),
            event_type: 'narrative',
        });

    } else if (roll < 0.60) {
        // Item (Flavor only for now)
        events.push({
            instance_id: action.instance_id,
            player_id: action.player_id,
            message: getRandomMessage(EXPLORE_MESSAGES.item),
            event_type: 'narrative',
        });
        // TODO: Give actual item

    } else if (roll < 0.70) {
        // Trap
        const damage = 5 + Math.floor(Math.random() * 5);
        updatedPlayer.hp = Math.max(0, updatedPlayer.hp - damage);

        events.push({
            instance_id: action.instance_id,
            player_id: action.player_id,
            message: getRandomMessage(EXPLORE_MESSAGES.trap),
            event_type: 'combat',
        });
        events.push({
            instance_id: action.instance_id,
            player_id: action.player_id,
            message: `You take ${damage} damage from the trap.`,
            event_type: 'combat',
        });

    } else {
        // Encounter or Ambush
        const isAmbush = roll >= 0.90;
        const enemyCount = 1 + Math.floor(Math.random() * 2); // 1-2 enemies
        const enemies: Enemy[] = [];

        for (let i = 0; i < enemyCount; i++) {
            const enemyDef = getRandomEnemy();
            enemies.push({
                id: `enemy_${Date.now()}_${i}`,
                name: enemyDef.name,
                hp: enemyDef.hp,
                hp_max: enemyDef.hp,
                ap: 10,
                intent: enemyDef.intents[Math.floor(Math.random() * enemyDef.intents.length)]
            });
        }

        const msgKey = isAmbush ? 'ambush' : 'encounter';
        events.push({
            instance_id: action.instance_id,
            player_id: action.player_id,
            message: getRandomMessage(EXPLORE_MESSAGES[msgKey]),
            event_type: 'combat',
        });

        // Start combat
        const playerIds = [player.id]; // In fully multi-player, we'd need to fetch others
        newCombatState = createCombatState(playerIds, enemies);

        if (isAmbush) {
            newCombatState.phase = 'ENEMY_TURN';
            events.push({
                instance_id: action.instance_id,
                player_id: null,
                message: "Ambush! The enemy strikes first!",
                event_type: 'combat'
            });
        }
    }

    return { newPlayer: updatedPlayer, newCombatState: newCombatState, events };
}

// Helper functions
function calculateDamage(_player: PlayerData, _enemy: Enemy): number {
    // Simple damage calculation - can be expanded
    const baseDamage = 10;
    return baseDamage;
}

function advanceTurn(combatState: CombatState): CombatState {
    const nextIndex = (combatState.current_turn_index + 1) % combatState.turn_order.length;
    const newRound = nextIndex === 0 ? combatState.round + 1 : combatState.round;

    // Check if combat is complete
    if (combatState.enemies.length === 0) {
        return {
            ...combatState,
            phase: 'COMPLETE',
        };
    }

    // Determine next phase based on whose turn it is
    const nextTurnId = combatState.turn_order[nextIndex];
    const isEnemyTurn = combatState.enemies.some(e => e.id === nextTurnId);

    return {
        ...combatState,
        current_turn_index: nextIndex,
        round: newRound,
        phase: isEnemyTurn ? 'ENEMY_TURN' : 'PLAYER_TURN',
    };
}

function getHealthDescription(current: number, max: number): string {
    const ratio = current / max;
    if (ratio >= 0.9) return 'unscathed';
    if (ratio >= 0.7) return 'lightly wounded';
    if (ratio >= 0.4) return 'bloodied';
    if (ratio >= 0.2) return 'grievously wounded';
    if (ratio > 0) return 'near death';
    return 'dead';
}

/**
 * Check if combat is complete.
 */
export function isCombatComplete(state: CombatState): boolean {
    return state.phase === 'COMPLETE';
}

/**
 * Check if it's a player's turn.
 */
export function isPlayerTurn(
    state: CombatState,
    playerId: string
): boolean {
    if (state.phase !== 'PLAYER_TURN') return false;
    return state.turn_order[state.current_turn_index] === playerId;
}

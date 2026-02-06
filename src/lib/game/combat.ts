import {
    CombatState,
    PlayerAction,
    Enemy,
    GameEvent,
    ACTION_COSTS
} from './types';
import { applyAPCost, applyWait, getAPState, getAPNarrative, APData } from './ap';

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
    }
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
        message: `You strike ${target.name} for ${damage} damage.`,
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
        message: 'You raise your guard, bracing for impact.',
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
        message: narrative,
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

    events.push({
        instance_id: action.instance_id,
        player_id: action.player_id,
        message: `HP: ${player.hp}/${player.hp_max} — ${healthDesc}`,
        event_type: 'system',
    });

    events.push({
        instance_id: action.instance_id,
        player_id: action.player_id,
        message: `AP: ${Math.floor(player.ap_current)}/${player.ap_max} — ${getAPNarrative(apState)}`,
        event_type: 'system',
    });

    if (player.ap_debt > 0) {
        events.push({
            instance_id: action.instance_id,
            player_id: action.player_id,
            message: `Strain: ${player.ap_debt.toFixed(1)} — recovery slowed.`,
            event_type: 'system',
        });
    }

    return { newPlayer: player, newCombatState: combatState, events };
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

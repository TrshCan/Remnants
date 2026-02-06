// Player state
export interface Player {
    id: string;
    name: string;
    hp: number;
    hp_max: number;
    mp: number;
    mp_max: number;
    ap_current: number;
    ap_max: number;
    ap_debt: number;
    ap_last_update: Date;
    last_action_at: Date;
    status: PlayerStatus;
    created_at: Date;
}

export type PlayerStatus =
    | 'alive'
    | 'dead'
    | 'resting'
    | 'in_combat'
    | 'ALIVE'
    | 'DEAD'
    | 'RESTING'
    | 'IN_COMBAT';

// Helper to normalize status for display
export function normalizeStatus(status: string): 'alive' | 'dead' | 'resting' | 'in_combat' {
    const lower = status.toLowerCase();
    if (lower === 'in_combat') return 'in_combat';
    return lower as 'alive' | 'dead' | 'resting';
}

// AP descriptive states (derived from numeric values)
export type APState =
    | 'exhausted'    // ap_current <= 0 or high debt
    | 'winded'       // ap_current == 1
    | 'recovering'   // has debt, regenerating
    | 'ready'        // full or near-full AP
    | 'overextended'; // went negative

// Instance (zone)
export interface Instance {
    id: string;
    zone_type: string;
    combat_state: CombatState;
    created_at: Date;
}

// Combat state machine states
export type CombatPhase =
    | 'IDLE'
    | 'PLAYER_TURN'
    | 'ENEMY_TURN'
    | 'RESOLVING'
    | 'COMPLETE';

export interface CombatState {
    phase: CombatPhase;
    turn_order: string[];
    current_turn_index: number;
    enemies: Enemy[];
    round: number;
}

export interface Enemy {
    id: string;
    name: string;
    hp: number;
    hp_max: number;
    ap: number;
    intent: EnemyIntent;
}

export type EnemyIntent =
    | 'attack'
    | 'defend'
    | 'charge'
    | 'wait';

// Player actions
export type ActionType =
    | 'attack'
    | 'defend'
    | 'wait'
    | 'look'
    | 'status'
    | 'explore'
    | 'inventory'
    | 'use'
    | 'talk';

export interface PlayerAction {
    type: ActionType;
    target_id?: string;
    player_id: string;
    instance_id: string;
}

// Action costs
export const ACTION_COSTS: Record<ActionType, number> = {
    attack: 2,
    defend: 1,
    wait: 0,   // WAIT costs nothing, gives AP back
    look: 0,
    status: 0,
    explore: 3,
    inventory: 0,
    use: 0,
    talk: 0,
};

// Game events (for SSE and DB persistence)
export interface GameEvent {
    id: string;
    instance_id: string;
    player_id: string | null;
    message: string;
    event_type: EventType;
    created_at: Date;
}

export type EventType =
    | 'combat'
    | 'narrative'
    | 'system'
    | 'player_action'
    | 'enemy_action';

// API response types
export interface ActionResponse {
    success: boolean;
    events: GameEvent[];
    player_state: PlayerStateSnapshot;
    combat_state?: CombatState;
    error?: string;
}

export interface PlayerStateSnapshot {
    hp: number;
    hp_max: number;
    mp: number;
    mp_max: number;
    ap: number;
    ap_max: number;
    ap_state: APState;
    status: PlayerStatus;
}

// SSE event format
export interface SSEMessage {
    event_id: string;
    data: GameEvent;
}

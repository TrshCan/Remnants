import { APState } from './types';

// Type for AP-related functions (works with db records)
export type APData = {
    ap_current: number;
    ap_max: number;
    ap_debt: number;
    ap_last_update: Date;
};

// Configuration
const AP_REGEN_RATE = 1; // AP per second
const WAIT_AP_BONUS = 1; // Extra AP gained from WAIT
const DEBT_REDUCTION_ON_WAIT = 0.5; // Debt reduced per WAIT

/**
 * Calculate current AP based on timestamp.
 * AP regenerates over time from ap_last_update.
 */
export function calculateCurrentAP(
    lastAP: number,
    lastUpdate: Date,
    maxAP: number,
    debt: number = 0,
    regenRate: number = AP_REGEN_RATE
): number {
    const now = Date.now();
    const elapsed = (now - lastUpdate.getTime()) / 1000;

    // Debt slows regeneration
    const effectiveRegen = debt > 0 ? regenRate * 0.5 : regenRate;
    const regenerated = elapsed * effectiveRegen;

    const rawAP = lastAP + regenerated;
    return Math.min(Math.max(rawAP, 0), maxAP);
}

/**
 * Apply AP cost for an action.
 * Returns updated AP data and whether action was allowed.
 */
export function applyAPCost<T extends APData>(
    player: T,
    cost: number
): { player: T; allowed: boolean; narrative: string } {
    const currentAP = calculateCurrentAP(
        player.ap_current,
        player.ap_last_update,
        player.ap_max,
        player.ap_debt
    );

    const newAP = currentAP - cost;
    const now = new Date();

    // Over-commitment: allowed but creates debt
    if (newAP < 0) {
        const additionalDebt = Math.abs(newAP);
        return {
            player: {
                ...player,
                ap_current: 0,
                ap_debt: player.ap_debt + additionalDebt,
                ap_last_update: now,
            },
            allowed: true,
            narrative: getOvercommitNarrative(additionalDebt),
        };
    }

    return {
        player: {
            ...player,
            ap_current: newAP,
            ap_last_update: now,
        },
        allowed: true,
        narrative: '',
    };
}

/**
 * Apply WAIT action - strategic recovery.
 * Regenerates AP and reduces debt.
 */
export function applyWait<T extends APData>(player: T): {
    player: T;
    narrative: string;
    ap_gained: number;
} {
    const currentAP = calculateCurrentAP(
        player.ap_current,
        player.ap_last_update,
        player.ap_max,
        player.ap_debt
    );

    const now = new Date();
    const newDebt = Math.max(0, player.ap_debt - DEBT_REDUCTION_ON_WAIT);
    const newAP = Math.min(currentAP + WAIT_AP_BONUS, player.ap_max);
    const ap_gained = newAP - currentAP;

    return {
        player: {
            ...player,
            ap_current: newAP,
            ap_debt: newDebt,
            ap_last_update: now,
        },
        narrative: getWaitNarrative(player.ap_debt, newDebt, ap_gained),
        ap_gained,
    };
}

/**
 * Get descriptive AP state from numeric values.
 * Works with any object containing AP fields.
 */
export function getAPState(data: APData): APState {
    const currentAP = calculateCurrentAP(
        data.ap_current,
        data.ap_last_update,
        data.ap_max,
        data.ap_debt
    );

    if (data.ap_debt > data.ap_max * 0.5) {
        return 'overextended';
    }
    if (currentAP <= 0) {
        return 'exhausted';
    }
    if (data.ap_debt > 0) {
        return 'recovering';
    }
    if (currentAP === 1) {
        return 'winded';
    }
    return 'ready';
}

/**
 * Get narrative description for AP state.
 */
export function getAPNarrative(state: APState): string {
    const narratives: Record<APState, string> = {
        exhausted: 'Your limbs feel like lead. Every breath is a struggle.',
        winded: 'You catch your breath, muscles burning.',
        recovering: 'Strength slowly returns, though the strain lingers.',
        ready: 'You stand poised, ready to act.',
        overextended: 'You pushed too far. Your body screams for rest.',
    };
    return narratives[state];
}

// Internal narrative helpers
function getOvercommitNarrative(debt: number): string {
    if (debt > 2) {
        return 'You push beyond your limits. Pain lances through exhausted muscles.';
    }
    if (debt > 1) {
        return 'You strain yourself, feeling the cost of over-commitment.';
    }
    return 'You push harder than you should.';
}

function getWaitNarrative(
    oldDebt: number,
    newDebt: number,
    apGained: number
): string {
    if (oldDebt > 0 && newDebt === 0) {
        return 'You steady your breathing. The strain fades. Focus returns.';
    }
    if (oldDebt > newDebt) {
        return 'You hold position, letting exhaustion slowly ebb away.';
    }
    if (apGained > 0) {
        return 'You wait, gathering your strength.';
    }
    return 'You hold, watching. Waiting.';
}

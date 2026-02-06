const RATE_LIMIT_MS = parseInt(process.env.ACTION_RATE_LIMIT_MS || '300');

export interface RateLimitResult {
    allowed: boolean;
    wait_ms?: number;
    message?: string;
}

/**
 * Check if player action is rate-limited.
 * Enforces minimum interval between actions.
 */
export function checkRateLimit(
    lastActionAt: Date | null
): RateLimitResult {
    if (!lastActionAt) {
        return { allowed: true };
    }

    const now = Date.now();
    const lastAction = lastActionAt.getTime();
    const elapsed = now - lastAction;

    if (elapsed < RATE_LIMIT_MS) {
        const wait_ms = RATE_LIMIT_MS - elapsed;
        return {
            allowed: false,
            wait_ms,
            message: 'Too fast. Steady yourself.',
        };
    }

    return { allowed: true };
}

/**
 * Get the minimum wait time in milliseconds.
 */
export function getRateLimitMs(): number {
    return RATE_LIMIT_MS;
}

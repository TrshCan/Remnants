'use client';

import { PlayerStateSnapshot, APState } from '@/lib/game';

interface StatusBarProps {
    playerState: PlayerStateSnapshot | null;
}

const AP_NARRATIVES: Record<APState, string> = {
    exhausted: 'Exhausted',
    winded: 'Winded',
    recovering: 'Recovering',
    ready: 'Ready',
    overextended: 'Overextended',
};

function getHealthClass(hp: number, maxHp: number): string {
    const ratio = hp / maxHp;
    if (ratio <= 0.25) return 'low';
    if (ratio <= 0.5) return 'mid';
    return 'high';
}

function getAPClass(ap: number, maxAP: number, state: APState): string {
    if (state === 'exhausted' || state === 'overextended') return 'low';
    if (state === 'winded' || state === 'recovering') return 'mid';
    return 'high';
}

export default function StatusBar({ playerState }: StatusBarProps) {
    if (!playerState) {
        return (
            <div className="status-bar">
                <span className="loading">Loading...</span>
            </div>
        );
    }

    const { hp, hp_max, ap, ap_max, ap_state, status } = playerState;
    const healthClass = getHealthClass(hp, hp_max);
    const apClass = getAPClass(ap, ap_max, ap_state);

    return (
        <div className="status-bar">
            <div className="stat">
                <span className="stat-label">HP</span>
                <span className={`stat-value ${healthClass}`}>
                    {hp}/{hp_max}
                </span>
            </div>
            <div className="stat">
                <span className="stat-label">AP</span>
                <span className={`stat-value ${apClass}`}>
                    {ap}/{ap_max}
                </span>
                <span className="stat-narrative">
                    {AP_NARRATIVES[ap_state]}
                </span>
            </div>
            <div className="stat">
                <span className="stat-label">MP</span>
                <span className="stat-value mid">
                    {playerState.mp}/{playerState.mp_max}
                </span>
            </div>
            {status !== 'alive' && (
                <div className="stat">
                    <span className="stat-label">Status</span>
                    <span className="stat-value low">{status}</span>
                </div>
            )}
        </div>
    );
}

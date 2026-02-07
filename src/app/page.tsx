'use client';

import { useState, useCallback, useEffect } from 'react';
import { Terminal, CombatLog, StatusBar, ActionButtons } from '@/components';
import { ActionType, PlayerStateSnapshot, AP_SHORT_NARRATIVES, CombatState } from '@/lib/game';
import { GameContext } from '@/components/ActionButtons';

// Demo instance and player IDs - in production, these come from auth/session
const DEMO_INSTANCE_ID = 'demo-instance';
const DEMO_PLAYER_ID = 'demo-player';

export default function GamePage() {
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
    const [playerState, setPlayerState] = useState<PlayerStateSnapshot | null>(null);
    const [combatState, setCombatState] = useState<CombatState | null>(null);

    // Determine game context based on combat state
    const getGameContext = (): GameContext => {
        if (!combatState) return 'idle';
        if (combatState.enemies.length > 0) return 'combat';
        return 'idle';
    };

    const handleAction = useCallback(async (action: ActionType, args?: string) => {
        const response = await fetch('/api/player', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_id: DEMO_PLAYER_ID,
                instance_id: DEMO_INSTANCE_ID,
                action: action,
                target_id: args || undefined,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Action failed');
        }

        const result = await response.json();
        if (result.player_state) {
            setPlayerState(result.player_state);
        }
        if (result.player) {
            // Handle direct player object from inventory/status commands
            setPlayerState({
                hp: result.player.hp,
                hp_max: result.player.hp_max,
                mp: result.player.mp,
                mp_max: result.player.mp_max,
                ap: result.player.ap_current,
                ap_max: result.player.ap_max,
                status: result.player.status,
                ap_state: playerState?.ap_state || 'ready',
            });
        }
        if (result.combat) {
            setCombatState(result.combat);
        }
    }, [playerState]);

    useEffect(() => {
        if (connectionStatus === 'connected') {
            fetch(`/api/player?id=${DEMO_PLAYER_ID}`)
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error('Failed to fetch player state');
                })
                .then(data => {
                    setPlayerState(data);
                    if (data.combat) {
                        setCombatState(data.combat);
                    }
                })
                .catch(console.error);
        }
    }, [connectionStatus]);

    const handleConnectionChange = useCallback((status: 'connected' | 'disconnected' | 'connecting') => {
        setConnectionStatus(status);
    }, []);

    return (
        <Terminal
            title="REMNANTS"
            connectionStatus={connectionStatus}
            statNarrative={playerState ? AP_SHORT_NARRATIVES[playerState.ap_state] : undefined}
        >
            <CombatLog
                instanceId={DEMO_INSTANCE_ID}
                onConnectionChange={handleConnectionChange}
            />
            <StatusBar playerState={playerState} />
            <ActionButtons
                gameContext={getGameContext()}
                combatPhase={combatState?.phase}
                currentAP={playerState?.ap ?? 0}
                onAction={handleAction}
            />
        </Terminal>
    );
}

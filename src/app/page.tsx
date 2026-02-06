'use client';

import { useState, useCallback, useEffect } from 'react';
import { Terminal, CombatLog, CommandInput, StatusBar } from '@/components';
import { ActionType, PlayerStateSnapshot, AP_SHORT_NARRATIVES } from '@/lib/game';

// Demo instance and player IDs - in production, these come from auth/session
const DEMO_INSTANCE_ID = 'demo-instance';
const DEMO_PLAYER_ID = 'demo-player';

export default function GamePage() {
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
    const [playerState, setPlayerState] = useState<PlayerStateSnapshot | null>(null);

    const handleCommand = useCallback(async (command: ActionType, args?: string) => {
        const response = await fetch('/api/player', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_id: DEMO_PLAYER_ID,
                instance_id: DEMO_INSTANCE_ID,
                action: command,
                target_id: args || undefined,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Action failed');
        }

        const result = await response.json();
        setPlayerState(result.player_state);
    }, []);

    useEffect(() => {
        if (connectionStatus === 'connected') {
            fetch(`/api/player?id=${DEMO_PLAYER_ID}`)
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error('Failed to fetch player state');
                })
                .then(data => setPlayerState(data))
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
            <CommandInput onCommand={handleCommand} />
        </Terminal>
    );
}

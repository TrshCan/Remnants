'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEvent } from '@/lib/game';

interface CombatLogProps {
    instanceId: string;
    onConnectionChange?: (status: 'connected' | 'disconnected' | 'connecting') => void;
}

export default function CombatLog({ instanceId, onConnectionChange }: CombatLogProps) {
    const [events, setEvents] = useState<GameEvent[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const logRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastEventIdRef = useRef<string>('');
    const reconnectAttempts = useRef(0);

    const connect = useCallback(() => {
        if (!instanceId) return;

        onConnectionChange?.('connecting');

        // Build URL with last event ID for replay
        let url = `/api/events?instance_id=${instanceId}`;
        if (lastEventIdRef.current) {
            url += `&last_event_id=${lastEventIdRef.current}`;
        }

        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            setIsConnected(true);
            onConnectionChange?.('connected');
            reconnectAttempts.current = 0;
        };

        eventSource.onmessage = (e) => {
            try {
                const event = JSON.parse(e.data) as GameEvent;
                lastEventIdRef.current = event.id;

                setEvents(prev => {
                    // Avoid duplicates
                    if (prev.some(p => p.id === event.id)) {
                        return prev;
                    }
                    return [...prev, event];
                });
            } catch (err) {
                console.error('Error parsing SSE event:', err);
            }
        };

        eventSource.onerror = () => {
            setIsConnected(false);
            onConnectionChange?.('disconnected');
            eventSource.close();

            // Exponential backoff reconnect
            const backoff = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            reconnectAttempts.current++;

            reconnectTimeoutRef.current = setTimeout(() => {
                connect();
            }, backoff);
        };
    }, [instanceId, onConnectionChange]);

    useEffect(() => {
        connect();

        return () => {
            eventSourceRef.current?.close();
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [connect]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [events]);

    return (
        <div className="combat-log" ref={logRef}>
            {events.length === 0 && (
                <div className="log-entry narrative">
                    Silence. The world waits.
                </div>
            )}
            {events.map((event) => (
                <div
                    key={event.id}
                    className={`log-entry ${event.event_type}`}
                >
                    {event.message}
                </div>
            ))}
        </div>
    );
}

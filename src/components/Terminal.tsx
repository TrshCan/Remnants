'use client';

import { ReactNode } from 'react';

interface TerminalProps {
    title?: string;
    connectionStatus?: 'connected' | 'disconnected' | 'connecting';
    statNarrative?: string;
    children: ReactNode;
}

export default function Terminal({
    title = 'REMNANTS',
    connectionStatus = 'disconnected',
    statNarrative,
    children
}: TerminalProps) {
    return (
        <div className="terminal">
            <header className="terminal-header">
                <span className="terminal-title">{title}</span>
                <div className="connection-status">
                    {statNarrative && <span className="stat-narrative">{statNarrative}</span>}
                    <span className={`connection-dot ${connectionStatus}`} />
                    <span>{connectionStatus}</span>
                </div>
            </header>
            {children}
        </div>
    );
}

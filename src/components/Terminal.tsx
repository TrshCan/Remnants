'use client';

import { ReactNode } from 'react';

interface TerminalProps {
    title?: string;
    connectionStatus?: 'connected' | 'disconnected' | 'connecting';
    children: ReactNode;
}

export default function Terminal({
    title = 'REMNANTS',
    connectionStatus = 'disconnected',
    children
}: TerminalProps) {
    return (
        <div className="terminal">
            <header className="terminal-header">
                <span className="terminal-title">{title}</span>
                <div className="connection-status">
                    <span className={`connection-dot ${connectionStatus}`} />
                    <span>{connectionStatus}</span>
                </div>
            </header>
            {children}
        </div>
    );
}

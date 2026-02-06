'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { ActionType } from '@/lib/game';

interface CommandInputProps {
    onCommand: (command: ActionType, args?: string) => Promise<void>;
    disabled?: boolean;
}

const VALID_COMMANDS: ActionType[] = ['attack', 'defend', 'wait', 'look', 'status'];
const COMMAND_HELP: Record<ActionType, string> = {
    attack: 'Strike at your enemy (costs 2 AP)',
    defend: 'Raise your guard (costs 1 AP)',
    wait: 'Rest and recover AP (strategic)',
    look: 'Observe your surroundings',
    status: 'Check your condition',
};

export default function CommandInput({ onCommand, disabled = false }: CommandInputProps) {
    const [input, setInput] = useState('');
    const [feedback, setFeedback] = useState<{ message: string; type: 'error' | 'info' } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async () => {
        const trimmed = input.trim().toLowerCase();
        if (!trimmed) return;

        setInput('');
        setFeedback(null);

        // Parse command
        const [cmd, ...args] = trimmed.split(' ');

        // Help command
        if (cmd === 'help' || cmd === '?') {
            setFeedback({
                message: VALID_COMMANDS.map(c => `${c} - ${COMMAND_HELP[c]}`).join('\n'),
                type: 'info',
            });
            return;
        }

        // Validate command
        if (!VALID_COMMANDS.includes(cmd as ActionType)) {
            setFeedback({
                message: `Unknown command: ${cmd}. Type "help" for commands.`,
                type: 'error',
            });
            return;
        }

        setIsProcessing(true);
        try {
            await onCommand(cmd as ActionType, args.join(' '));
        } catch (error) {
            setFeedback({
                message: error instanceof Error ? error.message : 'Action failed.',
                type: 'error',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !disabled && !isProcessing) {
            handleSubmit();
        }
    };

    return (
        <div>
            {feedback && (
                <div className={`feedback ${feedback.type}`}>
                    {feedback.message.split('\n').map((line, i) => (
                        <div key={i}>{line}</div>
                    ))}
                </div>
            )}
            <div className="command-input-container">
                <span className="prompt">&gt;</span>
                <input
                    ref={inputRef}
                    type="text"
                    className="command-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isProcessing ? 'processing...' : 'enter command'}
                    disabled={disabled || isProcessing}
                    autoFocus
                />
                {isProcessing && <span className="loading">...</span>}
            </div>
        </div>
    );
}

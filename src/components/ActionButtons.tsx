'use client';

import { useState } from 'react';
import { ActionType, CombatPhase, ACTION_COSTS } from '@/lib/game';

// Game context determines which buttons to show
export type GameContext = 'idle' | 'combat' | 'npc_conversation';

interface ActionButtonsProps {
    gameContext: GameContext;
    combatPhase?: CombatPhase;
    currentAP?: number;
    isNPCMerchant?: boolean;
    onAction: (action: ActionType, args?: string) => Promise<void>;
    disabled?: boolean;
}

interface ActionButton {
    action: ActionType;
    label: string;
    icon: string;
    apCost: number;
    description: string;
}

// Define all available actions with their display properties
const ACTION_BUTTONS: Record<string, ActionButton> = {
    explore: {
        action: 'explore',
        label: 'Explore',
        icon: '🧭',
        apCost: ACTION_COSTS.explore,
        description: 'Search the area for events',
    },
    inventory: {
        action: 'inventory',
        label: 'Inventory',
        icon: '🎒',
        apCost: 0,
        description: 'View your items',
    },
    look: {
        action: 'look',
        label: 'Look',
        icon: '👁️',
        apCost: 0,
        description: 'Observe your surroundings',
    },
    status: {
        action: 'status',
        label: 'Status',
        icon: '📊',
        apCost: 0,
        description: 'Check your condition',
    },
    attack: {
        action: 'attack',
        label: 'Attack',
        icon: '⚔️',
        apCost: ACTION_COSTS.attack,
        description: 'Strike at your enemy',
    },
    defend: {
        action: 'defend',
        label: 'Defend',
        icon: '🛡️',
        apCost: ACTION_COSTS.defend,
        description: 'Raise your guard',
    },
    wait: {
        action: 'wait',
        label: 'Wait',
        icon: '⏳',
        apCost: 0,
        description: 'Recover AP',
    },
    talk: {
        action: 'talk',
        label: 'Talk',
        icon: '💬',
        apCost: 0,
        description: 'Speak with NPC',
    },
};

// Define which buttons appear in each context
const CONTEXT_BUTTONS: Record<GameContext, string[]> = {
    idle: ['explore', 'inventory', 'look', 'status'],
    combat: ['attack', 'defend', 'wait', 'inventory'],
    npc_conversation: ['talk', 'inventory'],
};

export default function ActionButtons({
    gameContext,
    combatPhase,
    currentAP = 0,
    isNPCMerchant = false,
    onAction,
    disabled = false,
}: ActionButtonsProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeButton, setActiveButton] = useState<string | null>(null);

    // Get buttons for current context
    let buttonKeys = [...CONTEXT_BUTTONS[gameContext]];

    // Add merchant-specific buttons
    if (gameContext === 'npc_conversation' && isNPCMerchant) {
        buttonKeys = ['talk', 'inventory']; // Would add 'buy', 'sell' when implemented
    }

    // During enemy turn, disable combat actions
    const isCombatDisabled = combatPhase === 'ENEMY_TURN' || combatPhase === 'RESOLVING';

    const handleAction = async (action: ActionType) => {
        if (isProcessing || disabled) return;

        setIsProcessing(true);
        setActiveButton(action);

        try {
            await onAction(action);
        } catch (error) {
            console.error('Action failed:', error);
        } finally {
            setIsProcessing(false);
            setActiveButton(null);
        }
    };

    const canAfford = (apCost: number) => currentAP >= apCost;

    return (
        <div className="action-buttons">
            <div className="action-buttons-grid">
                {buttonKeys.map((key) => {
                    const btn = ACTION_BUTTONS[key];
                    if (!btn) return null;

                    const isDisabled =
                        disabled ||
                        isProcessing ||
                        (gameContext === 'combat' && isCombatDisabled) ||
                        !canAfford(btn.apCost);
                    const isActive = activeButton === btn.action;

                    return (
                        <button
                            key={btn.action}
                            className={`action-btn ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                            onClick={() => handleAction(btn.action)}
                            disabled={isDisabled}
                            title={`${btn.description}${btn.apCost > 0 ? ` (${btn.apCost} AP)` : ''}`}
                        >
                            <span className="action-icon">{btn.icon}</span>
                            <span className="action-label">{btn.label}</span>
                            {btn.apCost > 0 && (
                                <span className={`action-cost ${!canAfford(btn.apCost) ? 'insufficient' : ''}`}>
                                    {btn.apCost} AP
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {isProcessing && (
                <div className="action-processing">
                    Processing...
                </div>
            )}

            {gameContext === 'combat' && isCombatDisabled && (
                <div className="action-waiting">
                    ⏳ Enemy turn...
                </div>
            )}
        </div>
    );
}

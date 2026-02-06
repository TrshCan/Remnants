'use client';

import { useState } from 'react';
import { NPCDefinition, NPCDialogue, ItemDefinition, ITEMS } from '@/lib/game/data';

interface NPCDialogProps {
    npc: NPCDefinition;
    onClose: () => void;
    onShopOpen?: (items: ItemDefinition[]) => void;
    onTrainingOpen?: () => void;
}

export default function NPCDialog({ npc, onClose, onShopOpen, onTrainingOpen }: NPCDialogProps) {
    const [currentDialogue, setCurrentDialogue] = useState<NPCDialogue>(
        npc.dialogues.find(d => d.id === 'greeting') || npc.dialogues[0]
    );

    const handleResponse = (response: { text: string; nextDialogueId?: string; action?: string }) => {
        if (response.action === 'open_shop' && npc.inventory && onShopOpen) {
            const shopItems = npc.inventory
                .map(id => ITEMS[id])
                .filter(Boolean);
            onShopOpen(shopItems);
            onClose();
            return;
        }

        if (response.action === 'open_training' && onTrainingOpen) {
            onTrainingOpen();
            onClose();
            return;
        }

        if (response.nextDialogueId) {
            const nextDialogue = npc.dialogues.find(d => d.id === response.nextDialogueId);
            if (nextDialogue) {
                setCurrentDialogue(nextDialogue);
                return;
            }
        }

        // No next dialogue - close
        onClose();
    };

    return (
        <div className="npc-dialog">
            <div className="npc-header">
                <span className="npc-name">{npc.name}</span>
                <span className="npc-type">{npc.type}</span>
            </div>
            <div className="npc-portrait">
                {/* ASCII art portrait placeholder */}
                <pre className="ascii-portrait">{getASCIIPortrait(npc.type)}</pre>
            </div>
            <div className="npc-description">{npc.description}</div>
            <div className="dialogue-box">
                <div className="dialogue-text">"{currentDialogue.text}"</div>
            </div>

            {currentDialogue.responses ? (
                <div className="dialogue-responses">
                    {currentDialogue.responses.map((response, index) => (
                        <button
                            key={index}
                            className="response-btn"
                            onClick={() => handleResponse(response)}
                        >
                            {index + 1}. {response.text}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="dialogue-responses">
                    <button className="response-btn" onClick={onClose}>
                        [Leave]
                    </button>
                </div>
            )}
        </div>
    );
}

function getASCIIPortrait(type: string): string {
    switch (type) {
        case 'merchant':
            return `
   ___
  /   \\
 |  $  |
  \\___/
 /|   |\\
  |   |
 / \\ / \\
`;
        case 'trainer':
            return `
   ___
  /   \\
 | ** |
  \\___/
 /|===|\\
  | | |
 / \\ / \\
`;
        case 'lore':
            return `
   ~~~
  /   \\
 | oo |
  \\___/
 /|   |\\
  | ~ |
 / \\ / \\
`;
        default:
            return `
   ___
  /   \\
 | oo |
  \\___/
 /|   |\\
  |   |
 / \\ / \\
`;
    }
}

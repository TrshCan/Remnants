'use client';

import { EnemyDefinition } from '@/lib/game/data';

interface EnemyDisplayProps {
    enemies: {
        id: string;
        definition: EnemyDefinition;
        currentHp: number;
        intent: string;
    }[];
}

export default function EnemyDisplay({ enemies }: EnemyDisplayProps) {
    if (enemies.length === 0) {
        return null;
    }

    return (
        <div className="enemy-display">
            <div className="enemy-header">HOSTILES</div>
            <div className="enemy-list">
                {enemies.map((enemy) => (
                    <div key={enemy.id} className="enemy-card">
                        <div className="enemy-ascii">
                            <pre>{getEnemyASCII(enemy.definition.id)}</pre>
                        </div>
                        <div className="enemy-info">
                            <div className="enemy-name">{enemy.definition.name}</div>
                            <div className="enemy-hp-bar">
                                <div
                                    className="enemy-hp-fill"
                                    style={{
                                        width: `${(enemy.currentHp / enemy.definition.hp) * 100}%`,
                                        backgroundColor: getHPColor(enemy.currentHp, enemy.definition.hp)
                                    }}
                                />
                            </div>
                            <div className="enemy-hp-text">
                                {enemy.currentHp}/{enemy.definition.hp}
                            </div>
                            <div className="enemy-intent">
                                Intent: <span className={`intent-${enemy.intent}`}>{enemy.intent.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function getHPColor(current: number, max: number): string {
    const ratio = current / max;
    if (ratio > 0.6) return 'var(--success)';
    if (ratio > 0.3) return 'var(--warning)';
    return 'var(--danger)';
}

function getEnemyASCII(enemyId: string): string {
    switch (enemyId) {
        case 'scavenger_drone':
            return `
  [=]
 /| |\\
  ---
`;
        case 'feral_hound':
            return `
 /\\_/\\
( o.o )
 > ^ <
`;
        case 'corrupted_sentinel':
            return `
  [X]
 /|=|\\
 || ||
`;
        case 'raider':
            return `
  /-\\
 (x x)
 /|~|\\
`;
        case 'proto_construct':
            return `
  @@@@
 [|XX|]
 /|==|\\
  ====
`;
        default:
            return `
  ???
 (o o)
 /| |\\
`;
    }
}

'use client';

import { useState } from 'react';
import { ItemDefinition, ItemRarity } from '@/lib/game/data';

interface InventoryProps {
    items: { item: ItemDefinition; quantity: number; slot?: string }[];
    onUseItem?: (itemId: string) => void;
    onEquipItem?: (itemId: string) => void;
}

const RARITY_COLORS: Record<ItemRarity, string> = {
    common: 'var(--text-secondary)',
    uncommon: 'var(--success)',
    rare: '#5a9bd4',
    epic: '#a855f7',
    legendary: '#f59e0b',
};

export default function Inventory({ items, onUseItem, onEquipItem }: InventoryProps) {
    const [selectedItem, setSelectedItem] = useState<string | null>(null);

    if (items.length === 0) {
        return (
            <div className="inventory">
                <div className="inventory-header">INVENTORY</div>
                <div className="inventory-empty">Your pack is empty.</div>
            </div>
        );
    }

    return (
        <div className="inventory">
            <div className="inventory-header">INVENTORY</div>
            <div className="inventory-grid">
                {items.map(({ item, quantity, slot }) => (
                    <div
                        key={item.id}
                        className={`inventory-item ${selectedItem === item.id ? 'selected' : ''} ${slot ? 'equipped' : ''}`}
                        onClick={() => setSelectedItem(selectedItem === item.id ? null : item.id)}
                        style={{ borderColor: RARITY_COLORS[item.rarity] }}
                    >
                        <div className="item-name" style={{ color: RARITY_COLORS[item.rarity] }}>
                            {item.name}
                        </div>
                        {item.stackable && quantity > 1 && (
                            <div className="item-quantity">x{quantity}</div>
                        )}
                        {slot && <div className="item-equipped">E</div>}
                    </div>
                ))}
            </div>

            {selectedItem && (
                <ItemDetails
                    item={items.find(i => i.item.id === selectedItem)!}
                    onUse={onUseItem}
                    onEquip={onEquipItem}
                    onClose={() => setSelectedItem(null)}
                />
            )}
        </div>
    );
}

interface ItemDetailsProps {
    item: { item: ItemDefinition; quantity: number; slot?: string };
    onUse?: (itemId: string) => void;
    onEquip?: (itemId: string) => void;
    onClose: () => void;
}

function ItemDetails({ item: { item, quantity, slot }, onUse, onEquip, onClose }: ItemDetailsProps) {
    return (
        <div className="item-details">
            <div className="item-details-header">
                <span style={{ color: RARITY_COLORS[item.rarity] }}>{item.name}</span>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>
            <div className="item-description">{item.description}</div>
            <div className="item-type">{item.type.toUpperCase()} • {item.rarity.toUpperCase()}</div>

            {item.stats && (
                <div className="item-stats">
                    {item.stats.attackPower && <div>ATK +{item.stats.attackPower}</div>}
                    {item.stats.defense && <div>DEF +{item.stats.defense}</div>}
                    {item.stats.hpBonus && <div>HP +{item.stats.hpBonus}</div>}
                    {item.stats.mpBonus && <div>MP +{item.stats.mpBonus}</div>}
                </div>
            )}

            {item.useEffect && (
                <div className="item-effect">
                    USE: {item.useEffect.type === 'heal' ? `Restore ${item.useEffect.value} HP` :
                        item.useEffect.type === 'restore_ap' ? `Restore ${item.useEffect.value} AP` :
                            `${item.useEffect.type} ${item.useEffect.value}`}
                </div>
            )}

            <div className="item-actions">
                {item.useEffect && onUse && (
                    <button className="action-btn use" onClick={() => onUse(item.id)}>
                        USE
                    </button>
                )}
                {item.equipSlot && onEquip && (
                    <button className="action-btn equip" onClick={() => onEquip(item.id)}>
                        {slot ? 'UNEQUIP' : 'EQUIP'}
                    </button>
                )}
            </div>
        </div>
    );
}

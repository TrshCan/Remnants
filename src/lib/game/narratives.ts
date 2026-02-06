
export const ATTACK_MESSAGES = {
    miss: [
        "You swing wide, hitting nothing but air.",
        "Your attack is easily sidestepped.",
        "You stumble, missing your mark.",
        "The enemy weaves away from your strike."
    ],
    glancing: [
        "You land a glancing blow.",
        "Your strike connects, but lacks force.",
        "You scrape the enemy's defense."
    ],
    light: [
        "Your hit lands solid.",
        "You strike true.",
        "A clean hit."
    ],
    heavy: [
        "You strike with crushing force!",
        "A devastating blow!",
        "You drive your weapon deep!",
        "The impact echoes through the chamber."
    ],
    critical: [
        "CRITICAL HIT! You shatter their defense!",
        "A lethal strike! Use this advantage!",
        "Perfect form. Perfect execution. Maximum damage."
    ]
};

export const DEFEND_MESSAGES = [
    "You raise your guard, eyes locked on the enemy.",
    "You brace yourself for the incoming assault.",
    "You shift into a defensive stance.",
    "You prioritize survival, ready to parry."
];

export const WAIT_MESSAGES = [
    "You hold your ground, conserving energy.",
    "You take a moment to assess the situation.",
    "Patience is a weapon. You wait.",
    "You steady your breathing, watching the enemy."
];

export const ENEMY_ATTACK_MESSAGES = {
    miss: [
        "{attacker} lunges but misses!",
        "{attacker}'s attack whistles past you.",
        "{attacker} strikes the air where you stood."
    ],
    hit: [
        "{attacker} strikes you!",
        "{attacker} lands a blow.",
        "{attacker} attacks with ferocity."
    ],
    heavy: [
        "{attacker} smashes into your defenses!",
        "A heavy blow from {attacker} staggers you!",
        "{attacker} connects with brutal force."
    ]
};

export function getRandomMessage(messages: string[]): string {
    return messages[Math.floor(Math.random() * messages.length)];
}

export function getAttackNarrative(damage: number, maxHp: number): string {
    const ratio = damage / maxHp;
    if (damage === 0) return getRandomMessage(ATTACK_MESSAGES.miss);
    if (ratio < 0.1) return getRandomMessage(ATTACK_MESSAGES.glancing);
    if (ratio < 0.2) return getRandomMessage(ATTACK_MESSAGES.light);
    if (ratio < 0.4) return getRandomMessage(ATTACK_MESSAGES.heavy);
    return getRandomMessage(ATTACK_MESSAGES.critical);
}

export function getEnemyAttackNarrative(attacker: string, damage: number, playerMaxHp: number): string {
    const ratio = damage / playerMaxHp;
    let template = "";

    if (damage === 0) template = getRandomMessage(ENEMY_ATTACK_MESSAGES.miss);
    else if (ratio < 0.2) template = getRandomMessage(ENEMY_ATTACK_MESSAGES.hit);
    else template = getRandomMessage(ENEMY_ATTACK_MESSAGES.heavy);

    return template.replace("{attacker}", attacker);
}

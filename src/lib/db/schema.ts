import prisma from './client';
import type { Prisma, Account, Character, CombatStats, InventoryItem, Instance, Event, PlayerFlag } from '@prisma/client';
import { PlayerStatus, EventType } from '@prisma/client';

// Alias Character as Player for backward compatibility with existing app code
export type Player = Character;
export { prisma, PlayerStatus, EventType };
export type { Prisma, Account, Character, CombatStats, InventoryItem, Instance, Event, PlayerFlag };

/**
 * Database helper functions using Prisma.
 */
export const db = {
  // ============================================
  // ACCOUNTS
  // ============================================
  async createAccount(email: string, passwordHash: string) {
    return prisma.account.create({
      data: {
        email,
        passwordHash,
      },
    });
  },

  async getAccountByEmail(email: string) {
    return prisma.account.findUnique({
      where: { email },
      include: { characters: true },
    });
  },

  // ============================================
  // CHARACTERS (Formerly Players)
  // ============================================
  async getPlayer(id: string) {
    return prisma.character.findUnique({
      where: { id },
      include: {
        combatStats: true,
        inventory: true,
      }
    });
  },

  async getPlayerByName(name: string) {
    return prisma.character.findUnique({
      where: { name },
      include: {
        combatStats: true,
      }
    });
  },

  async createCharacter(accountId: string, name: string) {
    // Basic validation
    if (name.length < 3 || name.length > 20) {
      throw new Error("Name must be between 3 and 20 characters");
    }

    return prisma.character.create({
      data: {
        accountId,
        name,
        mp: 20,
        mpMax: 20,
        // Default Stats
        combatStats: {
          create: {
            strength: 5,
            dexterity: 5,
            constitution: 5,
            intelligence: 5,
            attackPower: 10,
            defense: 0,
          }
        }
      },
      include: {
        combatStats: true,
      }
    });
  },

  async updatePlayer(
    id: string,
    data: Prisma.CharacterUpdateInput
  ) {
    return prisma.character.update({
      where: { id },
      data,
    });
  },

  // ============================================
  // COMBAT STATS
  // ============================================
  async updateCombatStats(characterId: string, stats: Prisma.CombatStatsUpdateInput) {
    return prisma.combatStats.update({
      where: { characterId },
      data: stats,
    });
  },

  // ============================================
  // INVENTORY
  // ============================================
  async addInventoryItem(characterId: string, itemId: string, quantity: number = 1, metadata?: object) {
    if (quantity <= 0) throw new Error("Quantity must be positive");

    // Check if item exists in stackable items (logic depends on game design)
    // For now, we'll create a new item or update existing if we implemented stacking logic.
    // Assuming non-stackable or simple addition for now:

    return prisma.inventoryItem.create({
      data: {
        characterId,
        itemId,
        quantity,
        metadata: metadata ?? undefined,
      },
    });
  },

  async getInventory(characterId: string) {
    return prisma.inventoryItem.findMany({
      where: { characterId },
    });
  },

  async removeInventoryItem(itemId: string) {
    return prisma.inventoryItem.delete({
      where: { id: itemId },
    });
  },

  // ============================================
  // INSTANCES
  // ============================================
  async getInstance(id: string) {
    return prisma.instance.findUnique({ where: { id } });
  },

  async createInstance(zoneType: string, combatState?: object) {
    return prisma.instance.create({
      data: {
        zoneType,
        combatState: combatState ?? undefined,
      },
    });
  },

  async updateInstanceCombatState(id: string, combatState: object) {
    return prisma.instance.update({
      where: { id },
      data: { combatState },
    });
  },

  async getInstancePlayers(instanceId: string) {
    const instancePlayers = await prisma.instancePlayer.findMany({
      where: { instanceId },
      include: { player: true },
    });
    return instancePlayers.map((ip) => ip.player);
  },

  async addPlayerToInstance(instanceId: string, playerId: string) {
    return prisma.instancePlayer.upsert({
      where: {
        instanceId_playerId: { instanceId, playerId },
      },
      create: { instanceId, playerId },
      update: {},
    });
  },

  async removePlayerFromInstance(instanceId: string, playerId: string) {
    return prisma.instancePlayer.delete({
      where: {
        instanceId_playerId: { instanceId, playerId },
      },
    }).catch(() => null);
  },

  // ============================================
  // EVENTS
  // ============================================
  async createEvent(
    instanceId: string,
    message: string,
    eventType: EventType | string,
    playerId?: string
  ) {
    // Convert lowercase event types to uppercase Prisma enum values
    const normalizedEventType = (typeof eventType === 'string'
      ? eventType.toUpperCase()
      : eventType) as EventType;

    return prisma.event.create({
      data: {
        instanceId,
        message,
        eventType: normalizedEventType,
        playerId: playerId ?? null,
      },
    });
  },

  async getRecentEvents(instanceId: string, limit: number = 20) {
    const events = await prisma.event.findMany({
      where: { instanceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return events.reverse();
  },

  async getEventsAfter(instanceId: string, afterId: string) {
    const afterEvent = await prisma.event.findUnique({
      where: { id: afterId },
      select: { createdAt: true },
    });

    if (!afterEvent) {
      return [];
    }

    return prisma.event.findMany({
      where: {
        instanceId,
        createdAt: { gt: afterEvent.createdAt },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  // ============================================
  // PLAYER FLAGS
  // ============================================
  async getPlayerFlags(playerId: string) {
    const flags = await prisma.playerFlag.findMany({
      where: { playerId },
    });
    return Object.fromEntries(
      flags.map((f: PlayerFlag) => [f.flagKey, f.flagValue])
    );
  },

  async setPlayerFlag(playerId: string, key: string, value: string) {
    return prisma.playerFlag.upsert({
      where: {
        playerId_flagKey: { playerId, flagKey: key },
      },
      create: {
        playerId,
        flagKey: key,
        flagValue: value,
      },
      update: {
        flagValue: value,
      },
    });
  },
};

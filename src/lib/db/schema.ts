import { sql } from '@vercel/postgres';

/**
 * Database schema for Remnants.
 * Run this to initialize tables in Vercel Postgres.
 */

export const schema = `
-- Players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  hp INTEGER NOT NULL DEFAULT 100,
  hp_max INTEGER NOT NULL DEFAULT 100,
  ap_current REAL NOT NULL DEFAULT 3,
  ap_max INTEGER NOT NULL DEFAULT 3,
  ap_debt REAL NOT NULL DEFAULT 0,
  ap_last_update TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_action_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'alive',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Instances (zones/encounters)
CREATE TABLE IF NOT EXISTS instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_type VARCHAR(50) NOT NULL,
  combat_state JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Join table for players in instances
CREATE TABLE IF NOT EXISTS instance_players (
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (instance_id, player_id)
);

-- Events for SSE and history
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  event_type VARCHAR(20) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Player narrative flags
CREATE TABLE IF NOT EXISTS player_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  flag_key VARCHAR(100) NOT NULL,
  flag_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, flag_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_instance_created 
  ON events(instance_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instance_players_player 
  ON instance_players(player_id);
CREATE INDEX IF NOT EXISTS idx_player_flags_player 
  ON player_flags(player_id);
`;

/**
 * Initialize database schema.
 */
export async function initializeSchema(): Promise<void> {
    await sql.query(schema);
}

/**
 * Type-safe query helpers.
 */
export const db = {
    // Players
    async getPlayer(id: string) {
        const result = await sql`
      SELECT * FROM players WHERE id = ${id}
    `;
        return result.rows[0] || null;
    },

    async getPlayerByName(name: string) {
        const result = await sql`
      SELECT * FROM players WHERE name = ${name}
    `;
        return result.rows[0] || null;
    },

    async createPlayer(name: string) {
        const result = await sql`
      INSERT INTO players (name) 
      VALUES (${name})
      RETURNING *
    `;
        return result.rows[0];
    },

    async updatePlayer(
        id: string,
        updates: Partial<{
            hp: number;
            ap_current: number;
            ap_debt: number;
            ap_last_update: Date;
            last_action_at: Date;
            status: string;
        }>
    ) {
        // Build dynamic update query
        const setClauses: string[] = [];
        const values: unknown[] = [];
        let idx = 1;

        for (const [key, value] of Object.entries(updates)) {
            setClauses.push(`${key} = $${idx}`);
            values.push(value);
            idx++;
        }

        if (setClauses.length === 0) return null;

        values.push(id);
        const query = `
      UPDATE players 
      SET ${setClauses.join(', ')} 
      WHERE id = $${idx}
      RETURNING *
    `;

        const result = await sql.query(query, values);
        return result.rows[0] || null;
    },

    // Instances
    async getInstance(id: string) {
        const result = await sql`
      SELECT * FROM instances WHERE id = ${id}
    `;
        return result.rows[0] || null;
    },

    async createInstance(zoneType: string, combatState?: object) {
        const result = await sql`
      INSERT INTO instances (zone_type, combat_state) 
      VALUES (${zoneType}, ${JSON.stringify(combatState) || null})
      RETURNING *
    `;
        return result.rows[0];
    },

    async updateInstanceCombatState(id: string, combatState: object) {
        const result = await sql`
      UPDATE instances 
      SET combat_state = ${JSON.stringify(combatState)}
      WHERE id = ${id}
      RETURNING *
    `;
        return result.rows[0] || null;
    },

    async getInstancePlayers(instanceId: string) {
        const result = await sql`
      SELECT p.* FROM players p
      JOIN instance_players ip ON p.id = ip.player_id
      WHERE ip.instance_id = ${instanceId}
    `;
        return result.rows;
    },

    async addPlayerToInstance(instanceId: string, playerId: string) {
        await sql`
      INSERT INTO instance_players (instance_id, player_id)
      VALUES (${instanceId}, ${playerId})
      ON CONFLICT DO NOTHING
    `;
    },

    async removePlayerFromInstance(instanceId: string, playerId: string) {
        await sql`
      DELETE FROM instance_players 
      WHERE instance_id = ${instanceId} AND player_id = ${playerId}
    `;
    },

    // Events
    async createEvent(
        instanceId: string,
        message: string,
        eventType: string,
        playerId?: string
    ) {
        const result = await sql`
      INSERT INTO events (instance_id, player_id, message, event_type)
      VALUES (${instanceId}, ${playerId || null}, ${message}, ${eventType})
      RETURNING *
    `;
        return result.rows[0];
    },

    async getRecentEvents(instanceId: string, limit: number = 20) {
        const result = await sql`
      SELECT * FROM events 
      WHERE instance_id = ${instanceId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
        return result.rows.reverse(); // Return in chronological order
    },

    async getEventsAfter(instanceId: string, afterId: string) {
        const result = await sql`
      SELECT * FROM events 
      WHERE instance_id = ${instanceId}
        AND created_at > (SELECT created_at FROM events WHERE id = ${afterId})
      ORDER BY created_at ASC
    `;
        return result.rows;
    },

    // Player flags
    async getPlayerFlags(playerId: string) {
        const result = await sql`
      SELECT flag_key, flag_value FROM player_flags
      WHERE player_id = ${playerId}
    `;
        return Object.fromEntries(
            result.rows.map(r => [r.flag_key, r.flag_value])
        );
    },

    async setPlayerFlag(playerId: string, key: string, value: string) {
        await sql`
      INSERT INTO player_flags (player_id, flag_key, flag_value)
      VALUES (${playerId}, ${key}, ${value})
      ON CONFLICT (player_id, flag_key) 
      DO UPDATE SET flag_value = ${value}
    `;
    },
};

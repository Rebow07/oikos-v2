/**
 * BaseRepository.ts — CRUD genérico sobre SQLite com sync automático
 * ───────────────────────────────────────────────────────────────────
 * Todo repositório específico herda desta classe.
 */

import { getDB, generateUUID } from '../database';
import type { SyncStatus } from '../schema';

export interface SyncRecord {
  id: string;
  sync_status: SyncStatus;
  updated_at: string;
  [key: string]: unknown;
}

/**
 * Repositório genérico para qualquer tabela sincronizável.
 */
export class BaseRepository<T extends object> {
  constructor(protected readonly tableName: string) {}

  // ── Leitura ─────────────────────────────────────────────────────────

  async findAll(
    where?: Record<string, unknown>,
    orderBy?: string,
    limit?: number,
  ): Promise<T[]> {
    const db = getDB();
    let sql = `SELECT * FROM ${this.tableName} WHERE sync_status != 'deleted'`;
    const params: unknown[] = [];

    if (where) {
      for (const [col, val] of Object.entries(where)) {
        sql += ` AND ${col} = ?`;
        params.push(val);
      }
    }

    if (orderBy) sql += ` ORDER BY ${orderBy}`;
    if (limit) sql += ` LIMIT ${limit}`;

    return db.getAllAsync<T>(sql, params as any[]);
  }

  async findById(id: string): Promise<T | null> {
    const db = getDB();
    return db.getFirstAsync<T>(
      `SELECT * FROM ${this.tableName} WHERE id = ? AND sync_status != 'deleted'`,
      [id]
    );
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    const db = getDB();
    let sql = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE sync_status != 'deleted'`;
    const params: unknown[] = [];

    if (where) {
      for (const [col, val] of Object.entries(where)) {
        sql += ` AND ${col} = ?`;
        params.push(val);
      }
    }

    const result = await db.getFirstAsync<{ total: number }>(sql, params as any[]);
    return result?.total || 0;
  }

  // ── Escrita ─────────────────────────────────────────────────────────

  /**
   * Insere um registro localmente e enfileira para sync.
   * Gera UUID se não fornecido.
   */
  async insert(record: Partial<T> & { id?: string }): Promise<T> {
    const db = getDB();
    const id = record.id || generateUUID();
    const now = new Date().toISOString();

    const data: Record<string, unknown> = {
      ...record,
      id,
      sync_status: 'pending',
      updated_at: now,
      criado_em: (record as any).criado_em || now,
    };

    const cols = Object.keys(data);
    const placeholders = cols.map(() => '?').join(', ');
    const values = cols.map((c) => data[c]);

    await db.runAsync(
      `INSERT OR REPLACE INTO ${this.tableName} (${cols.join(', ')}) VALUES (${placeholders})`,
      values as any[]
    );

    // Enfileira para sync
    await this.enqueueSync(id, 'INSERT', data);

    return { ...data, id } as unknown as T;
  }

  /**
   * Atualiza um registro localmente e enfileira para sync.
   */
  async update(id: string, changes: Partial<T>): Promise<void> {
    const db = getDB();
    const now = new Date().toISOString();

    const data: Record<string, unknown> = {
      ...changes,
      sync_status: 'pending',
      updated_at: now,
    };

    // Não sobrescrever id
    delete data.id;

    const setClauses = Object.keys(data).map((c) => `${c} = ?`).join(', ');
    const values = [...Object.values(data), id];

    await db.runAsync(
      `UPDATE ${this.tableName} SET ${setClauses} WHERE id = ?`,
      values as any[]
    );

    // Enfileira para sync
    const full = await this.findById(id);
    await this.enqueueSync(id, 'UPDATE', full as Record<string, unknown>);
  }

  /**
   * Soft delete — marca como deleted para sincronizar a exclusão.
   */
  async delete(id: string): Promise<void> {
    const db = getDB();
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE ${this.tableName} SET sync_status = 'deleted', updated_at = ? WHERE id = ?`,
      [now, id]
    );

    await this.enqueueSync(id, 'DELETE', { id });
  }

  /**
   * Hard delete — remove fisicamente (usado após sync confirmar exclusão).
   */
  async hardDelete(id: string): Promise<void> {
    const db = getDB();
    await db.runAsync(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
  }

  // ── Sync helpers ────────────────────────────────────────────────────

  /**
   * Retorna registros pendentes de sync.
   */
  async getPending(): Promise<T[]> {
    const db = getDB();
    return db.getAllAsync<T>(
      `SELECT * FROM ${this.tableName} WHERE sync_status = 'pending'`
    );
  }

  /**
   * Retorna registros deletados pendentes de sync.
   */
  async getDeleted(): Promise<T[]> {
    const db = getDB();
    return db.getAllAsync<T>(
      `SELECT * FROM ${this.tableName} WHERE sync_status = 'deleted'`
    );
  }

  /**
   * Marca um registro como sincronizado.
   */
  async markSynced(id: string): Promise<void> {
    const db = getDB();
    await db.runAsync(
      `UPDATE ${this.tableName} SET sync_status = 'synced' WHERE id = ?`,
      [id]
    );
  }

  /**
   * Upsert de dados vindos do servidor (sem enfileirar para sync).
   */
  async upsertFromServer(record: Record<string, unknown>): Promise<void> {
    const db = getDB();
    const data: Record<string, unknown> = {
      ...record,
      sync_status: 'synced',
      updated_at: (record.updated_at as string) || new Date().toISOString(),
    };

    // Converte booleans do Supabase (true/false) para SQLite (1/0)
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === 'boolean') {
        data[key] = val ? 1 : 0;
      }
    }

    const cols = Object.keys(data);
    const placeholders = cols.map(() => '?').join(', ');
    const updateClauses = cols
      .filter((c) => c !== 'id')
      .map((c) => `${c} = excluded.${c}`)
      .join(', ');
    const values = cols.map((c) => data[c]);

    await db.runAsync(
      `INSERT INTO ${this.tableName} (${cols.join(', ')}) VALUES (${placeholders})
       ON CONFLICT(id) DO UPDATE SET ${updateClauses}
       WHERE excluded.updated_at > ${this.tableName}.updated_at OR ${this.tableName}.sync_status = 'synced'`,
      values as any[]
    );
  }

  // ── Interno ─────────────────────────────────────────────────────────

  private async enqueueSync(
    recordId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    payload: Record<string, unknown> | null,
  ): Promise<void> {
    const db = getDB();
    const id = generateUUID();

    // Remove operações anteriores para o mesmo registro/tabela (coalesce)
    await db.runAsync(
      `DELETE FROM sync_queue WHERE table_name = ? AND record_id = ?`,
      [this.tableName, recordId]
    );

    await db.runAsync(
      `INSERT INTO sync_queue (id, table_name, record_id, operation, payload) VALUES (?, ?, ?, ?, ?)`,
      [id, this.tableName, recordId, operation, payload ? JSON.stringify(payload) : null]
    );
  }
}

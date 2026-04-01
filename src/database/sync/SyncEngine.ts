/**
 * SyncEngine.ts — Motor de sincronização bidirecional SQLite ↔ Supabase
 * ──────────────────────────────────────────────────────────────────────
 * PUSH: Envia registros pendentes do SQLite pro Supabase
 * PULL: Baixa registros novos/alterados do Supabase pro SQLite
 * Resolve conflitos via last-write-wins (updated_at)
 */

import { getDB } from '../database';
import { supabase } from '../../services/supabase';
import { SYNCABLE_TABLES, READONLY_TABLES } from '../schema';
import { BaseRepository } from '../repositories/BaseRepository';

interface SyncQueueItem {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: string | null;
  created_at: string;
  attempts: number;
  last_error: string | null;
}

const MAX_ATTEMPTS = 5;

/**
 * Executa um ciclo completo de sincronização:
 * 1. PUSH pendentes locais → Supabase
 * 2. PULL novidades do Supabase → SQLite
 */
export async function syncAll(grupoId: string): Promise<{
  pushed: number;
  pulled: number;
  errors: number;
}> {
  let pushed = 0;
  let pulled = 0;
  let errors = 0;

  try {
    // 1. PUSH — enviar tudo que está na fila
    const pushResult = await pushPending();
    pushed = pushResult.success;
    errors = pushResult.errors;

    // 2. PULL — baixar novidades do Supabase
    const pullResult = await pullFromServer(grupoId);
    pulled = pullResult;

    // 3. Atualizar timestamp do último sync
    const db = getDB();
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_sync', ?)`,
      [new Date().toISOString()]
    );

    console.log(`[sync] Completo: ↑${pushed} ↓${pulled} ⚠${errors}`);
  } catch (err) {
    console.error('[sync] Erro geral:', err);
    errors++;
  }

  return { pushed, pulled, errors };
}

/**
 * PUSH: Envia todos os registros pendentes da sync_queue para o Supabase.
 */
async function pushPending(): Promise<{ success: number; errors: number }> {
  const db = getDB();
  let success = 0;
  let errors = 0;

  const queue = await db.getAllAsync<SyncQueueItem>(
    `SELECT * FROM sync_queue WHERE attempts < ? ORDER BY created_at ASC`,
    [MAX_ATTEMPTS]
  );

  for (const item of queue) {
    try {
      const payload = item.payload ? JSON.parse(item.payload) : {};

      // Remove campos locais antes de enviar ao Supabase
      const clean = cleanForSupabase(payload);

      switch (item.operation) {
        case 'INSERT': {
          const { error } = await supabase
            .from(item.table_name)
            .upsert(clean, { onConflict: 'id' });
          if (error) throw error;
          break;
        }
        case 'UPDATE': {
          const { error } = await supabase
            .from(item.table_name)
            .upsert(clean, { onConflict: 'id' });
          if (error) throw error;
          break;
        }
        case 'DELETE': {
          const { error } = await supabase
            .from(item.table_name)
            .delete()
            .eq('id', item.record_id);
          if (error) throw error;

          // Hard delete local após confirmar no servidor
          await db.runAsync(
            `DELETE FROM ${item.table_name} WHERE id = ?`,
            [item.record_id]
          );
          break;
        }
      }

      // Sucesso — remove da fila e marca como synced
      await db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [item.id]);

      if (item.operation !== 'DELETE') {
        await db.runAsync(
          `UPDATE ${item.table_name} SET sync_status = 'synced' WHERE id = ?`,
          [item.record_id]
        );
      }

      success++;
    } catch (err: any) {
      errors++;
      console.warn(`[sync:push] Erro ao sincronizar ${item.table_name}/${item.record_id}:`, err?.message);

      // Incrementa tentativas
      await db.runAsync(
        `UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
        [err?.message || 'Unknown', item.id]
      );
    }
  }

  return { success, errors };
}

/**
 * PULL: Baixa registros do Supabase que foram atualizados desde o último sync.
 */
async function pullFromServer(grupoId: string): Promise<number> {
  const db = getDB();
  let totalPulled = 0;

  // Pega timestamp do último sync
  const meta = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM sync_meta WHERE key = 'last_sync'`
  );
  const lastSync = meta?.value || '1970-01-01T00:00:00Z';

  // Puxa cada tabela sincronizável
  const allTables = [...SYNCABLE_TABLES, ...READONLY_TABLES];

  for (const table of allTables) {
    try {
      let query = supabase
        .from(table)
        .select('*')
        .gte('updated_at', lastSync);

      // Filtra por grupo quando a tabela tem grupo_id
      if (table !== 'grupos') {
        query = query.eq('grupo_id', grupoId);
      }

      const { data, error } = await query;
      if (error) {
        // Se a coluna updated_at não existe, faz pull completo
        if (error.message?.includes('updated_at')) {
          console.warn(`[sync:pull] Tabela ${table} não tem updated_at — pulando delta sync`);
          continue;
        }
        throw error;
      }

      if (data && data.length > 0) {
        const repo = new BaseRepository(table);
        for (const row of data) {
          await repo.upsertFromServer(row as any);
        }
        totalPulled += data.length;
      }
    } catch (err: any) {
      console.warn(`[sync:pull] Erro ao baixar ${table}:`, err?.message);
    }
  }

  return totalPulled;
}

/**
 * Remove campos de controle local antes de enviar ao Supabase.
 */
function cleanForSupabase(payload: Record<string, unknown>): Record<string, unknown> {
  const clean = { ...payload };
  delete clean.sync_status;
  // Não remove updated_at — o Supabase deve ter a coluna e o trigger

  // Converte inteiros de SQLite para booleans do Postgres
  const boolFields = [
    'ativo', 'fixo', 'parcelado', 'pago', 'concluida', 'concluido',
    'marcado', 'dia_inteiro', 'grupo_ativo',
  ];
  for (const field of boolFields) {
    if (field in clean) {
      clean[field] = clean[field] === 1 || clean[field] === true;
    }
  }

  return clean;
}

/**
 * Retorna a contagem de itens pendentes na fila de sync.
 */
export async function getPendingCount(): Promise<number> {
  const db = getDB();
  const result = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) as total FROM sync_queue`
  );
  return result?.total || 0;
}

/**
 * Retorna o timestamp do último sync bem-sucedido.
 */
export async function getLastSyncTime(): Promise<string | null> {
  const db = getDB();
  const result = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM sync_meta WHERE key = 'last_sync'`
  );
  return result?.value || null;
}

/**
 * Faz o download inicial de TODOS os dados do grupo (primeiro uso).
 */
export async function initialSync(grupoId: string): Promise<number> {
  const db = getDB();
  let total = 0;

  console.log('[sync] Iniciando download inicial...');

  // Baixa grupos e membros (read-only)
  for (const table of [...READONLY_TABLES, ...SYNCABLE_TABLES]) {
    try {
      let query = supabase.from(table).select('*');

      if (table !== 'grupos') {
        query = query.eq('grupo_id', grupoId);
      } else {
        query = query.eq('id', grupoId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        const repo = new BaseRepository(table);
        for (const row of data) {
          await repo.upsertFromServer(row as any);
        }
        total += data.length;
        console.log(`[sync] ${table}: ${data.length} registros`);
      }
    } catch (err: any) {
      console.warn(`[sync:initial] Erro ao baixar ${table}:`, err?.message);
    }
  }

  // Marca como sincronizado
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_sync', ?)`,
    [new Date().toISOString()]
  );
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('initial_sync_done', 'true')`
  );

  console.log(`[sync] Download inicial completo: ${total} registros`);
  return total;
}

/**
 * Verifica se o download inicial já foi feito.
 */
export async function isInitialSyncDone(): Promise<boolean> {
  const db = getDB();
  const result = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM sync_meta WHERE key = 'initial_sync_done'`
  );
  return result?.value === 'true';
}

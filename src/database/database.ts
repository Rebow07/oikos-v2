/**
 * database.ts — Singleton SQLite + inicialização + migrações
 * ────────────────────────────────────────────────────────────
 * Usa expo-sqlite (nova API síncrona do SDK 52+)
 */

import * as SQLite from 'expo-sqlite';
import { TABLE_DDL, INDEX_DDL, SCHEMA_VERSION } from './schema';

const DB_NAME = 'oikos_family.db';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Retorna a instância do banco.
 * Deve ser chamado SOMENTE após initDatabase().
 */
export function getDB(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('[database] Banco não inicializado. Chame initDatabase() primeiro.');
  return db;
}

/**
 * Inicializa o banco: cria tabelas, índices e aplica migrações.
 * Deve ser chamado UMA vez, no boot do app (antes de qualquer leitura/escrita).
 */
export async function initDatabase(): Promise<void> {
  if (db) return; // já inicializado

  db = await SQLite.openDatabaseAsync(DB_NAME);

  // Habilita WAL mode para performance
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Cria todas as tabelas
  for (const ddl of Object.values(TABLE_DDL)) {
    await db.execAsync(ddl);
  }

  // Cria índices
  for (const idx of INDEX_DDL) {
    await db.execAsync(idx);
  }

  // Verifica versão do schema para migrações futuras
  await db.execAsync(`
    INSERT OR IGNORE INTO sync_meta (key, value) VALUES ('schema_version', '0');
  `);

  const result = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM sync_meta WHERE key = 'schema_version'`
  );
  const currentVersion = parseInt(result?.value || '0', 10);

  if (currentVersion < SCHEMA_VERSION) {
    await runMigrations(currentVersion, SCHEMA_VERSION);
    await db.runAsync(
      `UPDATE sync_meta SET value = ? WHERE key = 'schema_version'`,
      [String(SCHEMA_VERSION)]
    );
  }

  console.log(`[database] SQLite inicializado — v${SCHEMA_VERSION} (${DB_NAME})`);
}

/**
 * Migrações incrementais. Adicionar cases conforme o schema evolui.
 */
async function runMigrations(from: number, to: number): Promise<void> {
  const database = getDB();

  for (let v = from + 1; v <= to; v++) {
    console.log(`[database] Aplicando migração v${v}...`);

    switch (v) {
      case 1:
        // Versão inicial — tabelas já criadas acima
        break;

      // case 2:
      //   await database.execAsync('ALTER TABLE transacoes ADD COLUMN nova_coluna TEXT;');
      //   break;

      default:
        console.warn(`[database] Migração v${v} não encontrada`);
    }
  }
}

/**
 * Limpa todo o banco (para debug/reset).
 */
export async function resetDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
  await SQLite.deleteDatabaseAsync(DB_NAME);
  console.log('[database] Banco resetado');
}

/**
 * Gera um UUID v4 para IDs locais.
 * Compatível com os UUIDs do Supabase.
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

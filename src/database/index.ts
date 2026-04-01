// Barrel export — src/database/index.ts
export { initDatabase, getDB, resetDatabase, generateUUID } from './database';
export { SCHEMA_VERSION, SYNCABLE_TABLES, READONLY_TABLES } from './schema';
export type { SyncStatus, SyncableTable, AllTable } from './schema';

// Repositórios
export {
  transacoesRepo,
  cartoesRepo,
  recorrentesRepo,
  rendasRepo,
  reservasRepo,
  reservasMovimentosRepo,
  metasRepo,
  notasRepo,
  listasComprasRepo,
  itensCompraRepo,
  contasRepo,
  compromissosRepo,
} from './repositories';

// Sync
export { SyncProvider, useSyncStatus } from './sync/SyncContext';
export { syncAll, getPendingCount, getLastSyncTime, initialSync } from './sync/SyncEngine';

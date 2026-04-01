/**
 * schema.ts — Definição DDL de todas as tabelas SQLite
 * ──────────────────────────────────────────────────────
 * Espelha as tabelas do Supabase + campos extras para sync:
 *   - sync_status: 'synced' | 'pending' | 'deleted'
 *   - updated_at:  timestamp local para resolução de conflitos
 */

/** Versão do schema — incrementar a cada migration */
export const SCHEMA_VERSION = 1;

/** Campos extras em TODA tabela sincronizável */
const SYNC_FIELDS = `
  sync_status TEXT NOT NULL DEFAULT 'synced',
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
`;

/**
 * DDL de cada tabela, na ordem de dependência (FK)
 */
export const TABLE_DDL: Record<string, string> = {
  // ── Grupos & Membros (read-only offline) ──────────────────────────
  grupos: `
    CREATE TABLE IF NOT EXISTS grupos (
      id               TEXT PRIMARY KEY,
      nome             TEXT NOT NULL,
      email_relatorio  TEXT,
      codigo_convite   TEXT,
      membros_totais   INTEGER DEFAULT 5,
      criado_em        TEXT,
      ${SYNC_FIELDS}
    );
  `,

  membros: `
    CREATE TABLE IF NOT EXISTS membros (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      grupo_id    TEXT,
      nome        TEXT NOT NULL DEFAULT 'Sem nome',
      grupo_ativo INTEGER DEFAULT 1,
      criado_em   TEXT,
      ${SYNC_FIELDS},
      FOREIGN KEY (grupo_id) REFERENCES grupos(id)
    );
  `,

  // ── Cartões ────────────────────────────────────────────────────────
  cartoes: `
    CREATE TABLE IF NOT EXISTS cartoes (
      id          TEXT PRIMARY KEY,
      grupo_id    TEXT,
      criado_por  TEXT NOT NULL,
      nome        TEXT NOT NULL,
      limite      REAL NOT NULL,
      vencimento  INTEGER NOT NULL,
      cor         TEXT DEFAULT '#2980B9',
      ativo       INTEGER DEFAULT 1,
      criado_em   TEXT,
      ${SYNC_FIELDS},
      FOREIGN KEY (grupo_id) REFERENCES grupos(id)
    );
  `,

  // ── Contas Bancárias ───────────────────────────────────────────────
  contas: `
    CREATE TABLE IF NOT EXISTS contas (
      id            TEXT PRIMARY KEY,
      grupo_id      TEXT,
      criado_por    TEXT NOT NULL,
      nome          TEXT NOT NULL,
      banco         TEXT NOT NULL,
      tipo          TEXT DEFAULT 'corrente',
      saldo_inicial REAL DEFAULT 0,
      saldo_atual   REAL DEFAULT 0,
      cor           TEXT DEFAULT '#2980B9',
      ativo         INTEGER DEFAULT 1,
      criado_em     TEXT,
      ${SYNC_FIELDS},
      FOREIGN KEY (grupo_id) REFERENCES grupos(id)
    );
  `,

  subcontas: `
    CREATE TABLE IF NOT EXISTS subcontas (
      id          TEXT PRIMARY KEY,
      conta_id    TEXT,
      grupo_id    TEXT NOT NULL,
      criado_por  TEXT NOT NULL,
      nome        TEXT NOT NULL,
      tipo        TEXT DEFAULT 'corrente',
      saldo       REAL DEFAULT 0,
      criado_em   TEXT,
      ${SYNC_FIELDS},
      FOREIGN KEY (conta_id) REFERENCES contas(id),
      FOREIGN KEY (grupo_id) REFERENCES grupos(id)
    );
  `,

  // ── Transações ─────────────────────────────────────────────────────
  transacoes: `
    CREATE TABLE IF NOT EXISTS transacoes (
      id               TEXT PRIMARY KEY,
      grupo_id         TEXT,
      criado_por       TEXT NOT NULL,
      criado_por_nome  TEXT,
      titulo           TEXT NOT NULL,
      valor            REAL NOT NULL,
      categoria        TEXT NOT NULL,
      tipo             TEXT NOT NULL,
      data             TEXT NOT NULL,
      fixo             INTEGER DEFAULT 0,
      parcelado        INTEGER DEFAULT 0,
      cartao_id        TEXT,
      parcela_grupo_id TEXT,
      parcela_index    INTEGER,
      pago             INTEGER DEFAULT 0,
      pago_em          TEXT,
      comprovante_url  TEXT,
      ${SYNC_FIELDS},
      FOREIGN KEY (grupo_id) REFERENCES grupos(id),
      FOREIGN KEY (cartao_id) REFERENCES cartoes(id)
    );
  `,

  // ── Recorrentes ────────────────────────────────────────────────────
  recorrentes: `
    CREATE TABLE IF NOT EXISTS recorrentes (
      id              TEXT PRIMARY KEY,
      grupo_id        TEXT,
      criado_por      TEXT NOT NULL,
      criado_por_nome TEXT,
      titulo          TEXT NOT NULL,
      valor           REAL NOT NULL,
      categoria       TEXT NOT NULL,
      cartao_id       TEXT,
      dia_vencimento  INTEGER NOT NULL,
      ativo           INTEGER DEFAULT 1,
      ultima_geracao  TEXT,
      periodicidade   TEXT DEFAULT 'mensal',
      data_inicio     TEXT,
      criado_em       TEXT,
      ${SYNC_FIELDS},
      FOREIGN KEY (grupo_id) REFERENCES grupos(id),
      FOREIGN KEY (cartao_id) REFERENCES cartoes(id)
    );
  `,

  // ── Rendas (Receitas) ──────────────────────────────────────────────
  rendas: `
    CREATE TABLE IF NOT EXISTS rendas (
      id          TEXT PRIMARY KEY,
      grupo_id    TEXT,
      criado_por  TEXT NOT NULL,
      nome        TEXT NOT NULL,
      valor       REAL NOT NULL,
      categoria   TEXT DEFAULT 'salario',
      fixo        INTEGER DEFAULT 1,
      ativo       INTEGER DEFAULT 1,
      criado_em   TEXT,
      ${SYNC_FIELDS},
      FOREIGN KEY (grupo_id) REFERENCES grupos(id)
    );
  `,

  // ── Reservas ───────────────────────────────────────────────────────
  reservas: `
    CREATE TABLE IF NOT EXISTS reservas (
      id             TEXT PRIMARY KEY,
      grupo_id       TEXT,
      criado_por     TEXT NOT NULL,
      nome           TEXT NOT NULL,
      descricao      TEXT,
      valor_objetivo REAL NOT NULL,
      valor_atual    REAL DEFAULT 0,
      cor            TEXT DEFAULT '#c9a227',
      icone          TEXT DEFAULT 'PiggyBank',
      ativo          INTEGER DEFAULT 1,
      criado_em      TEXT,
      ${SYNC_FIELDS},
      FOREIGN KEY (grupo_id) REFERENCES grupos(id)
    );
  `,

  reservas_movimentos: `
    CREATE TABLE IF NOT EXISTS reservas_movimentos (
      id          TEXT PRIMARY KEY,
      reserva_id  TEXT,
      grupo_id    TEXT NOT NULL,
      criado_por  TEXT NOT NULL,
      tipo        TEXT NOT NULL,
      valor       REAL NOT NULL,
      descricao   TEXT,
      criado_em   TEXT,
      ${SYNC_FIELDS},
      FOREIGN KEY (reserva_id) REFERENCES reservas(id),
      FOREIGN KEY (grupo_id) REFERENCES grupos(id)
    );
  `,

  // ── Metas ──────────────────────────────────────────────────────────
  metas: `
    CREATE TABLE IF NOT EXISTS metas (
      id           TEXT PRIMARY KEY,
      grupo_id     TEXT,
      criado_por   TEXT NOT NULL,
      categoria    TEXT NOT NULL,
      valor_limite REAL NOT NULL,
      mes          INTEGER NOT NULL,
      ano          INTEGER NOT NULL,
      criado_em    TEXT,
      ${SYNC_FIELDS},
      FOREIGN KEY (grupo_id) REFERENCES grupos(id)
    );
  `,

  // ── Notas / Tarefas ────────────────────────────────────────────────
  notas: `
    CREATE TABLE IF NOT EXISTS notas (
      id            TEXT PRIMARY KEY,
      grupo_id      TEXT,
      criado_por    TEXT NOT NULL,
      titulo        TEXT NOT NULL,
      conteudo      TEXT,
      tipo          TEXT DEFAULT 'nota',
      concluida     INTEGER DEFAULT 0,
      data_lembrete TEXT,
      criado_em     TEXT,
      ${SYNC_FIELDS},
      FOREIGN KEY (grupo_id) REFERENCES grupos(id)
    );
  `,

  // ── Listas de Compras ──────────────────────────────────────────────
  listas_compras: `
    CREATE TABLE IF NOT EXISTS listas_compras (
      id          TEXT PRIMARY KEY,
      grupo_id    TEXT,
      criado_por  TEXT NOT NULL,
      nome        TEXT NOT NULL DEFAULT 'Lista de compras',
      concluida   INTEGER DEFAULT 0,
      criado_em   TEXT,
      ${SYNC_FIELDS},
      FOREIGN KEY (grupo_id) REFERENCES grupos(id)
    );
  `,

  itens_compra: `
    CREATE TABLE IF NOT EXISTS itens_compra (
      id             TEXT PRIMARY KEY,
      lista_id       TEXT,
      grupo_id       TEXT NOT NULL,
      nome           TEXT NOT NULL,
      quantidade     REAL DEFAULT 1,
      valor_unitario REAL DEFAULT 0,
      marcado        INTEGER DEFAULT 0,
      criado_por     TEXT NOT NULL,
      criado_em      TEXT,
      ${SYNC_FIELDS},
      FOREIGN KEY (lista_id) REFERENCES listas_compras(id),
      FOREIGN KEY (grupo_id) REFERENCES grupos(id)
    );
  `,

  // ── Compromissos ───────────────────────────────────────────────────
  compromissos: `
    CREATE TABLE IF NOT EXISTS compromissos (
      id               TEXT PRIMARY KEY,
      grupo_id         TEXT,
      criado_por       TEXT NOT NULL,
      titulo           TEXT NOT NULL,
      descricao        TEXT,
      data_inicio      TEXT NOT NULL,
      data_fim         TEXT,
      dia_inteiro      INTEGER DEFAULT 0,
      local            TEXT,
      cor              TEXT DEFAULT '#2980B9',
      lembrete_minutos INTEGER DEFAULT 30,
      recorrencia      TEXT,
      google_event_id  TEXT,
      concluido        INTEGER DEFAULT 0,
      criado_em        TEXT,
      ${SYNC_FIELDS},
      FOREIGN KEY (grupo_id) REFERENCES grupos(id)
    );
  `,

  // ── Movimentações Banco ────────────────────────────────────────────
  movimentacoes_banco: `
    CREATE TABLE IF NOT EXISTS movimentacoes_banco (
      id          TEXT PRIMARY KEY,
      subconta_id TEXT,
      conta_id    TEXT NOT NULL,
      grupo_id    TEXT NOT NULL,
      criado_por  TEXT NOT NULL,
      tipo        TEXT NOT NULL,
      valor       REAL NOT NULL,
      descricao   TEXT,
      data        TEXT,
      criado_em   TEXT,
      ${SYNC_FIELDS},
      FOREIGN KEY (subconta_id) REFERENCES subcontas(id),
      FOREIGN KEY (conta_id) REFERENCES contas(id),
      FOREIGN KEY (grupo_id) REFERENCES grupos(id)
    );
  `,

  // ── Fila de Sincronização ──────────────────────────────────────────
  sync_queue: `
    CREATE TABLE IF NOT EXISTS sync_queue (
      id          TEXT PRIMARY KEY,
      table_name  TEXT NOT NULL,
      record_id   TEXT NOT NULL,
      operation   TEXT NOT NULL,
      payload     TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      attempts    INTEGER DEFAULT 0,
      last_error  TEXT
    );
  `,

  // ── Metadados de sync ──────────────────────────────────────────────
  sync_meta: `
    CREATE TABLE IF NOT EXISTS sync_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `,
};

/** Índices para performance de queries frequentes */
export const INDEX_DDL: string[] = [
  'CREATE INDEX IF NOT EXISTS idx_transacoes_grupo_data ON transacoes(grupo_id, data);',
  'CREATE INDEX IF NOT EXISTS idx_transacoes_sync ON transacoes(sync_status);',
  'CREATE INDEX IF NOT EXISTS idx_cartoes_grupo ON cartoes(grupo_id);',
  'CREATE INDEX IF NOT EXISTS idx_recorrentes_grupo ON recorrentes(grupo_id);',
  'CREATE INDEX IF NOT EXISTS idx_rendas_grupo ON rendas(grupo_id);',
  'CREATE INDEX IF NOT EXISTS idx_reservas_grupo ON reservas(grupo_id);',
  'CREATE INDEX IF NOT EXISTS idx_reservas_mov_reserva ON reservas_movimentos(reserva_id);',
  'CREATE INDEX IF NOT EXISTS idx_metas_grupo_mes ON metas(grupo_id, mes, ano);',
  'CREATE INDEX IF NOT EXISTS idx_notas_grupo ON notas(grupo_id);',
  'CREATE INDEX IF NOT EXISTS idx_listas_grupo ON listas_compras(grupo_id);',
  'CREATE INDEX IF NOT EXISTS idx_itens_lista ON itens_compra(lista_id);',
  'CREATE INDEX IF NOT EXISTS idx_compromissos_grupo ON compromissos(grupo_id);',
  'CREATE INDEX IF NOT EXISTS idx_contas_grupo ON contas(grupo_id);',
  'CREATE INDEX IF NOT EXISTS idx_subcontas_conta ON subcontas(conta_id);',
  'CREATE INDEX IF NOT EXISTS idx_mov_banco_conta ON movimentacoes_banco(conta_id);',
  'CREATE INDEX IF NOT EXISTS idx_sync_queue_table ON sync_queue(table_name, operation);',
  'CREATE INDEX IF NOT EXISTS idx_membros_grupo ON membros(grupo_id);',
  'CREATE INDEX IF NOT EXISTS idx_membros_user ON membros(user_id);',
];

/** Nomes de todas as tabelas sincronizáveis (exclui sync_queue e sync_meta) */
export const SYNCABLE_TABLES = [
  'transacoes', 'cartoes', 'recorrentes', 'rendas',
  'reservas', 'reservas_movimentos', 'metas', 'notas',
  'listas_compras', 'itens_compra', 'contas', 'subcontas',
  'movimentacoes_banco', 'compromissos',
] as const;

/** Tabelas que são read-only offline (baixa do Supabase, não cria localmente) */
export const READONLY_TABLES = ['grupos', 'membros'] as const;

export type SyncableTable = typeof SYNCABLE_TABLES[number];
export type ReadonlyTable = typeof READONLY_TABLES[number];
export type AllTable = SyncableTable | ReadonlyTable;
export type SyncStatus = 'synced' | 'pending' | 'deleted';

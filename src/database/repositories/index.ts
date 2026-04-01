/**
 * Repositórios específicos por tabela.
 * Cada um herda de BaseRepository e adiciona queries especializadas.
 */

import { BaseRepository } from './BaseRepository';
import { getDB } from '../database';
import type {
  Transacao, Cartao, Recorrente, Receita,
  Reserva, ReservaMovimento, Meta, Nota,
  ListaCompras, ItemCompra, ContaBancaria,
  Compromisso,
} from '../../types';

// ── Transações ───────────────────────────────────────────────────────

class TransacoesRepo extends BaseRepository<Transacao> {
  constructor() { super('transacoes'); }

  async findByGrupoMes(
    grupoId: string, inicio: string, fim: string, tipo?: string,
  ): Promise<Transacao[]> {
    const db = getDB();
    let sql = `SELECT * FROM transacoes WHERE grupo_id = ? AND data >= ? AND data <= ? AND sync_status != 'deleted'`;
    const params: unknown[] = [grupoId, inicio, fim];
    if (tipo) { sql += ` AND tipo = ?`; params.push(tipo); }
    sql += ` ORDER BY data DESC`;
    return db.getAllAsync<Transacao>(sql, params as any[]);
  }

  async togglePago(id: string, pago: boolean): Promise<void> {
    await this.update(id, {
      pago,
      pago_em: pago ? new Date().toISOString().split('T')[0] : null,
    } as any);
  }
}

// ── Cartões ──────────────────────────────────────────────────────────

class CartoesRepo extends BaseRepository<Cartao> {
  constructor() { super('cartoes'); }

  async findByGrupo(grupoId: string): Promise<Cartao[]> {
    return this.findAll({ grupo_id: grupoId, ativo: 1 }, 'nome ASC');
  }
}

// ── Recorrentes ──────────────────────────────────────────────────────

class RecorrentesRepo extends BaseRepository<Recorrente> {
  constructor() { super('recorrentes'); }

  async findByGrupo(grupoId: string): Promise<Recorrente[]> {
    return this.findAll({ grupo_id: grupoId }, 'dia_vencimento ASC');
  }
}

// ── Rendas (Receitas) ────────────────────────────────────────────────

class RendasRepo extends BaseRepository<Receita> {
  constructor() { super('rendas'); }

  async findByGrupo(grupoId: string): Promise<Receita[]> {
    return this.findAll({ grupo_id: grupoId, ativo: 1 }, 'criado_em DESC');
  }
}

// ── Reservas ─────────────────────────────────────────────────────────

class ReservasRepo extends BaseRepository<Reserva> {
  constructor() { super('reservas'); }

  async findByGrupo(grupoId: string): Promise<Reserva[]> {
    return this.findAll({ grupo_id: grupoId, ativo: 1 }, 'criado_em DESC');
  }
}

// ── Reservas Movimentos ──────────────────────────────────────────────

class ReservasMovimentosRepo extends BaseRepository<ReservaMovimento> {
  constructor() { super('reservas_movimentos'); }

  async findByReserva(reservaId: string): Promise<ReservaMovimento[]> {
    return this.findAll({ reserva_id: reservaId }, 'criado_em DESC');
  }
}

// ── Metas ────────────────────────────────────────────────────────────

class MetasRepo extends BaseRepository<Meta> {
  constructor() { super('metas'); }

  async findByGrupoMes(grupoId: string, mes: number, ano: number): Promise<Meta[]> {
    return this.findAll({ grupo_id: grupoId, mes, ano });
  }
}

// ── Notas ────────────────────────────────────────────────────────────

class NotasRepo extends BaseRepository<Nota> {
  constructor() { super('notas'); }

  async findByGrupo(grupoId: string): Promise<Nota[]> {
    return this.findAll({ grupo_id: grupoId }, 'criado_em DESC');
  }
}

// ── Listas de Compras ────────────────────────────────────────────────

class ListasComprasRepo extends BaseRepository<ListaCompras> {
  constructor() { super('listas_compras'); }

  async findByGrupo(grupoId: string): Promise<ListaCompras[]> {
    return this.findAll({ grupo_id: grupoId }, 'criado_em DESC');
  }
}

// ── Itens de Compra ──────────────────────────────────────────────────

class ItensCompraRepo extends BaseRepository<ItemCompra> {
  constructor() { super('itens_compra'); }

  async findByLista(listaId: string): Promise<ItemCompra[]> {
    return this.findAll({ lista_id: listaId }, 'criado_em ASC');
  }

  async toggleMarcado(id: string, marcado: boolean): Promise<void> {
    await this.update(id, { marcado } as any);
  }
}

// ── Contas Bancárias ─────────────────────────────────────────────────

class ContasRepo extends BaseRepository<ContaBancaria> {
  constructor() { super('contas'); }

  async findByGrupo(grupoId: string): Promise<ContaBancaria[]> {
    return this.findAll({ grupo_id: grupoId, ativo: 1 }, 'nome ASC');
  }
}

// ── Compromissos ─────────────────────────────────────────────────────

class CompromissosRepo extends BaseRepository<Compromisso> {
  constructor() { super('compromissos'); }

  async findByGrupo(grupoId: string): Promise<Compromisso[]> {
    return this.findAll({ grupo_id: grupoId }, 'data_inicio ASC');
  }
}

// ── Singletons ───────────────────────────────────────────────────────

export const transacoesRepo = new TransacoesRepo();
export const cartoesRepo = new CartoesRepo();
export const recorrentesRepo = new RecorrentesRepo();
export const rendasRepo = new RendasRepo();
export const reservasRepo = new ReservasRepo();
export const reservasMovimentosRepo = new ReservasMovimentosRepo();
export const metasRepo = new MetasRepo();
export const notasRepo = new NotasRepo();
export const listasComprasRepo = new ListasComprasRepo();
export const itensCompraRepo = new ItensCompraRepo();
export const contasRepo = new ContasRepo();
export const compromissosRepo = new CompromissosRepo();

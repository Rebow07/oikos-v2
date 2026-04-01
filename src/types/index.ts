// src/types/index.ts — Rebow Family v2.1

export type FiltroTempo = 'mensal' | 'trimestral' | 'semestral' | 'anual';

export interface Grupo {
  id: string;
  nome: string;
  criado_em: string;
  email_relatorio: string | null;
  codigo_convite: string;
}

export interface GrupoItem {
  id: string;
  nome: string;
}

export interface Membro {
  id?: string;
  user_id: string;
  grupo_id?: string;
  criado_em?: string;
  nome: string;
  grupo_ativo?: boolean;
  email?: string;
}

// transacoes — NÃO tem criado_em
export interface Transacao {
  id: string;
  grupo_id: string;
  titulo: string;
  valor: number;
  categoria: string;
  tipo: 'despesa' | 'renda';
  data: string;
  parcelado: boolean;
  fixo: boolean;
  criado_por: string;
  cartao_id: string | null;
  parcela_grupo_id: string | null;
  parcela_index: number | null;
  pago: boolean;
  pago_em: string | null;
  criado_por_nome: string | null;
  comprovante_url?: string | null;
}

export interface TransacaoInsert {
  grupo_id: string;
  criado_por: string;
  criado_por_nome?: string | null;
  titulo: string;
  valor: number;
  categoria: string;
  tipo: 'despesa' | 'renda';
  data: string;
  fixo: boolean;
  parcelado: boolean;
  cartao_id?: string | null;
  parcela_grupo_id?: string | null;
  parcela_index?: number | null;
  comprovante_url?: string | null;
}

export interface FiltroTransacao {
  grupoId: string;
  mes: number;
  ano: number;
  tipo?: 'despesa' | 'renda';
}

export interface Receita {
  id: string;
  grupo_id: string;
  criado_por: string;
  nome: string;
  valor: number;
  fixo: boolean;
  ativo: boolean;
  criado_em: string;
  categoria: string;
}

export interface Cartao {
  id: string;
  grupo_id: string;
  criado_por: string;
  nome: string;
  limite: number;
  vencimento: number;
  cor: string;
  ativo: boolean;
  criado_em: string;
}

export interface Recorrente {
  id: string;
  grupo_id: string;
  criado_por: string;
  criado_por_nome: string | null;
  titulo: string;
  valor: number;
  categoria: string;
  cartao_id: string | null;
  dia_vencimento: number;
  ativo: boolean;
  ultima_geracao: string | null;
  criado_em: string;
  data_inicio: string | null;
  periodicidade?: 'mensal' | 'trimestral' | 'semestral' | 'anual';
}

export interface Meta {
  id: string;
  grupo_id: string;
  criado_por: string;
  categoria: string;
  valor_limite: number;
  mes: number;
  ano: number;
  criado_em: string;
}

export interface Reserva {
  id: string;
  grupo_id: string;
  criado_por: string;
  nome: string;
  descricao: string | null;
  valor_objetivo: number;
  valor_atual: number;
  cor: string;
  icone: string;
  ativo: boolean;
  criado_em: string;
}

export interface ReservaMovimento {
  id: string;
  reserva_id: string;
  grupo_id: string;
  criado_por: string;
  tipo: 'deposito' | 'saque';
  valor: number;
  descricao: string | null;
  criado_em: string;
}

export interface ContaBancaria {
  id: string;
  grupo_id: string;
  criado_por: string;
  nome: string;
  banco: string;
  tipo: string;
  saldo_inicial: number;
  saldo_atual: number;
  cor: string;
  ativo: boolean;
  criado_em: string;
}

// NOVA — subconta dentro de um banco
export interface Subconta {
  id: string;
  conta_id: string;
  grupo_id: string;
  criado_por: string;
  nome: string;
  tipo: 'corrente' | 'poupanca' | 'caixinha' | 'investimento';
  saldo: number;
  criado_em: string;
}

// NOVA — movimentação bancária
export interface MovimentacaoBanco {
  id: string;
  subconta_id: string;
  conta_id: string;
  grupo_id: string;
  criado_por: string;
  tipo: 'entrada' | 'saida' | 'transferencia';
  valor: number;
  descricao: string | null;
  data: string;
  criado_em: string;
}

export interface ListaCompras {
  id: string;
  grupo_id: string;
  criado_por: string;
  nome: string;
  concluida: boolean;
  criado_em: string;
}

export interface ItemCompra {
  id: string;
  lista_id: string;
  grupo_id: string;
  nome: string;
  quantidade: number;
  valor_unitario: number;
  marcado: boolean;
  criado_por: string;
  criado_em: string;
}

export interface Nota {
  id: string;
  grupo_id: string;
  criado_por: string;
  titulo: string;
  conteudo: string | null;
  tipo: 'nota' | 'tarefa';
  concluida: boolean;
  data_lembrete: string | null;
  criado_em: string;
}

// NOVA — compromisso/agenda
export interface Compromisso {
  id: string;
  grupo_id: string;
  criado_por: string;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string | null;
  dia_inteiro: boolean;
  local: string | null;
  cor: string;
  lembrete_minutos: number;
  recorrencia: string | null;
  google_event_id: string | null;
  concluido: boolean;
  criado_em: string;
}

export interface DashboardResumo {
  totalDespesas: number;
  totalReceitas: number;
  saldo: number;
  orcamentoMensal: number;
  percentualGasto: number;
  transacoesRecentes: Transacao[];
}

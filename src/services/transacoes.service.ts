import { supabase } from './supabase';
import type { Transacao, TransacaoInsert, FiltroTransacao } from '../types';
import { inicioDoMes, fimDoMes } from '../utils';

export async function buscarTransacoes(filtro: FiltroTransacao): Promise<Transacao[]> {
  const inicio = inicioDoMes(filtro.mes, filtro.ano);
  const fim = fimDoMes(filtro.mes, filtro.ano);

  let query = supabase
    .from('transacoes')
    .select('*')
    .eq('grupo_id', filtro.grupoId)
    .gte('data', inicio)
    .lte('data', fim)
    .order('data', { ascending: false });

  if (filtro.tipo) {
    query = query.eq('tipo', filtro.tipo);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as Transacao[]) || [];
}

export async function criarTransacao(transacao: TransacaoInsert): Promise<Transacao> {
  const { data, error } = await supabase
    .from('transacoes')
    .insert(transacao)
    .select()
    .single();

  if (error) throw error;
  return data as Transacao;
}

export async function criarTransacoesBatch(transacoes: TransacaoInsert[]): Promise<void> {
  const { error } = await supabase.from('transacoes').insert(transacoes);
  if (error) throw error;
}

export async function atualizarTransacao(
  id: string,
  updates: Partial<Transacao>,
): Promise<void> {
  const { error } = await supabase
    .from('transacoes')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export async function excluirTransacao(id: string): Promise<void> {
  const { error } = await supabase.from('transacoes').delete().eq('id', id);
  if (error) throw error;
}

export async function excluirParcelas(parcelaGrupoId: string): Promise<void> {
  const { error } = await supabase
    .from('transacoes')
    .delete()
    .eq('parcela_grupo_id', parcelaGrupoId);

  if (error) throw error;
}

export async function marcarPago(
  id: string,
  pago: boolean,
): Promise<void> {
  const updates: Partial<Transacao> = {
    pago,
    pago_em: pago ? new Date().toISOString().split('T')[0] : null,
  };

  const { error } = await supabase
    .from('transacoes')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export async function marcarPagoBatch(
  ids: string[],
  pago: boolean,
): Promise<void> {
  const updates: Partial<Transacao> = {
    pago,
    pago_em: pago ? new Date().toISOString().split('T')[0] : null,
  };

  const { error } = await supabase
    .from('transacoes')
    .update(updates)
    .in('id', ids);

  if (error) throw error;
}

// NOVO: Adiantar parcelas (marcar como pagas, preserva histórico)
export async function adiantarParcelas(ids: string[]): Promise<void> {
  const hoje = new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('transacoes')
    .update({
      pago: true,
      pago_em: hoje,
    })
    .in('id', ids);

  if (error) throw error;
}

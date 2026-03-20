import { supabase } from './supabase';
import type { Cartao } from '../types';

export async function buscarCartoes(grupoId: string): Promise<Cartao[]> {
  const { data, error } = await supabase
    .from('cartoes')
    .select('*')
    .eq('grupo_id', grupoId)
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (error) throw error;
  return (data as Cartao[]) || [];
}

export async function criarCartao(cartao: Omit<Cartao, 'id' | 'ativo'>): Promise<Cartao> {
  const { data, error } = await supabase
    .from('cartoes')
    .insert({ ...cartao, ativo: true })
    .select()
    .single();

  if (error) throw error;
  return data as Cartao;
}

export async function atualizarCartao(
  id: string,
  updates: Partial<Cartao>,
): Promise<void> {
  const { error } = await supabase
    .from('cartoes')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export async function excluirCartao(id: string): Promise<void> {
  const { error } = await supabase
    .from('cartoes')
    .update({ ativo: false })
    .eq('id', id);

  if (error) throw error;
}

export async function buscarGastosCartao(
  cartaoId: string,
  mes: number,
  ano: number,
): Promise<number> {
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fim = `${ano}-${String(mes).padStart(2, '0')}-${ultimoDia}`;

  const { data, error } = await supabase
    .from('transacoes')
    .select('valor')
    .eq('cartao_id', cartaoId)
    .gte('data', inicio)
    .lte('data', fim);

  if (error) throw error;
  return (data || []).reduce((acc: number, t: any) => acc + t.valor, 0);
}

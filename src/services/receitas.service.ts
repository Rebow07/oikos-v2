import { supabase } from './supabase';
import type { Receita } from '../types';

export async function buscarReceitas(grupoId: string): Promise<Receita[]> {
  const { data, error } = await supabase
    .from('rendas')
    .select('*')
    .eq('grupo_id', grupoId)
    .eq('ativo', true)
    .order('criado_em', { ascending: false });

  if (error) throw error;
  return (data as Receita[]) || [];
}

export async function criarReceita(receita: Omit<Receita, 'id'>): Promise<Receita> {
  const { data, error } = await supabase
    .from('rendas')
    .insert(receita)
    .select()
    .single();

  if (error) throw error;
  return data as Receita;
}

export async function atualizarReceita(
  id: string,
  updates: Partial<Receita>,
): Promise<void> {
  const { error } = await supabase
    .from('rendas')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export async function excluirReceita(id: string): Promise<void> {
  const { error } = await supabase
    .from('rendas')
    .update({ ativo: false })
    .eq('id', id);

  if (error) throw error;
}

export function calcularTotalReceitas(receitas: Receita[]): number {
  return receitas.reduce((acc, r) => acc + r.valor, 0);
}

import { supabase } from './supabase';
import type { Recorrente } from '../types';

export async function buscarRecorrentes(grupoId: string): Promise<Recorrente[]> {
  const { data, error } = await supabase
    .from('recorrentes')
    .select('*')
    .eq('grupo_id', grupoId)
    .order('dia_vencimento', { ascending: true });

  if (error) throw error;
  return (data as Recorrente[]) || [];
}

export async function criarRecorrente(
  recorrente: Omit<Recorrente, 'id' | 'ultima_geracao'>
): Promise<Recorrente> {
  const { data, error } = await supabase
    .from('recorrentes')
    .insert(recorrente)
    .select()
    .single();

  if (error) throw error;
  return data as Recorrente;
}

export async function atualizarRecorrente(id: string, updates: Partial<Recorrente>): Promise<void> {
  const { error } = await supabase.from('recorrentes').update(updates).eq('id', id);
  if (error) throw error;
}

export async function excluirRecorrente(id: string): Promise<void> {
  const { error } = await supabase.from('recorrentes').delete().eq('id', id);
  if (error) throw error;
}

export async function gerarRecorrentes(grupoId: string): Promise<number> {
  const { data, error } = await supabase.rpc('gerar_recorrentes', {
    p_grupo_id: grupoId,
  });
  if (error) throw error;
  return (data as number) || 0;
}
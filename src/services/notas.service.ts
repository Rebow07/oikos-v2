import { supabase } from './supabase';
import type { Nota } from '../types';

export async function buscarNotas(grupoId: string): Promise<Nota[]> {
  const { data, error } = await supabase
    .from('notas')
    .select('*')
    .eq('grupo_id', grupoId)
    .order('criado_em', { ascending: false });

  if (error) throw error;
  return (data as Nota[]) || [];
}

export async function criarNota(nota: Omit<Nota, 'id' | 'criado_em' | 'concluida'>): Promise<Nota> {
  const { data, error } = await supabase
    .from('notas')
    .insert({ ...nota, concluida: false })
    .select()
    .single();

  if (error) throw error;
  return data as Nota;
}

export async function atualizarNota(id: string, updates: Partial<Nota>): Promise<void> {
  const { error } = await supabase.from('notas').update(updates).eq('id', id);
  if (error) throw error;
}

export async function excluirNota(id: string): Promise<void> {
  const { error } = await supabase.from('notas').delete().eq('id', id);
  if (error) throw error;
}

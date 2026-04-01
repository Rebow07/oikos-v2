import { supabase } from './supabase';
import type { ListaCompras, ItemCompra } from '../types';

export async function buscarListas(grupoId: string): Promise<ListaCompras[]> {
  const { data, error } = await supabase
    .from('listas_compras')
    .select('*')
    .eq('grupo_id', grupoId)
    .order('criado_em', { ascending: false });

  if (error) throw error;
  return (data as ListaCompras[]) || [];
}

export async function criarLista(lista: Omit<ListaCompras, 'id' | 'criado_em' | 'concluida'>): Promise<ListaCompras> {
  const { data, error } = await supabase
    .from('listas_compras')
    .insert({ ...lista, concluida: false })
    .select()
    .single();

  if (error) throw error;
  return data as ListaCompras;
}

export async function excluirLista(id: string): Promise<void> {
  const { error } = await supabase.from('listas_compras').delete().eq('id', id);
  if (error) throw error;
}

export async function buscarItens(listaId: string): Promise<ItemCompra[]> {
  const { data, error } = await supabase
    .from('itens_compra')
    .select('*')
    .eq('lista_id', listaId)
    .order('criado_em', { ascending: true });

  if (error) throw error;
  return (data as ItemCompra[]) || [];
}

export async function criarItem(item: Omit<ItemCompra, 'id' | 'criado_em'>): Promise<ItemCompra> {
  const { data, error } = await supabase
    .from('itens_compra')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data as ItemCompra;
}

export async function atualizarItem(id: string, updates: Partial<ItemCompra>): Promise<void> {
  const { error } = await supabase.from('itens_compra').update(updates).eq('id', id);
  if (error) throw error;
}

export async function excluirItem(id: string): Promise<void> {
  const { error } = await supabase.from('itens_compra').delete().eq('id', id);
  if (error) throw error;
}

import { supabase } from './supabase';
import type { ContaBancaria } from '../types';

export async function buscarContas(grupoId: string): Promise<ContaBancaria[]> {
  const { data, error } = await supabase
    .from('contas')
    .select('*')
    .eq('grupo_id', grupoId)
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (error) throw error;
  return (data as ContaBancaria[]) || [];
}

export async function criarConta(conta: Omit<ContaBancaria, 'id' | 'saldo_atual' | 'ativo'>): Promise<ContaBancaria> {
  const { data, error } = await supabase
    .from('contas')
    .insert({ ...conta, saldo_atual: conta.saldo_inicial, ativo: true })
    .select()
    .single();

  if (error) throw error;
  return data as ContaBancaria;
}

export async function atualizarConta(id: string, updates: Partial<ContaBancaria>): Promise<void> {
  const { error } = await supabase.from('contas').update(updates).eq('id', id);
  if (error) throw error;
}

export async function excluirConta(id: string): Promise<void> {
  const { error } = await supabase.from('contas').update({ ativo: false }).eq('id', id);
  if (error) throw error;
}

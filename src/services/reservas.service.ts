import { supabase } from './supabase';
import type { Reserva, ReservaMovimento } from '../types';

export async function buscarReservas(grupoId: string): Promise<Reserva[]> {
  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .eq('grupo_id', grupoId)
    .eq('ativo', true)
    .order('criado_em', { ascending: false });

  if (error) throw error;
  return (data as Reserva[]) || [];
}

export async function criarReserva(reserva: Omit<Reserva, 'id' | 'valor_atual' | 'ativo'>): Promise<Reserva> {
  const { data, error } = await supabase
    .from('reservas')
    .insert({ ...reserva, valor_atual: 0, ativo: true })
    .select()
    .single();

  if (error) throw error;
  return data as Reserva;
}

export async function atualizarReserva(id: string, updates: Partial<Reserva>): Promise<void> {
  const { error } = await supabase.from('reservas').update(updates).eq('id', id);
  if (error) throw error;
}

export async function excluirReserva(id: string): Promise<void> {
  const { error } = await supabase.from('reservas').update({ ativo: false }).eq('id', id);
  if (error) throw error;
}

export async function registrarMovimento(mov: Omit<ReservaMovimento, 'id' | 'criado_em'>): Promise<void> {
  const { error: movError } = await supabase.from('reservas_movimentos').insert(mov);
  if (movError) throw movError;

  // Atualiza saldo da reserva
  const { data: reserva } = await supabase.from('reservas').select('valor_atual').eq('id', mov.reserva_id).single();
  if (reserva) {
    const novoValor = mov.tipo === 'deposito'
      ? reserva.valor_atual + mov.valor
      : Math.max(reserva.valor_atual - mov.valor, 0);

    await supabase.from('reservas').update({ valor_atual: novoValor }).eq('id', mov.reserva_id);
  }
}

export async function buscarMovimentos(reservaId: string): Promise<ReservaMovimento[]> {
  const { data, error } = await supabase
    .from('reservas_movimentos')
    .select('*')
    .eq('reserva_id', reservaId)
    .order('criado_em', { ascending: false });

  if (error) throw error;
  return (data as ReservaMovimento[]) || [];
}

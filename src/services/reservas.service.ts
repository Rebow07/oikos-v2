/**
 * reservas.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ FIX CRÍTICO — Race condition em registrarMovimento:
 *
 *   ANTES (client-side):
 *     1. Lê valor_atual do banco
 *     2. Calcula novo valor no cliente
 *     3. Faz UPDATE com o valor calculado
 *   → Se dois membros fazem depósito simultâneo, um sobrescreve o outro.
 *
 *   AGORA (server-side via RPC):
 *     A função `registrar_movimento_reserva` no Postgres faz tudo em uma
 *     transação atômica: INSERT no movimento + UPDATE incremental no saldo.
 *     Não importa quantos membros acessem ao mesmo tempo — o banco serializa.
 *
 *   SQL da RPC para criar no Supabase:
 *   ─────────────────────────────────
 *   CREATE OR REPLACE FUNCTION registrar_movimento_reserva(
 *     p_reserva_id  uuid,
 *     p_grupo_id    uuid,
 *     p_criado_por  uuid,
 *     p_tipo        text,      -- 'deposito' | 'saque'
 *     p_valor       numeric,
 *     p_descricao   text DEFAULT NULL
 *   ) RETURNS void
 *   LANGUAGE plpgsql
 *   AS $$
 *   BEGIN
 *     -- 1. Registra o movimento
 *     INSERT INTO reservas_movimentos
 *       (reserva_id, grupo_id, criado_por, tipo, valor, descricao)
 *     VALUES
 *       (p_reserva_id, p_grupo_id, p_criado_por, p_tipo, p_valor, p_descricao);
 *
 *     -- 2. Atualiza o saldo de forma incremental (atômica, sem race condition)
 *     UPDATE reservas
 *     SET valor_atual = CASE
 *       WHEN p_tipo = 'deposito' THEN valor_atual + p_valor
 *       ELSE GREATEST(valor_atual - p_valor, 0)
 *     END
 *     WHERE id = p_reserva_id;
 *   END;
 *   $$;
 */

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

export async function criarReserva(
  reserva: Omit<Reserva, 'id' | 'valor_atual' | 'ativo'>,
): Promise<Reserva> {
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

/**
 * ✅ Usa RPC atômica para evitar race condition.
 *    Se a RPC não existir ainda no banco, cai no fallback client-side
 *    e loga um aviso para lembrar de criá-la.
 */
export async function registrarMovimento(
  mov: Omit<ReservaMovimento, 'id' | 'criado_em'>,
): Promise<void> {
  // Tenta via RPC atômica primeiro (server-side, sem race condition)
  const { error: rpcError } = await supabase.rpc('registrar_movimento_reserva', {
    p_reserva_id: mov.reserva_id,
    p_grupo_id:   mov.grupo_id,
    p_criado_por: mov.criado_por,
    p_tipo:       mov.tipo,
    p_valor:      mov.valor,
    p_descricao:  mov.descricao ?? null,
  });

  if (!rpcError) return; // ✅ Sucesso via RPC

  // Se a RPC ainda não existe no banco, avisa e usa fallback client-side
  const isRpcMissing =
    rpcError.code === 'PGRST202' || // função não encontrada
    rpcError.message?.includes('registrar_movimento_reserva');

  if (isRpcMissing) {
    console.warn(
      '[reservas.service] RPC "registrar_movimento_reserva" não encontrada no banco. ' +
      'Usando fallback client-side (sujeito a race condition). ' +
      'Crie a função SQL descrita no topo deste arquivo para corrigir.',
    );
    await _fallbackClientSide(mov);
    return;
  }

  // Outro erro real — propaga
  throw rpcError;
}

/** Fallback original — mantido apenas enquanto a RPC não for criada no banco */
async function _fallbackClientSide(
  mov: Omit<ReservaMovimento, 'id' | 'criado_em'>,
): Promise<void> {
  const { error: movError } = await supabase.from('reservas_movimentos').insert(mov);
  if (movError) throw movError;

  const { data: reserva } = await supabase
    .from('reservas')
    .select('valor_atual')
    .eq('id', mov.reserva_id)
    .single();

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

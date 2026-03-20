// ─────────────────────────────────────────────────────────────────────────────
// useTransacoes.ts
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useDataWithCache } from './useDataWithCache';
import { supabase } from '../services/supabase';
import { inicioDoMes, fimDoMes } from '../utils';
import { CACHE_KEYS } from '../context/CacheContext';
import type { Transacao } from '../types';

export function useTransacoes(tipo?: 'despesa' | 'renda') {
  const { grupoId, mesSelecionado, anoSelecionado } = useApp();

  const fetcher = useCallback(async (): Promise<Transacao[]> => {
    if (!grupoId) return [];
    const inicio = inicioDoMes(mesSelecionado, anoSelecionado);
    const fim    = fimDoMes(mesSelecionado, anoSelecionado);

    let query = supabase
      .from('transacoes')
      .select('*')
      .eq('grupo_id', grupoId)
      .gte('data', inicio)
      .lte('data', fim)
      .order('data', { ascending: false });

    if (tipo) query = query.eq('tipo', tipo);

    const { data, error } = await query;
    if (error) { console.error('Erro buscar transacoes:', error.message); return []; }
    return (data as Transacao[]) || [];
  }, [grupoId, mesSelecionado, anoSelecionado, tipo]);

  // ✅ Usa CACHE_KEYS centralizado — mesma chave que o CacheContext invalida
  const cacheKey = CACHE_KEYS.transacoes(grupoId, mesSelecionado, anoSelecionado, tipo || 'all');

  const { data, carregando, erro, recarregar } = useDataWithCache<Transacao[]>(
    fetcher,
    cacheKey,
    [grupoId, mesSelecionado, anoSelecionado, tipo],
  );

  const transacoes = data || [];

  const totais = useMemo(() => {
    const totalDespesas = transacoes.filter((t) => t.tipo === 'despesa').reduce((a, t) => a + Number(t.valor), 0);
    const totalReceitas = transacoes.filter((t) => t.tipo === 'renda').reduce((a, t) => a + Number(t.valor), 0);
    const totalPago     = transacoes.filter((t) => t.tipo === 'despesa' && t.pago).reduce((a, t) => a + Number(t.valor), 0);
    const totalAPagar   = transacoes.filter((t) => t.tipo === 'despesa' && !t.pago).reduce((a, t) => a + Number(t.valor), 0);
    return { totalDespesas, totalReceitas, saldo: totalReceitas - totalDespesas, totalPago, totalAPagar };
  }, [transacoes]);

  const porCategoria = useMemo(() => {
    const map = new Map<string, number>();
    transacoes.filter((t) => t.tipo === 'despesa').forEach((t) => {
      map.set(t.categoria, (map.get(t.categoria) || 0) + Number(t.valor));
    });
    return Array.from(map.entries()).map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor);
  }, [transacoes]);

  return { transacoes, carregando, erro, recarregar, ...totais, porCategoria };
}

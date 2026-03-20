// ─────────────────────────────────────────────────────────────────────────────
// useRecorrentes.ts
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useDataWithCache } from './useDataWithCache';
import { buscarRecorrentes } from '../services/recorrentes.service';
import { CACHE_KEYS } from '../context/CacheContext';
import type { Recorrente } from '../types';
 
export function useRecorrentes() {
  const { grupoId } = useApp();
 
  const fetcher = useCallback(async (): Promise<Recorrente[]> => {
    if (!grupoId) return [];
    return buscarRecorrentes(grupoId);
  }, [grupoId]);
 
  const { data, carregando, erro, recarregar } = useDataWithCache<Recorrente[]>(
    fetcher,
    CACHE_KEYS.recorrentes(grupoId),  // ✅ chave centralizada
    [grupoId],
  );
 
  const recorrentes = data || [];
  const ativos   = recorrentes.filter((r) => r.ativo);
  const pausados = recorrentes.filter((r) => !r.ativo);
  return { recorrentes, ativos, pausados, totalMensal: ativos.reduce((a, r) => a + r.valor, 0), carregando, erro, recarregar };
}

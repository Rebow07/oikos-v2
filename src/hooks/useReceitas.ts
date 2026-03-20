// ─────────────────────────────────────────────────────────────────────────────
// useReceitas.ts
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useDataWithCache } from './useDataWithCache';
import { buscarReceitas, calcularTotalReceitas } from '../services/receitas.service';
import { CACHE_KEYS } from '../context/CacheContext';
import type { Receita } from '../types';
 
export function useReceitas() {
  const { grupoId } = useApp();
 
  const fetcher = useCallback(async (): Promise<Receita[]> => {
    if (!grupoId) return [];
    return buscarReceitas(grupoId);
  }, [grupoId]);
 
  const { data, carregando, erro, recarregar } = useDataWithCache<Receita[]>(
    fetcher,
    CACHE_KEYS.receitas(grupoId),  // ✅ chave centralizada
    [grupoId],
  );
 
  const receitas = data || [];
  return { receitas, totalReceitas: calcularTotalReceitas(receitas), carregando, erro, recarregar };
}
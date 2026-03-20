import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useDataWithCache } from './useDataWithCache';
import { buscarReceitas, calcularTotalReceitas } from '../services/receitas.service';
import type { Receita } from '../types';

export function useReceitas() {
  const { grupoId } = useApp();

  const fetcher = useCallback(async (): Promise<Receita[]> => {
    if (!grupoId) return [];
    return buscarReceitas(grupoId);
  }, [grupoId]);

  const cacheKey = `receitas_${grupoId}`;

  const { data, carregando, erro, recarregar } = useDataWithCache<Receita[]>(
    fetcher,
    cacheKey,
    [grupoId],
  );

  const receitas = data || [];
  const totalReceitas = calcularTotalReceitas(receitas);

  return {
    receitas,
    totalReceitas,
    carregando,
    erro,
    recarregar,
  };
}

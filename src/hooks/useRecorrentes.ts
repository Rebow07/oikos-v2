import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useDataWithCache } from './useDataWithCache';
import { buscarRecorrentes } from '../services/recorrentes.service';
import type { Recorrente } from '../types';

export function useRecorrentes() {
  const { grupoId } = useApp();

  const fetcher = useCallback(async (): Promise<Recorrente[]> => {
    if (!grupoId) return [];
    return buscarRecorrentes(grupoId);
  }, [grupoId]);

  const { data, carregando, erro, recarregar } = useDataWithCache<Recorrente[]>(
    fetcher,
    `recorrentes_${grupoId}`,
    [grupoId],
  );

  const recorrentes = data || [];
  const ativos = recorrentes.filter((r) => r.ativo);
  const pausados = recorrentes.filter((r) => !r.ativo);
  const totalMensal = ativos.reduce((acc, r) => acc + r.valor, 0);

  return { recorrentes, ativos, pausados, totalMensal, carregando, erro, recarregar };
}

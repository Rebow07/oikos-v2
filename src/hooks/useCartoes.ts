import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useDataWithCache } from './useDataWithCache';
import { buscarCartoes } from '../services/cartoes.service';
import type { Cartao } from '../types';

export function useCartoes() {
  const { grupoId } = useApp();

  const fetcher = useCallback(async (): Promise<Cartao[]> => {
    if (!grupoId) return [];
    return buscarCartoes(grupoId);
  }, [grupoId]);

  const { data, carregando, erro, recarregar } = useDataWithCache<Cartao[]>(
    fetcher,
    `cartoes_${grupoId}`,
    [grupoId],
  );

  return { cartoes: data || [], carregando, erro, recarregar };
}

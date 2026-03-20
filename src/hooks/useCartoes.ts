import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useDataWithCache } from './useDataWithCache';
import { buscarCartoes } from '../services/cartoes.service';
import { CACHE_KEYS } from '../context/CacheContext';
import type { Cartao } from '../types';
 
export function useCartoes() {
  const { grupoId } = useApp();
 
  const fetcher = useCallback(async (): Promise<Cartao[]> => {
    if (!grupoId) return [];
    return buscarCartoes(grupoId);
  }, [grupoId]);
 
  const { data, carregando, erro, recarregar } = useDataWithCache<Cartao[]>(
    fetcher,
    CACHE_KEYS.cartoes(grupoId),  // ✅ chave centralizada
    [grupoId],
  );
 
  return { cartoes: data || [], carregando, erro, recarregar };
}
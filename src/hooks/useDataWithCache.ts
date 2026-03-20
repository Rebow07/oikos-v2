/**
 * useDataWithCache
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook genérico de fetch com:
 *  - Stale-while-revalidate (exibe cache enquanto busca dado fresco)
 *  - Re-fetch ao voltar do background (debounced)
 *  - Atualização otimista via setLocal()
 *  - Invalidação reativa via CacheInvalidationContext
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getCache, setCache } from '../services/cache.service';
import { useCacheInvalidation } from '../context/CacheContext';

interface UseDataResult<T> {
  data: T | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
  /** Atualiza o estado local imediatamente (otimista) sem esperar fetch */
  setLocal: (updater: T | ((prev: T | null) => T | null)) => void;
}

export function useDataWithCache<T>(
  fetcher: () => Promise<T>,
  cacheKey: string,
  deps: any[],
): UseDataResult<T> {
  const [data, setData]         = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]         = useState<string | null>(null);
  const mountedRef              = useRef(true);
  const fetchingRef             = useRef(false);
  
  // Guarda a versão que triggou o último fetch para comparar
  const lastVersionRef          = useRef(-1);

  // Acessa o sistema de invalidação global
  const { getVersion, subscribe } = useCacheInvalidation();

  // ── Função central de carga ─────────────────────────────────────────────────

  const carregar = useCallback(async (usarCache = true) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      setErro(null);

      // 1. Exibe cache imediatamente (stale-while-revalidate)
      if (usarCache && cacheKey) {
        const cached = await getCache<T>(cacheKey);
        if (cached && mountedRef.current) {
          setData(cached);
          setCarregando(false);
          // Continua para buscar dado fresco em background
        }
      }

      // 2. Fetch dado fresco da rede
      const resultado = await fetcher();
      if (mountedRef.current) {
        setData(resultado);
        setCarregando(false);
        if (cacheKey) setCache(cacheKey, resultado);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        // Só exibe erro se não havia cache para mostrar
        if (data === null) {
          setErro(err.message || 'Erro ao carregar dados');
        }
        setCarregando(false);
      }
    } finally {
      fetchingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, fetcher]);

  const recarregar = useCallback(async () => {
    await carregar(false);
  }, [carregar]);

  // ── Atualização otimista ────────────────────────────────────────────────────

  const setLocal = useCallback((updater: T | ((prev: T | null) => T | null)) => {
    setData((prev) => {
      const next = typeof updater === 'function'
        ? (updater as (prev: T | null) => T | null)(prev)
        : updater;
      if (next !== null && cacheKey) setCache(cacheKey, next);
      return next;
    });
  }, [cacheKey]);

  // ── Fetch inicial / mudança de deps ────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;
    // Sincroniza versão atual para não disparar duas vezes no mount
    lastVersionRef.current = getVersion(cacheKey);
    carregar(true);
    return () => {
      mountedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // ── Re-fetch reativo quando a chave for invalidada ─────────────────

  useEffect(() => {
    if (!cacheKey) return;

    const unsubscribe = subscribe(cacheKey, () => {
      const novaVersao = getVersion(cacheKey);
      // Evita re-fetch duplicado se a versão não mudou de fato
      if (novaVersao === lastVersionRef.current) return;
      lastVersionRef.current = novaVersao;
      carregar(false); // false = ignora cache, busca dado fresco
    });

    return unsubscribe;
  }, [cacheKey, subscribe, getVersion, carregar]);

  // ── Re-fetch ao voltar do background (debounced) ────────────────────────────

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const handleState = (state: AppStateStatus) => {
      if (state === 'active') {
        clearTimeout(timeout);
        timeout = setTimeout(() => carregar(false), 500);
      }
    };
    const sub = AppState.addEventListener('change', handleState);
    return () => {
      sub.remove();
      clearTimeout(timeout);
    };
  }, [carregar]);

  return { data, carregando, erro, recarregar, setLocal };
}
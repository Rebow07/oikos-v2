/**
 * useDataWithCache
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook genérico de fetch com:
 *  - Stale-while-revalidate (exibe cache enquanto busca dado fresco)
 *  - Re-fetch ao voltar do background (debounced)
 *  - Atualização otimista via setLocal()
 *  - ✅ NOVO: Invalidação reativa via CacheInvalidationContext
 *             Quando qualquer parte do app chama invalidar(cacheKey),
 *             este hook re-fetcha automaticamente — sem TTL fixo.
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
<<<<<<< HEAD
  const [erro, setErro] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  const carregar = useCallback(async (usarCache = true) => {
    // Evita fetches duplicados simultâneos
=======
  const [erro, setErro]         = useState<string | null>(null);
  const mountedRef              = useRef(true);
  const fetchingRef             = useRef(false);
  // Guarda a versão que triggou o último fetch para comparar
  const lastVersionRef          = useRef(-1);

  // ✅ NOVO: acessa o sistema de invalidação global
  const { getVersion, subscribe } = useCacheInvalidation();

  // ── Função central de carga ─────────────────────────────────────────────────

  const carregar = useCallback(async (usarCache = true) => {
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      setErro(null);

<<<<<<< HEAD
      // 1. Mostra cache IMEDIATAMENTE (stale-while-revalidate)
=======
      // 1. Exibe cache imediatamente (stale-while-revalidate)
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
      if (usarCache && cacheKey) {
        const cached = await getCache<T>(cacheKey);
        if (cached && mountedRef.current) {
          setData(cached);
          setCarregando(false);
<<<<<<< HEAD
          // NÃO retorna — segue para o fetch em background
        }
      }

      // 2. Fetch dados frescos (em paralelo ou sequencial)
=======
          // Continua para buscar dado fresco em background
        }
      }

      // 2. Fetch dado fresco da rede
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
      const resultado = await fetcher();
      if (mountedRef.current) {
        setData(resultado);
        setCarregando(false);
        if (cacheKey) setCache(cacheKey, resultado);
      }
    } catch (err: any) {
      if (mountedRef.current) {
<<<<<<< HEAD
        // Só mostra erro se não tinha cache
=======
        // Só exibe erro se não havia cache para mostrar
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
        if (data === null) {
          setErro(err.message || 'Erro ao carregar dados');
        }
        setCarregando(false);
      }
    } finally {
      fetchingRef.current = false;
    }
<<<<<<< HEAD
  }, [cacheKey, fetcher]); // eslint-disable-line react-hooks/exhaustive-deps
=======
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, fetcher]);
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)

  const recarregar = useCallback(async () => {
    await carregar(false);
  }, [carregar]);

<<<<<<< HEAD
  /** Atualização otimista — altera estado local + cache sem esperar rede */
=======
  // ── Atualização otimista ────────────────────────────────────────────────────

>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
  const setLocal = useCallback((updater: T | ((prev: T | null) => T | null)) => {
    setData((prev) => {
      const next = typeof updater === 'function'
        ? (updater as (prev: T | null) => T | null)(prev)
        : updater;
<<<<<<< HEAD
      // Atualiza cache em background
      if (next !== null && cacheKey) {
        setCache(cacheKey, next);
      }
=======
      if (next !== null && cacheKey) setCache(cacheKey, next);
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
      return next;
    });
  }, [cacheKey]);

<<<<<<< HEAD
  // Fetch on mount / deps change
=======
  // ── Fetch inicial / mudança de deps ────────────────────────────────────────

>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
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

  // ── ✅ NOVO: Re-fetch reativo quando a chave for invalidada ─────────────────

<<<<<<< HEAD
  // Refresh on app foreground (com debounce de 2s para evitar spam)
  useEffect(() => {
=======
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
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
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

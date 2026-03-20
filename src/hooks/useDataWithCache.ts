import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getCache, setCache } from '../services/cache.service';

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
  const [data, setData] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  const carregar = useCallback(async (usarCache = true) => {
    // Evita fetches duplicados simultâneos
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      setErro(null);

      // 1. Mostra cache IMEDIATAMENTE (stale-while-revalidate)
      if (usarCache && cacheKey) {
        const cached = await getCache<T>(cacheKey);
        if (cached && mountedRef.current) {
          setData(cached);
          setCarregando(false);
          // NÃO retorna — segue para o fetch em background
        }
      }

      // 2. Fetch dados frescos (em paralelo ou sequencial)
      const resultado = await fetcher();
      if (mountedRef.current) {
        setData(resultado);
        setCarregando(false);
        if (cacheKey) setCache(cacheKey, resultado);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        // Só mostra erro se não tinha cache
        if (data === null) {
          setErro(err.message || 'Erro ao carregar dados');
        }
        setCarregando(false);
      }
    } finally {
      fetchingRef.current = false;
    }
  }, [cacheKey, fetcher]); // eslint-disable-line react-hooks/exhaustive-deps

  const recarregar = useCallback(async () => {
    await carregar(false);
  }, [carregar]);

  /** Atualização otimista — altera estado local + cache sem esperar rede */
  const setLocal = useCallback((updater: T | ((prev: T | null) => T | null)) => {
    setData((prev) => {
      const next = typeof updater === 'function'
        ? (updater as (prev: T | null) => T | null)(prev)
        : updater;
      // Atualiza cache em background
      if (next !== null && cacheKey) {
        setCache(cacheKey, next);
      }
      return next;
    });
  }, [cacheKey]);

  // Fetch on mount / deps change
  useEffect(() => {
    mountedRef.current = true;
    carregar(true);
    return () => {
      mountedRef.current = false;
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh on app foreground (com debounce de 2s para evitar spam)
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

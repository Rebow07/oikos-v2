/**
 * CacheContext
 * ─────────────────────────────────────────────────────────────────────────────
 * Gerencia a invalidação de cache entre hooks de forma desacoplada.
 *
 * PROBLEMA RESOLVIDO:
 *   Hoje, ao criar/editar/excluir dados, o cache só expira via TTL (5 min) ou
 *   pull-to-refresh manual. Isso faz o usuário ver dados desatualizados.
 *
 * SOLUÇÃO:
 *   Um Map global de "versões" por chave de cache. Quando uma chave é
 *   invalidada, sua versão incrementa. O useDataWithCache observa a versão
 *   e re-fetcha automaticamente.
 *
 * USO:
 *   // Em qualquer serviço ou componente, após mutar dados:
 *   const { invalidar, invalidarPorPrefixo } = useCacheInvalidation();
 *
 *   await criarTransacao(...);
 *   invalidarPorPrefixo('trans_');          // invalida todos os meses/tipos
 *
 *   await criarCartao(...);
 *   invalidar(`cartoes_${grupoId}`);        // invalida só cartões
 */

import React, {
  createContext, useContext, useCallback, useRef, ReactNode,
} from 'react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Listener = () => void;

interface CacheInvalidationContextData {
  /** Retorna a versão atual de uma chave (incrementa a cada invalidação) */
  getVersion: (key: string) => number;
  /** Invalida uma chave exata — hooks que a observam re-fetcham */
  invalidar: (key: string) => void;
  /** Invalida todas as chaves que começam com o prefixo dado */
  invalidarPorPrefixo: (prefix: string) => void;
  /** Invalida múltiplas chaves de uma vez */
  invalidarVarias: (keys: string[]) => void;
  /** (interno) Registra listener para uma chave — usado pelo useDataWithCache */
  subscribe: (key: string, fn: Listener) => () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CacheInvalidationContext = createContext<CacheInvalidationContextData>(
  {} as CacheInvalidationContextData,
);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CacheInvalidationProvider({ children }: { children: ReactNode }) {
  // Map de chave → versão (número que cresce a cada invalidação)
  const versionsRef = useRef<Map<string, number>>(new Map());
  // Map de chave → Set de listeners
  const listenersRef = useRef<Map<string, Set<Listener>>>(new Map());

  const notificar = useCallback((key: string) => {
    const vers = versionsRef.current;
    vers.set(key, (vers.get(key) ?? 0) + 1);
    listenersRef.current.get(key)?.forEach((fn) => fn());
  }, []);

  const invalidar = useCallback((key: string) => {
    notificar(key);
  }, [notificar]);

  const invalidarPorPrefixo = useCallback((prefix: string) => {
    const keysAtivas = Array.from(listenersRef.current.keys()).filter((k) =>
      k.startsWith(prefix),
    );
    // Também invalida chaves que ainda não têm listeners mas estão no mapa de versões
    const keysVers = Array.from(versionsRef.current.keys()).filter((k) =>
      k.startsWith(prefix),
    );
    const todas = new Set([...keysAtivas, ...keysVers]);
    todas.forEach((k) => notificar(k));
  }, [notificar]);

  const invalidarVarias = useCallback((keys: string[]) => {
    keys.forEach((k) => notificar(k));
  }, [notificar]);

  const getVersion = useCallback((key: string) => {
    return versionsRef.current.get(key) ?? 0;
  }, []);

  const subscribe = useCallback((key: string, fn: Listener) => {
    const map = listenersRef.current;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(fn);
    return () => {
      map.get(key)?.delete(fn);
    };
  }, []);

  return (
    <CacheInvalidationContext.Provider
      value={{ getVersion, invalidar, invalidarPorPrefixo, invalidarVarias, subscribe }}
    >
      {children}
    </CacheInvalidationContext.Provider>
  );
}

// ─── Hook de consumo ──────────────────────────────────────────────────────────

export function useCacheInvalidation() {
  return useContext(CacheInvalidationContext);
}

// ─── Mapa de prefixos por entidade (centralizado para evitar typos) ───────────

/**
 * Use estas constantes em vez de strings literais para invalidar cache.
 *
 * Exemplos:
 *   invalidar(CACHE_KEYS.cartoes(grupoId))
 *   invalidarPorPrefixo(CACHE_KEYS.transacoesPrefixo(grupoId))
 */
export const CACHE_KEYS = {
  cartoes:              (grupoId: string) => `cartoes_${grupoId}`,
  receitas:             (grupoId: string) => `receitas_${grupoId}`,
  recorrentes:          (grupoId: string) => `recorrentes_${grupoId}`,
  transacoes:           (grupoId: string, mes: number, ano: number, tipo = 'all') =>
                          `trans_${grupoId}_${mes}_${ano}_${tipo}`,
  // Prefixos — para invalidar todas as variações de um grupo
  transacoesPrefixo:    (grupoId: string) => `trans_${grupoId}_`,
  cartoesPrefixo:       (grupoId: string) => `cartoes_${grupoId}`,
  receitasPrefixo:      (grupoId: string) => `receitas_${grupoId}`,
  recorrentesPrefixo:   (grupoId: string) => `recorrentes_${grupoId}`,
  // Invalida tudo de um grupo de uma vez
  tudoDoGrupo:          (grupoId: string) => [
    `trans_${grupoId}_`,
    `cartoes_${grupoId}`,
    `receitas_${grupoId}`,
    `recorrentes_${grupoId}`,
  ],
} as const;

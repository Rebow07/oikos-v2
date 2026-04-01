/**
 * SyncContext.tsx — Provider React para gerenciar sync automático
 * ───────────────────────────────────────────────────────────────
 * Monitora conectividade, auto-sync ao reconectar, sync periódico.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import { useApp } from '../../context/AppContext';
import { initDatabase } from '../database';
import {
  syncAll,
  getPendingCount,
  getLastSyncTime,
  initialSync,
  isInitialSyncDone,
} from './SyncEngine';

interface SyncContextValue {
  /** Se o banco local está pronto para uso */
  dbReady: boolean;
  /** Se está online agora */
  isOnline: boolean;
  /** Se está sincronizando agora */
  isSyncing: boolean;
  /** Número de registros pendentes de sync */
  pendingCount: number;
  /** Timestamp do último sync bem-sucedido */
  lastSyncAt: string | null;
  /** Força um sync manual agora */
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue>({
  dbReady: false,
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  syncNow: async () => {},
});

export function useSyncStatus() {
  return useContext(SyncContext);
}

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { grupoId } = useApp();
  const [dbReady, setDbReady] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasOfflineRef = useRef(false);

  // ── 1. Inicializar banco ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        setDbReady(true);
        console.log('[SyncProvider] Banco SQLite pronto');
      } catch (err) {
        console.error('[SyncProvider] Erro ao inicializar banco:', err);
      }
    })();
  }, []);

  // ── 2. Monitorar conectividade ──────────────────────────────────────
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = !!(state.isConnected && state.isInternetReachable);

      // Se estava offline e agora está online → sync imediato
      if (!isOnline && online && dbReady && grupoId) {
        wasOfflineRef.current = true;
      }

      setIsOnline(online);
    });

    return () => unsubscribe();
  }, [isOnline, dbReady, grupoId]);

  // ── 3. Sync ao reconectar ──────────────────────────────────────────
  useEffect(() => {
    if (wasOfflineRef.current && isOnline && dbReady && grupoId) {
      wasOfflineRef.current = false;
      console.log('[SyncProvider] Reconectou — sincronizando...');
      doSync();
    }
  }, [isOnline, dbReady, grupoId]);

  // ── 4. Sync inicial (primeiro uso) ─────────────────────────────────
  useEffect(() => {
    if (!dbReady || !grupoId || !isOnline) return;

    (async () => {
      const done = await isInitialSyncDone();
      if (!done) {
        console.log('[SyncProvider] Primeiro uso — download inicial...');
        setIsSyncing(true);
        try {
          await initialSync(grupoId);
        } finally {
          setIsSyncing(false);
          await refreshMeta();
        }
      }
    })();
  }, [dbReady, grupoId, isOnline]);

  // ── 5. Sync periódico (a cada 5 min quando online) ─────────────────
  useEffect(() => {
    if (!dbReady || !isOnline || !grupoId) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    syncIntervalRef.current = setInterval(() => {
      doSync();
    }, SYNC_INTERVAL_MS);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [dbReady, isOnline, grupoId]);

  // ── 6. Sync ao voltar pro app ──────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active' && dbReady && isOnline && grupoId) {
        doSync();
      }
    });
    return () => sub.remove();
  }, [dbReady, isOnline, grupoId]);

  // ── Helpers ────────────────────────────────────────────────────────

  const refreshMeta = useCallback(async () => {
    try {
      const count = await getPendingCount();
      const last = await getLastSyncTime();
      setPendingCount(count);
      setLastSyncAt(last);
    } catch {
      // ignore
    }
  }, []);

  const doSync = useCallback(async () => {
    if (isSyncing || !grupoId || !isOnline) return;

    setIsSyncing(true);
    try {
      await syncAll(grupoId);
    } catch (err) {
      console.error('[SyncProvider] Erro no sync:', err);
    } finally {
      setIsSyncing(false);
      await refreshMeta();
    }
  }, [isSyncing, grupoId, isOnline, refreshMeta]);

  const syncNow = useCallback(async () => {
    await doSync();
  }, [doSync]);

  return (
    <SyncContext.Provider
      value={{ dbReady, isOnline, isSyncing, pendingCount, lastSyncAt, syncNow }}
    >
      {children}
    </SyncContext.Provider>
  );
}

import React, {
  createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { gerarRecorrentes } from '../services/recorrentes.service';
import type { Grupo, GrupoItem, Membro, FiltroTempo } from '../types';

interface AppContextData {
  sessao: any | null;
  usuario: any | null;
  carregandoAuth: boolean;
  sair: () => Promise<void>;
  grupo: Grupo | null;
  grupoId: string;
  carregandoGrupo: boolean;
  membros: Membro[];
  qtdMembros: number;
  nomeUsuario: string;
  // ✅ agora retorna Promise para que o chamador saiba quando terminou
  setNomeUsuario: (nome: string) => Promise<void>;
  getNomeMembro: (userId: string) => string;
  mesSelecionado: number;
  setMesSelecionado: (m: number) => void;
  anoSelecionado: number;
  setAnoSelecionado: (a: number) => void;
  orcamentoMensal: number;
  setOrcamentoMensal: (v: number) => void;
  todosOsGrupos: GrupoItem[];
  trocarGrupo: (id: string) => Promise<void>;
  filtroTempo: FiltroTempo;
  setFiltroTempo: (f: FiltroTempo) => void;
}

const AppContext = createContext<AppContextData>({} as AppContextData);
const KEYS = { GRUPO_ID: '@rebow_grupo_id', ORCAMENTO: '@rebow_orcamento', NOME: '@rebow_nome_usuario' };
const DEFAULT_GRUPO_ID = process.env.EXPO_PUBLIC_DEFAULT_GRUPO_ID || '';

export function AppProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao]                   = useState<any | null>(null);
  const [usuario, setUsuario]                 = useState<any | null>(null);
  const [carregandoAuth, setCarregandoAuth]   = useState(true);
  const [grupo, setGrupo]                     = useState<Grupo | null>(null);
  const [grupoId, setGrupoId]                 = useState(DEFAULT_GRUPO_ID);
  const [carregandoGrupo, setCarregandoGrupo] = useState(true);
  const [todosOsGrupos, setTodosOsGrupos]     = useState<GrupoItem[]>([]);
  const [membros, setMembros]                 = useState<Membro[]>([]);
  const [nomeUsuario, setNomeUsuarioState]     = useState('');
  const agora = new Date();
  const [mesSelecionado, setMesSelecionado]   = useState(agora.getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado]   = useState(agora.getFullYear());
  const [orcamentoMensal, setOrcamentoMensalState] = useState(0);
  const [filtroTempo, setFiltroTempo]         = useState<FiltroTempo>('mensal');

  // Flag para geração automática de recorrentes (uma vez por sessão)
  const autoGenRef = useRef(false);

  // ── Auth ────────────────────────────────────────────────────────────────────

  // Flag para geração automática de recorrentes (uma vez por sessão)
  const autoGenRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session);
      setUsuario(session?.user ?? null);
      setCarregandoAuth(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSessao(session);
      setUsuario(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── AsyncStorage inicial ────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEYS.GRUPO_ID),
      AsyncStorage.getItem(KEYS.ORCAMENTO),
      AsyncStorage.getItem(KEYS.NOME),
    ]).then(([g, o, n]) => {
      if (g) setGrupoId(g);
      if (o) setOrcamentoMensalState(Number(o));
      if (n) setNomeUsuarioState(n);
    });
  }, []);

  // ── Carregar grupo + membros ────────────────────────────────────────────────

  const carregarGrupo = useCallback(async () => {
    if (!grupoId || !usuario) { setCarregandoGrupo(false); return; }
    try {
      setCarregandoGrupo(true);

      const { data: grupoData } = await supabase
        .from('grupos')
        .select('*')
        .eq('id', grupoId)
        .single();
      if (grupoData) setGrupo(grupoData);

      const { data: membrosDir, error: membrosErr } = await supabase
        .from('membros')
        .select('user_id, nome, grupo_ativo')
        .eq('grupo_id', grupoId);

      if (membrosErr) {
        console.error('Erro buscar membros:', membrosErr.message);
      } else if (membrosDir) {
        const result = membrosDir
          .filter((m: any) => m.grupo_ativo !== false)
          .map((m: any) => ({ user_id: m.user_id, nome: m.nome || 'Sem nome' }));
        setMembros(result);

<<<<<<< HEAD
=======
        // Sincroniza nome do usuário logado a partir do banco (fonte de verdade)
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
        const eu = result.find((m: Membro) => m.user_id === usuario.id);
        if (eu && eu.nome && eu.nome !== 'Sem nome' && eu.nome !== 'Novo membro') {
          setNomeUsuarioState(eu.nome);
          AsyncStorage.setItem(KEYS.NOME, eu.nome).catch(() => {});
        }
      }

      // Geração automática de recorrentes (uma vez por sessão)
      if (!autoGenRef.current) {
        autoGenRef.current = true;
        try {
          const qtd = await gerarRecorrentes(grupoId);
<<<<<<< HEAD
          if (qtd > 0) {
            console.log(`Auto-geradas ${qtd} despesas recorrentes`);
          }
=======
          if (qtd > 0) console.log(`Auto-geradas ${qtd} despesas recorrentes`);
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
        } catch (err) {
          console.error('Erro auto-gerar recorrentes:', err);
        }
      }
    } catch (err) {
      console.error('Erro carregar grupo:', err);
    } finally {
      setCarregandoGrupo(false);
    }
  }, [grupoId, usuario]);

  useEffect(() => { if (usuario) carregarGrupo(); }, [usuario, grupoId, carregarGrupo]);

  // ── Listar todos os grupos do usuário ───────────────────────────────────────

  useEffect(() => {
    if (!usuario) return;
    (async () => {
      try {
        const { data } = await supabase.rpc('listar_grupos_usuario', { p_user_id: usuario.id });
        if (data) setTodosOsGrupos(data);
      } catch {
        // Fallback: busca manual
        const { data: memData } = await supabase
          .from('membros')
          .select('grupo_id')
          .eq('user_id', usuario.id)
          .eq('grupo_ativo', true);
        if (memData) {
          const ids = memData.map((m: any) => m.grupo_id);
          const { data: g } = await supabase.from('grupos').select('id, nome').in('id', ids);
          if (g) setTodosOsGrupos(g);
        }
      }
    })();
  }, [usuario]);

  // ── Recarrega ao voltar do background ──────────────────────────────────────

  useEffect(() => {
    const h = (state: AppStateStatus) => { if (state === 'active' && usuario) carregarGrupo(); };
    const sub = AppState.addEventListener('change', h);
    return () => sub.remove();
  }, [usuario, carregarGrupo]);

<<<<<<< HEAD
=======
  // ── Ações ───────────────────────────────────────────────────────────────────

>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
  const sair = useCallback(async () => {
    await supabase.auth.signOut();
    setSessao(null);
    setUsuario(null);
<<<<<<< HEAD
    autoGenRef.current = false;
  }, []);

  const trocarGrupo = useCallback(async (id: string) => {
    setGrupoId(id);
    autoGenRef.current = false; // Permitir auto-gerar no novo grupo
    await AsyncStorage.setItem(KEYS.GRUPO_ID, id);
  }, []);

  const setOrcamentoMensal = useCallback((v: number) => { setOrcamentoMensalState(v); AsyncStorage.setItem(KEYS.ORCAMENTO, String(v)).catch(() => {}); }, []);
  const setNomeUsuario = useCallback((n: string) => { setNomeUsuarioState(n); AsyncStorage.setItem(KEYS.NOME, n).catch(() => {}); }, []);
=======
    setNomeUsuarioState('');
    autoGenRef.current = false;
  }, []);

  // ✅ FIX: trocarGrupo tinha "nome" na assinatura mas nunca usava — removido
  const trocarGrupo = useCallback(async (id: string) => {
    setGrupoId(id);
    autoGenRef.current = false;
    await AsyncStorage.setItem(KEYS.GRUPO_ID, id);
  }, []);

  const setOrcamentoMensal = useCallback((v: number) => {
    setOrcamentoMensalState(v);
    AsyncStorage.setItem(KEYS.ORCAMENTO, String(v)).catch(() => {});
  }, []);

  /**
   * ✅ FIX PRINCIPAL — Persistência de nome em 3 camadas:
   *   1. Estado local (React) — imediato, UI atualiza na hora
   *   2. AsyncStorage          — persiste offline / próxima abertura
   *   3. Supabase tabela membros — fonte de verdade, sincroniza entre dispositivos
   *
   * Retorna Promise para que a tela de configurações possa exibir feedback
   * de sucesso/erro sem ficar "no escuro".
   */
  const setNomeUsuario = useCallback(async (nome: string): Promise<void> => {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return;

    // 1. Estado local — instantâneo
    setNomeUsuarioState(nomeLimpo);

    // 2. AsyncStorage — offline/cache
    AsyncStorage.setItem(KEYS.NOME, nomeLimpo).catch(() => {});

    // 3. Supabase — fonte de verdade entre dispositivos
    if (usuario?.id && grupoId) {
      const { error } = await supabase
        .from('membros')
        .update({ nome: nomeLimpo })
        .eq('user_id', usuario.id)
        .eq('grupo_id', grupoId);

      if (error) {
        console.error('Erro ao salvar nome no banco:', error.message);
        // Re-lança para que a tela possa exibir Alert/Toast de erro
        throw new Error('Não foi possível salvar o nome. Tente novamente.');
      }
    }
  }, [usuario, grupoId]);
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)

  const getNomeMembro = useCallback((userId: string): string => {
    const m = membros.find((mb) => mb.user_id === userId);
    return m?.nome || 'Desconhecido';
  }, [membros]);

  const qtdMembros = membros.length;

  // ── Context value ───────────────────────────────────────────────────────────

  const value = useMemo<AppContextData>(() => ({
    sessao, usuario, carregandoAuth, sair,
    grupo, grupoId, carregandoGrupo,
    membros, qtdMembros, nomeUsuario, setNomeUsuario, getNomeMembro,
    mesSelecionado, setMesSelecionado, anoSelecionado, setAnoSelecionado,
    orcamentoMensal, setOrcamentoMensal,
    todosOsGrupos, trocarGrupo,
    filtroTempo, setFiltroTempo,
  }), [
    sessao, usuario, carregandoAuth, sair,
    grupo, grupoId, carregandoGrupo,
    membros, qtdMembros, nomeUsuario, setNomeUsuario, getNomeMembro,
    mesSelecionado, anoSelecionado,
    orcamentoMensal, setOrcamentoMensal,
    todosOsGrupos, trocarGrupo,
    filtroTempo,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() { return useContext(AppContext); }
export default AppContext;

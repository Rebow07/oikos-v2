import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, SectionList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X, ArrowDownCircle, ArrowUpCircle, FileText, CheckSquare, ShoppingBag } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabase';
import { formatarMoeda, formatarData } from '../utils';
import { CATEGORIAS } from '../constants';
import type { Transacao, Nota, ItemCompra } from '../types';

type ResultadoTipo = 'transacao' | 'nota' | 'compra';
interface Resultado {
  id: string;
  tipo: ResultadoTipo;
  titulo: string;
  subtitulo: string;
  valor?: number;
  cor?: string;
  raw: any;
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm,
    },
    searchWrap: {
      flex: 1, flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.surface, borderRadius: Radius.md,
      paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: C.border,
    },
    searchInput: {
      flex: 1, paddingVertical: Spacing.md,
      fontSize: FontSize.md, color: C.textPrimary, marginLeft: Spacing.sm,
    },
    cancelBtn: { paddingHorizontal: Spacing.sm },
    cancelText: { color: C.primary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
    sectionHeader: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
      backgroundColor: C.background,
    },
    sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
    sectionCount: { fontSize: FontSize.xs, color: C.textMuted },
    resultItem: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
    },
    iconWrap: {
      width: 36, height: 36, borderRadius: 18,
      justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
    },
    resultContent: { flex: 1 },
    resultTitulo: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: C.textPrimary },
    resultSub: { fontSize: FontSize.xs, color: C.textMuted, marginTop: 2 },
    resultValor: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
    emptyWrap: { flex: 1, alignItems: 'center', paddingTop: Spacing.xxl * 2 },
    emptyIcon: { marginBottom: Spacing.md },
    emptyText: { fontSize: FontSize.md, color: C.textMuted },
    emptyHint: { fontSize: FontSize.sm, color: C.textMuted, marginTop: Spacing.xs },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  });
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function BuscaGlobalScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = useMemo(() => makeStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { grupoId } = useApp();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const debouncedQuery = useDebounce(query, 350);

  const buscar = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) { setResultados([]); return; }
    setLoading(true);
    try {
      const termo = `%${q.trim()}%`;

      const [{ data: transData }, { data: notasData }, { data: comprasData }] = await Promise.all([
        supabase.from('transacoes').select('*').eq('grupo_id', grupoId)
          .or(`titulo.ilike.${termo},categoria.ilike.${termo}`)
          .order('data', { ascending: false }).limit(20),
        supabase.from('notas').select('*').eq('grupo_id', grupoId)
          .or(`titulo.ilike.${termo},conteudo.ilike.${termo}`)
          .order('criado_em', { ascending: false }).limit(10),
        supabase.from('itens_compra').select('*').eq('grupo_id', grupoId)
          .ilike('nome', termo).order('criado_em', { ascending: false }).limit(10),
      ]);

      const lista: Resultado[] = [];

      (transData as Transacao[] || []).forEach((t) => {
        const cat = CATEGORIAS.find((c) => c.id === t.categoria);
        lista.push({
          id: t.id, tipo: 'transacao',
          titulo: t.titulo,
          subtitulo: `${formatarData(t.data)} · ${cat?.label || t.categoria}`,
          valor: t.valor,
          cor: t.tipo === 'despesa' ? Colors.despesa : Colors.renda,
          raw: t,
        });
      });

      (notasData as Nota[] || []).forEach((n) => {
        lista.push({
          id: n.id, tipo: 'nota',
          titulo: n.titulo,
          subtitulo: n.tipo === 'tarefa' ? (n.concluida ? 'Tarefa — Concluída' : 'Tarefa — Pendente') : 'Nota',
          raw: n,
        });
      });

      (comprasData as any[] || []).forEach((i) => {
        lista.push({
          id: i.id, tipo: 'compra',
          titulo: i.nome,
          subtitulo: `Qtd: ${i.quantidade}${i.valor_unitario ? ` · ${formatarMoeda(i.valor_unitario)}` : ''}`,
          raw: i,
        });
      });

      setResultados(lista);
    } finally {
      setLoading(false);
    }
  }, [grupoId, Colors]);

  useEffect(() => { buscar(debouncedQuery); }, [debouncedQuery, buscar]);

  const sections = useMemo(() => {
    const transacoes = resultados.filter((r) => r.tipo === 'transacao');
    const notas = resultados.filter((r) => r.tipo === 'nota');
    const compras = resultados.filter((r) => r.tipo === 'compra');
    const secs = [];
    if (transacoes.length > 0) secs.push({ title: 'Transações', count: transacoes.length, data: transacoes });
    if (notas.length > 0)     secs.push({ title: 'Notas & Tarefas', count: notas.length, data: notas });
    if (compras.length > 0)   secs.push({ title: 'Lista de Compras', count: compras.length, data: compras });
    return secs;
  }, [resultados]);

  const handlePress = (r: Resultado) => {
    if (r.tipo === 'transacao') navigation.navigate('DetalheTransacao', { transacaoId: r.id });
  };

  const renderItem = ({ item }: { item: Resultado }) => {
    let icon = <ArrowDownCircle size={18} color={item.cor || Colors.textMuted} />;
    let bg = (item.cor || Colors.primary) + '18';
    if (item.tipo === 'transacao' && item.raw.tipo === 'renda') {
      icon = <ArrowUpCircle size={18} color={Colors.renda} />;
      bg = Colors.renda + '18';
    } else if (item.tipo === 'nota') {
      icon = <CheckSquare size={18} color={Colors.primary} />;
      bg = Colors.primary + '18';
    } else if (item.tipo === 'compra') {
      icon = <ShoppingBag size={18} color={Colors.primary} />;
      bg = Colors.primary + '18';
    }

    return (
      <TouchableOpacity style={s.resultItem} onPress={() => handlePress(item)} activeOpacity={0.7}>
        <View style={[s.iconWrap, { backgroundColor: bg }]}>{icon}</View>
        <View style={s.resultContent}>
          <Text style={s.resultTitulo} numberOfLines={1}>{item.titulo}</Text>
          <Text style={s.resultSub} numberOfLines={1}>{item.subtitulo}</Text>
        </View>
        {item.valor != null && (
          <Text style={[s.resultValor, { color: item.cor || Colors.textPrimary }]}>
            {formatarMoeda(item.valor)}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <View style={s.searchWrap}>
          <Search size={18} color={Colors.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar transações, notas, compras..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={s.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : query.trim().length < 2 ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}><Search size={48} color={Colors.border} /></View>
          <Text style={s.emptyText}>Digite para buscar</Text>
          <Text style={s.emptyHint}>Transações, notas, tarefas e itens de compra</Text>
        </View>
      ) : resultados.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}><FileText size={48} color={Colors.border} /></View>
          <Text style={s.emptyText}>Nenhum resultado para "{query}"</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{section.title}</Text>
              <Text style={s.sectionCount}>({section.count})</Text>
            </View>
          )}
          stickySectionHeadersEnabled
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

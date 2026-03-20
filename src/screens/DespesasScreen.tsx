import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Plus, Check, Search, X } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { useTransacoes } from '../hooks/useTransacoes';
import { marcarPagoBatch } from '../services/transacoes.service';
import { formatarMoeda } from '../utils';
import { CATEGORIAS, MESES } from '../constants';
import TransacaoItem from '../components/TransacaoItem';
import type { Transacao } from '../types';

type FiltroStatus = 'todos' | 'pago' | 'pendente';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
    title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: C.textPrimary },
    monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md, gap: Spacing.md },
    monthText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: C.textPrimary, minWidth: 140, textAlign: 'center' },
    searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: C.border },
    searchInput: { flex: 1, paddingVertical: Spacing.sm, fontSize: FontSize.md, color: C.textPrimary, marginLeft: Spacing.sm },
    filterRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
    filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, borderWidth: 1, borderColor: C.border },
    filterChipSel: { backgroundColor: C.primary + '20', borderColor: C.primary },
    filterText: { fontSize: FontSize.xs, color: C.textMuted },
    filterTextSel: { color: C.primary, fontWeight: FontWeight.bold },
    catFilterRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.md },
    catChip: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: C.border, marginRight: Spacing.xs, marginBottom: Spacing.xs },
    catChipSel: { borderColor: C.primary, backgroundColor: C.primary + '15' },
    catChipText: { fontSize: 10, color: C.textMuted },
    catChipTextSel: { color: C.primary, fontWeight: FontWeight.bold },
    summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    summaryCard: { flex: 1, backgroundColor: C.surface, borderRadius: Radius.sm, padding: Spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    summaryLabel: { fontSize: FontSize.xs, color: C.textMuted, marginBottom: 2 },
    summaryValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    selectionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.primary + '15', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm, marginBottom: Spacing.sm },
    selectionText: { fontSize: FontSize.sm, color: C.primary, fontWeight: FontWeight.semibold },
    selectionActions: { flexDirection: 'row', gap: Spacing.md },
    selectionBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    selectionBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: C.renda },
    list: { paddingHorizontal: Spacing.md },
    emptyText: { fontSize: FontSize.md, color: C.textMuted, textAlign: 'center', paddingVertical: Spacing.xxl },
    fab: { position: 'absolute', right: Spacing.md, bottom: Spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 },
    resultCount: { fontSize: FontSize.xs, color: C.textMuted, textAlign: 'right', marginBottom: Spacing.xs },
  });
}

export default function DespesasScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { mesSelecionado, setMesSelecionado, anoSelecionado, setAnoSelecionado, getNomeMembro } = useApp();
  const { transacoes, carregando, recarregar, totalDespesas, totalPago, totalAPagar } = useTransacoes('despesa');

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');
  const [filtroCat, setFiltroCat] = useState<string | null>(null);
  const modoSelecao = selecionados.size > 0;

  const filtradas = useMemo(() => {
    let r = transacoes;
    if (busca.trim()) { const q = busca.toLowerCase(); r = r.filter((t) => t.titulo.toLowerCase().includes(q) || t.categoria.toLowerCase().includes(q)); }
    if (filtroStatus === 'pago') r = r.filter((t) => t.pago);
    if (filtroStatus === 'pendente') r = r.filter((t) => !t.pago);
    if (filtroCat) r = r.filter((t) => t.categoria === filtroCat);
    return r;
  }, [transacoes, busca, filtroStatus, filtroCat]);

  const categoriasPresentes = useMemo(() => {
    const set = new Set(transacoes.map((t) => t.categoria));
    return CATEGORIAS.filter((c) => set.has(c.id));
  }, [transacoes]);

  const handleMes = (dir: number) => {
    let m = mesSelecionado + dir, a = anoSelecionado;
    if (m < 1) { m = 12; a--; } else if (m > 12) { m = 1; a++; }
    setMesSelecionado(m); setAnoSelecionado(a); setSelecionados(new Set()); setBusca(''); setFiltroCat(null);
  };

  const toggleSelecao = useCallback((id: string) => { setSelecionados((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }, []);
  const handleMarcarPago = useCallback(async () => { await marcarPagoBatch(Array.from(selecionados), true); setSelecionados(new Set()); recarregar(); }, [selecionados, recarregar]);
  const handlePress = useCallback((t: Transacao) => { modoSelecao ? toggleSelecao(t.id) : navigation.navigate('DetalheTransacao', { transacaoId: t.id }); }, [modoSelecao, toggleSelecao, navigation]);

  const renderItem = useCallback(({ item }: { item: Transacao }) => (
    <TouchableOpacity onLongPress={() => toggleSelecao(item.id)} activeOpacity={0.8}>
      <TransacaoItem transacao={item} onPress={handlePress} selecionado={selecionados.has(item.id)} getNomeMembro={getNomeMembro} />
    </TouchableOpacity>
  ), [handlePress, toggleSelecao, selecionados, getNomeMembro]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>Despesas</Text>
        <View style={s.monthSelector}>
          <TouchableOpacity onPress={() => handleMes(-1)}><ChevronLeft size={24} color={Colors.textPrimary} /></TouchableOpacity>
          <Text style={s.monthText}>{MESES[mesSelecionado - 1]} {anoSelecionado}</Text>
          <TouchableOpacity onPress={() => handleMes(1)}><ChevronRight size={24} color={Colors.textPrimary} /></TouchableOpacity>
        </View>
        <View style={s.searchRow}>
          <Search size={18} color={Colors.textMuted} />
          <TextInput style={s.searchInput} placeholder="Buscar despesa..." placeholderTextColor={Colors.textMuted} value={busca} onChangeText={setBusca} />
          {busca.length > 0 && <TouchableOpacity onPress={() => setBusca('')}><X size={18} color={Colors.textMuted} /></TouchableOpacity>}
        </View>
        <View style={s.filterRow}>
          {(['todos', 'pago', 'pendente'] as FiltroStatus[]).map((f) => (
            <TouchableOpacity key={f} style={[s.filterChip, filtroStatus === f && s.filterChipSel]} onPress={() => setFiltroStatus(f)}>
              <Text style={[s.filterText, filtroStatus === f && s.filterTextSel]}>{f === 'todos' ? 'Todos' : f === 'pago' ? 'Pagos' : 'Pendentes'}</Text>
            </TouchableOpacity>
          ))}
          {filtroCat && <TouchableOpacity style={[s.filterChip, { backgroundColor: Colors.despesa + '15', borderColor: Colors.despesa }]} onPress={() => setFiltroCat(null)}><Text style={[s.filterText, { color: Colors.despesa }]}>✕ {CATEGORIAS.find((c) => c.id === filtroCat)?.label}</Text></TouchableOpacity>}
        </View>
        {categoriasPresentes.length > 1 && <View style={s.catFilterRow}>{categoriasPresentes.map((cat) => (
          <TouchableOpacity key={cat.id} style={[s.catChip, filtroCat === cat.id && s.catChipSel]} onPress={() => setFiltroCat(filtroCat === cat.id ? null : cat.id)}>
            <Text style={[s.catChipText, filtroCat === cat.id && s.catChipTextSel]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}</View>}
        <View style={s.summaryRow}>
          <View style={s.summaryCard}><Text style={s.summaryLabel}>Total</Text><Text style={[s.summaryValue, { color: Colors.despesa }]}>{formatarMoeda(totalDespesas)}</Text></View>
          <View style={s.summaryCard}><Text style={s.summaryLabel}>Pago</Text><Text style={[s.summaryValue, { color: Colors.renda }]}>{formatarMoeda(totalPago)}</Text></View>
          <View style={s.summaryCard}><Text style={s.summaryLabel}>A pagar</Text><Text style={[s.summaryValue, { color: Colors.textPrimary }]}>{formatarMoeda(totalAPagar)}</Text></View>
        </View>
        {modoSelecao && <View style={s.selectionBar}><Text style={s.selectionText}>{selecionados.size} selecionado(s)</Text><View style={s.selectionActions}><TouchableOpacity style={s.selectionBtn} onPress={handleMarcarPago}><Check size={16} color={Colors.renda} /><Text style={s.selectionBtnText}>Pagar</Text></TouchableOpacity><TouchableOpacity style={s.selectionBtn} onPress={() => setSelecionados(new Set())}><Text style={[s.selectionBtnText, { color: Colors.textMuted }]}>Cancelar</Text></TouchableOpacity></View></View>}
        {(busca || filtroCat || filtroStatus !== 'todos') && <Text style={s.resultCount}>{filtradas.length} resultado(s)</Text>}
      </View>
      <FlatList data={filtradas} keyExtractor={(i) => i.id} renderItem={renderItem} contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={recarregar} tintColor={Colors.primary} colors={[Colors.primary]} />}
        ListEmptyComponent={<Text style={s.emptyText}>{carregando ? 'Carregando...' : busca ? 'Nenhum resultado' : 'Nenhuma despesa'}</Text>} />
      <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('NovaDespesa')} activeOpacity={0.8}><Plus size={26} color={Colors.textInverse} /></TouchableOpacity>
    </View>
  );
}

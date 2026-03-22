import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Plus, Check, Search, X, CreditCard } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { useTransacoes } from '../hooks/useTransacoes';
import { useCartoes } from '../hooks/useCartoes';
import { marcarPagoBatch } from '../services/transacoes.service';
import { supabase } from '../services/supabase';
import { formatarMoeda } from '../utils';
import { CATEGORIAS, MESES } from '../constants';
import TransacaoItem from '../components/TransacaoItem';
import type { Transacao, Cartao } from '../types';

type FiltroStatus = 'todos' | 'pago' | 'pendente';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
    title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: C.textPrimary },
    monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md, marginTop: Spacing.xs, gap: Spacing.md },
    monthText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: C.textPrimary, minWidth: 140, textAlign: 'center' },
    searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: C.border },
    searchInput: { flex: 1, paddingVertical: Spacing.sm, fontSize: FontSize.md, color: C.textPrimary, marginLeft: Spacing.sm },
    filterRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
    filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, borderWidth: 1, borderColor: C.border },
    filterChipSel: { backgroundColor: C.primary + '20', borderColor: C.primary },
    filterText: { fontSize: FontSize.xs, color: C.textMuted },
    filterTextSel: { color: C.primary, fontWeight: FontWeight.bold },
    summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
    summaryCard: { flex: 1, backgroundColor: C.surface, borderRadius: Radius.sm, padding: Spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    summaryLabel: { fontSize: FontSize.xs, color: C.textMuted, marginBottom: 2 },
    summaryValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    cartoesRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    cartaoChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface },
    cartaoChipSel: { borderColor: C.primary, backgroundColor: C.primary + '10' },
    cartaoChipDot: { width: 8, height: 8, borderRadius: 4 },
    cartaoChipNome: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: C.textPrimary },
    cartaoChipLivre: { fontSize: 10, fontWeight: FontWeight.bold },
    selectionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.primary + '15', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm, marginBottom: Spacing.sm },
    selectionText: { fontSize: FontSize.sm, color: C.primary, fontWeight: FontWeight.semibold },
    selectionActions: { flexDirection: 'row', gap: Spacing.md },
    selectionBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    selectionBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: C.renda },
    list: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
    emptyText: { fontSize: FontSize.md, color: C.textMuted, textAlign: 'center', paddingVertical: Spacing.xxl },
    fab: { position: 'absolute', right: Spacing.md, bottom: Spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 },
    itemExtra: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4, paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs },
    badgeCartao: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
    badgeCartaoText: { fontSize: 10, fontWeight: FontWeight.bold, color: '#FFF' },
    badgeParcela: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, backgroundColor: C.primary + '20' },
    badgeParcelaText: { fontSize: 10, fontWeight: FontWeight.bold, color: C.primary },
    badgeLivre: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
    badgeLivreText: { fontSize: 10, fontWeight: FontWeight.bold },
  });
}

interface CartaoComLimite extends Cartao { disponivel: number; }

function useCartoesComLimite(cartoes: Cartao[]) {
  const [dados, setDados] = useState<Record<string, CartaoComLimite>>({});
  const idsRef = useRef('');

  useEffect(() => {
    const key = cartoes.map((c) => c.id).sort().join(',');
    if (!key || key === idsRef.current) return;
    idsRef.current = key;

    Promise.all(
      cartoes.map(async (c) => {
        try {
          const { data: disp } = await supabase.rpc('limite_disponivel_cartao', { p_cartao_id: c.id });
          return { ...c, disponivel: Number(disp ?? c.limite) };
        } catch { return { ...c, disponivel: Number(c.limite) }; }
      })
    ).then((lista) => {
      const map: Record<string, CartaoComLimite> = {};
      lista.forEach((c) => { map[c.id] = c; });
      setDados(map);
    });
  }, [cartoes]);
  return dados;
}

export default function DespesasScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = useMemo(() => makeStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { mesSelecionado, setMesSelecionado, anoSelecionado, setAnoSelecionado, getNomeMembro, grupoId } = useApp();
  const { transacoes, carregando, recarregar, totalDespesas, totalPago, totalAPagar } = useTransacoes('despesa');
  const { cartoes } = useCartoes();
  const cartoesMap = useCartoesComLimite(cartoes);

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');
  const [filtroCat, setFiltroCat] = useState<string | null>(null);
  const [filtroCartaoId, setFiltroCartaoId] = useState<string | null>(null);
  const modoSelecao = selecionados.size > 0;

  const filtradas = useMemo(() => {
    let r = transacoes;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      r = r.filter((t) => t.titulo.toLowerCase().includes(q) || t.categoria.toLowerCase().includes(q));
    }
    if (filtroStatus === 'pago') r = r.filter((t) => t.pago);
    if (filtroStatus === 'pendente') r = r.filter((t) => !t.pago);
    if (filtroCat) r = r.filter((t) => t.categoria === filtroCat);
    if (filtroCartaoId) r = r.filter((t) => t.cartao_id === filtroCartaoId);
    return r;
  }, [transacoes, busca, filtroStatus, filtroCat, filtroCartaoId]);

  const handleMes = (dir: number) => {
    let m = mesSelecionado + dir, a = anoSelecionado;
    if (m < 1) { m = 12; a--; } else if (m > 12) { m = 1; a++; }
    setMesSelecionado(m);
    setAnoSelecionado(a);
    setSelecionados(new Set());
  };

  const toggleSelecao = useCallback((id: string) => {
    setSelecionados((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const handleMarcarPago = useCallback(async () => {
    await marcarPagoBatch(Array.from(selecionados), true);
    setSelecionados(new Set());
    recarregar();
  }, [selecionados, recarregar]);

  const renderItem = useCallback(({ item }: { item: Transacao }) => {
    const cartao = item.cartao_id ? cartoesMap[item.cartao_id] : null;
    const corLivre = cartao && (cartao.disponivel / Number(cartao.limite)) > 0.4 ? Colors.renda : Colors.despesa;

    return (
      <TouchableOpacity 
        onLongPress={() => toggleSelecao(item.id)} 
        onPress={() => modoSelecao ? toggleSelecao(item.id) : navigation.navigate('DetalheTransacao', { transacaoId: item.id })}
        activeOpacity={0.8}
      >
        <TransacaoItem
          transacao={item}
          onPress={() => {}} // Já tratado no TouchableOpacity externo
          selecionado={selecionados.has(item.id)}
          getNomeMembro={getNomeMembro}
        />
        {(cartao || item.parcela_grupo_id) && (
          <View style={s.itemExtra}>
            {cartao && (
              <View style={[s.badgeCartao, { backgroundColor: cartao.cor }]}>
                <Text style={s.badgeCartaoText}>{cartao.nome}</Text>
              </View>
            )}
            {item.parcela_index != null && (
              <View style={s.badgeParcela}>
                <Text style={s.badgeParcelaText}>{item.parcela_index}ª parcela</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }, [cartoesMap, Colors, modoSelecao, toggleSelecao, selecionados, getNomeMembro, navigation, s]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>Despesas</Text>
        <View style={s.monthSelector}>
          <TouchableOpacity onPress={() => handleMes(-1)}><ChevronLeft size={24} color={Colors.textPrimary} /></TouchableOpacity>
          <Text style={s.monthText}>{MESES[mesSelecionado - 1]} {anoSelecionado}</Text>
          <TouchableOpacity onPress={() => handleMes(1)}><ChevronRight size={24} color={Colors.textPrimary} /></TouchableOpacity>
        </View>
        
        {/* Resumo Rápido */}
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>Total</Text>
            <Text style={[s.summaryValue, { color: Colors.despesa }]}>{formatarMoeda(totalDespesas)}</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>Pendente</Text>
            <Text style={[s.summaryValue, { color: Colors.textPrimary }]}>{formatarMoeda(totalAPagar)}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={filtradas}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={recarregar} tintColor={Colors.primary} />}
        ListEmptyComponent={<Text style={s.emptyText}>Nenhuma despesa este mês.</Text>}
      />

      {/* ✅ Direcionamento correto para Nova Transação */}
      <TouchableOpacity 
        style={s.fab} 
        onPress={() => navigation.navigate('NovaDespesa')}
        activeOpacity={0.8}
      >
        <Plus size={26} color="#FFF" />
      </TouchableOpacity>

      {modoSelecao && (
        <View style={s.selectionBar}>
          <Text style={s.selectionText}>{selecionados.size} selecionados</Text>
          <TouchableOpacity style={s.selectionBtn} onPress={handleMarcarPago}>
            <Check size={16} color={Colors.renda} /><Text style={s.selectionBtnText}>Pagar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
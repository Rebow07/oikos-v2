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

// ─── Estilos ──────────────────────────────────────────────────────────────────

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container:        { flex: 1, backgroundColor: C.background },
    header:           { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
    title:            { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: C.textPrimary },
    monthSelector:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md, marginTop: Spacing.xs, gap: Spacing.md },
    monthText:        { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: C.textPrimary, minWidth: 140, textAlign: 'center' },
    searchRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: C.border },
    searchInput:      { flex: 1, paddingVertical: Spacing.sm, fontSize: FontSize.md, color: C.textPrimary, marginLeft: Spacing.sm },
    filterRow:        { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
    filterChip:       { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, borderWidth: 1, borderColor: C.border },
    filterChipSel:    { backgroundColor: C.primary + '20', borderColor: C.primary },
    filterText:       { fontSize: FontSize.xs, color: C.textMuted },
    filterTextSel:    { color: C.primary, fontWeight: FontWeight.bold },
    catFilterRow:     { flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.md },
    catChip:          { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, borderColor: C.border, marginRight: Spacing.xs, marginBottom: Spacing.xs },
    catChipSel:       { borderColor: C.primary, backgroundColor: C.primary + '15' },
    catChipText:      { fontSize: 10, color: C.textMuted },
    catChipTextSel:   { color: C.primary, fontWeight: FontWeight.bold },

    // Cards de resumo (Total / Pago / A pagar)
    summaryRow:       { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
    summaryCard:      { flex: 1, backgroundColor: C.surface, borderRadius: Radius.sm, padding: Spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    summaryLabel:     { fontSize: FontSize.xs, color: C.textMuted, marginBottom: 2 },
    summaryValue:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold },

    // Cartões — faixa horizontal rolável
    cartoesRow:       { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    cartaoChip:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface },
    cartaoChipSel:    { borderColor: C.primary, backgroundColor: C.primary + '10' },
    cartaoChipDot:    { width: 8, height: 8, borderRadius: 4 },
    cartaoChipNome:   { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: C.textPrimary },
    cartaoChipSaldo:  { fontSize: 10, color: C.textMuted },
    cartaoChipLivre:  { fontSize: 10, fontWeight: FontWeight.bold },

    // Barra de seleção (modo multi-seleção)
    selectionBar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.primary + '15', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm, marginBottom: Spacing.sm },
    selectionText:    { fontSize: FontSize.sm, color: C.primary, fontWeight: FontWeight.semibold },
    selectionActions: { flexDirection: 'row', gap: Spacing.md },
    selectionBtn:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    selectionBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: C.renda },

    list:             { paddingHorizontal: Spacing.md },
    emptyText:        { fontSize: FontSize.md, color: C.textMuted, textAlign: 'center', paddingVertical: Spacing.xxl },
    fab:              { position: 'absolute', right: Spacing.md, bottom: Spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 },
    resultCount:      { fontSize: FontSize.xs, color: C.textMuted, textAlign: 'right', marginBottom: Spacing.xs },

    // Badge de cartão + parcela — dentro do item da lista
    itemExtra:        { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4, paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs },
    badgeCartao:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
    badgeCartaoText:  { fontSize: 10, fontWeight: FontWeight.bold, color: '#FFF' },
    badgeParcela:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, backgroundColor: C.primary + '20' },
    badgeParcelaText: { fontSize: 10, fontWeight: FontWeight.bold, color: C.primary },
    badgeLivre:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
    badgeLivreText:   { fontSize: 10, fontWeight: FontWeight.bold },
  });
}

// ─── Hook de limites de cartão ─────────────────────────────────────────────────

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
        } catch {
          return { ...c, disponivel: Number(c.limite) };
        }
      })
    ).then((lista) => {
      const map: Record<string, CartaoComLimite> = {};
      lista.forEach((c) => { map[c.id] = c; });
      setDados(map);
    });
  }, [cartoes]);

  return dados;
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function DespesasScreen({ navigation }: any) {
  const { Colors } = useTheme();
  // ✅ useMemo para não recriar StyleSheet a cada render
  const s = useMemo(() => makeStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { mesSelecionado, setMesSelecionado, anoSelecionado, setAnoSelecionado, getNomeMembro } = useApp();
  const { transacoes, carregando, recarregar, totalDespesas, totalPago, totalAPagar } = useTransacoes('despesa');
  const { cartoes } = useCartoes();
  const cartoesMap = useCartoesComLimite(cartoes);

  const [selecionados, setSelecionados]     = useState<Set<string>>(new Set());
  const [busca, setBusca]                   = useState('');
  const [filtroStatus, setFiltroStatus]     = useState<FiltroStatus>('todos');
  const [filtroCat, setFiltroCat]           = useState<string | null>(null);
  const [filtroCartaoId, setFiltroCartaoId] = useState<string | null>(null);
  const modoSelecao = selecionados.size > 0;

  // ── Filtros ────────────────────────────────────────────────────────────────

  const filtradas = useMemo(() => {
    let r = transacoes;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      r = r.filter((t) => t.titulo.toLowerCase().includes(q) || t.categoria.toLowerCase().includes(q));
    }
    if (filtroStatus === 'pago')    r = r.filter((t) => t.pago);
    if (filtroStatus === 'pendente') r = r.filter((t) => !t.pago);
    if (filtroCat)                  r = r.filter((t) => t.categoria === filtroCat);
    if (filtroCartaoId)             r = r.filter((t) => t.cartao_id === filtroCartaoId);
    return r;
  }, [transacoes, busca, filtroStatus, filtroCat, filtroCartaoId]);

  const categoriasPresentes = useMemo(() => {
    const set = new Set(transacoes.map((t) => t.categoria));
    return CATEGORIAS.filter((c) => set.has(c.id));
  }, [transacoes]);

  // Cartões que têm ao menos 1 despesa neste mês
  const cartoesNoPeriodo = useMemo(() => {
    const ids = new Set(transacoes.map((t) => t.cartao_id).filter(Boolean));
    return cartoes.filter((c) => ids.has(c.id));
  }, [transacoes, cartoes]);

  // ── Navegação de mês ───────────────────────────────────────────────────────

  const handleMes = (dir: number) => {
    let m = mesSelecionado + dir, a = anoSelecionado;
    if (m < 1) { m = 12; a--; } else if (m > 12) { m = 1; a++; }
    setMesSelecionado(m);
    setAnoSelecionado(a);
    setSelecionados(new Set());
    setBusca('');
    setFiltroCat(null);
    setFiltroCartaoId(null);
  };

  // ── Seleção múltipla ───────────────────────────────────────────────────────

  const toggleSelecao = useCallback((id: string) => {
    setSelecionados((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const handleMarcarPago = useCallback(async () => {
    await marcarPagoBatch(Array.from(selecionados), true);
    setSelecionados(new Set());
    recarregar();
  }, [selecionados, recarregar]);

  const handlePress = useCallback((t: Transacao) => {
    modoSelecao ? toggleSelecao(t.id) : navigation.navigate('DetalheTransacao', { transacaoId: t.id });
  }, [modoSelecao, toggleSelecao, navigation]);

  // ── Render de cada item ────────────────────────────────────────────────────

  const renderItem = useCallback(({ item }: { item: Transacao }) => {
    const cartao = item.cartao_id ? cartoesMap[item.cartao_id] : null;
    const isParcelado = !!item.parcela_grupo_id;
    const pctLivre = cartao && cartao.limite > 0 ? (cartao.disponivel / Number(cartao.limite)) * 100 : 100;
    const corLivre = pctLivre > 40 ? Colors.renda : pctLivre > 15 ? '#E67E22' : Colors.despesa;

    return (
      <TouchableOpacity onLongPress={() => toggleSelecao(item.id)} activeOpacity={0.8}>
        <TransacaoItem
          transacao={item}
          onPress={handlePress}
          selecionado={selecionados.has(item.id)}
          getNomeMembro={getNomeMembro}
        />
        {/* ── Badges extras: cartão + parcela + limite disponível ── */}
        {(cartao || isParcelado) && (
          <View style={s.itemExtra}>
            {/* Badge do cartão com a cor dele */}
            {cartao && (
              <View style={[s.badgeCartao, { backgroundColor: cartao.cor }]}>
                <CreditCard size={10} color="#FFF" />
                <Text style={s.badgeCartaoText}>{cartao.nome}</Text>
              </View>
            )}

            {/* Badge de parcela: "2/6 · R$ 150,00/parcela" */}
            {isParcelado && item.parcela_index != null && (
              <View style={s.badgeParcela}>
                <Text style={s.badgeParcelaText}>
                  {item.parcela_index}ª parcela · {formatarMoeda(item.valor)}
                </Text>
              </View>
            )}

            {/* Disponível no cartão (só quando há cartão e não está filtrando por cartão) */}
            {cartao && (
              <View style={[s.badgeLivre, { backgroundColor: corLivre + '18' }]}>
                <Text style={[s.badgeLivreText, { color: corLivre }]}>
                  Livre: {formatarMoeda(cartao.disponivel)}
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }, [s, cartoesMap, Colors, handlePress, toggleSelecao, selecionados, getNomeMembro]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>Despesas</Text>

        {/* Seletor de mês */}
        <View style={s.monthSelector}>
          <TouchableOpacity onPress={() => handleMes(-1)}>
            <ChevronLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.monthText}>{MESES[mesSelecionado - 1]} {anoSelecionado}</Text>
          <TouchableOpacity onPress={() => handleMes(1)}>
            <ChevronRight size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Busca */}
        <View style={s.searchRow}>
          <Search size={18} color={Colors.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar despesa..."
            placeholderTextColor={Colors.textMuted}
            value={busca}
            onChangeText={setBusca}
          />
          {busca.length > 0 && (
            <TouchableOpacity onPress={() => setBusca('')}>
              <X size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtros de status */}
        <View style={s.filterRow}>
          {(['todos', 'pago', 'pendente'] as FiltroStatus[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[s.filterChip, filtroStatus === f && s.filterChipSel]}
              onPress={() => setFiltroStatus(f)}
            >
              <Text style={[s.filterText, filtroStatus === f && s.filterTextSel]}>
                {f === 'todos' ? 'Todos' : f === 'pago' ? 'Pagos' : 'Pendentes'}
              </Text>
            </TouchableOpacity>
          ))}
          {filtroCat && (
            <TouchableOpacity
              style={[s.filterChip, { backgroundColor: Colors.despesa + '15', borderColor: Colors.despesa }]}
              onPress={() => setFiltroCat(null)}
            >
              <Text style={[s.filterText, { color: Colors.despesa }]}>
                ✕ {CATEGORIAS.find((c) => c.id === filtroCat)?.label}
              </Text>
            </TouchableOpacity>
          )}
          {filtroCartaoId && (
            <TouchableOpacity
              style={[s.filterChip, { borderColor: cartoesMap[filtroCartaoId]?.cor || Colors.primary, backgroundColor: (cartoesMap[filtroCartaoId]?.cor || Colors.primary) + '15' }]}
              onPress={() => setFiltroCartaoId(null)}
            >
              <Text style={[s.filterText, { color: cartoesMap[filtroCartaoId]?.cor || Colors.primary }]}>
                ✕ {cartoesMap[filtroCartaoId]?.nome || 'Cartão'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filtro por categoria */}
        {categoriasPresentes.length > 1 && (
          <View style={s.catFilterRow}>
            {categoriasPresentes.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[s.catChip, filtroCat === cat.id && s.catChipSel]}
                onPress={() => setFiltroCat(filtroCat === cat.id ? null : cat.id)}
              >
                <Text style={[s.catChipText, filtroCat === cat.id && s.catChipTextSel]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Faixa de cartões com limite disponível ── */}
        {cartoesNoPeriodo.length > 0 && (
          <View style={{ marginBottom: Spacing.sm }}>
            <FlatList
              data={cartoesNoPeriodo}
              keyExtractor={(c) => c.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.cartoesRow}
              renderItem={({ item: c }) => {
                const info = cartoesMap[c.id];
                const disponivel = info?.disponivel ?? Number(c.limite);
                const pct = Number(c.limite) > 0 ? (disponivel / Number(c.limite)) * 100 : 100;
                const cor = pct > 40 ? Colors.renda : pct > 15 ? '#E67E22' : Colors.despesa;
                const selecionado = filtroCartaoId === c.id;
                return (
                  <TouchableOpacity
                    style={[s.cartaoChip, selecionado && s.cartaoChipSel, selecionado && { borderColor: c.cor }]}
                    onPress={() => setFiltroCartaoId(selecionado ? null : c.id)}
                    activeOpacity={0.75}
                  >
                    <View style={[s.cartaoChipDot, { backgroundColor: c.cor }]} />
                    <View>
                      <Text style={[s.cartaoChipNome, selecionado && { color: c.cor }]}>{c.nome}</Text>
                      <Text style={[s.cartaoChipLivre, { color: cor }]}>
                        Livre: {formatarMoeda(disponivel)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {/* Cards resumo: Total / Pago / A pagar */}
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>Total</Text>
            <Text style={[s.summaryValue, { color: Colors.despesa }]}>{formatarMoeda(totalDespesas)}</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>Pago</Text>
            <Text style={[s.summaryValue, { color: Colors.renda }]}>{formatarMoeda(totalPago)}</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>A pagar</Text>
            <Text style={[s.summaryValue, { color: Colors.textPrimary }]}>{formatarMoeda(totalAPagar)}</Text>
          </View>
        </View>

        {/* Barra de seleção múltipla */}
        {modoSelecao && (
          <View style={s.selectionBar}>
            <Text style={s.selectionText}>{selecionados.size} selecionado(s)</Text>
            <View style={s.selectionActions}>
              <TouchableOpacity style={s.selectionBtn} onPress={handleMarcarPago}>
                <Check size={16} color={Colors.renda} />
                <Text style={s.selectionBtnText}>Pagar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.selectionBtn} onPress={() => setSelecionados(new Set())}>
                <Text style={[s.selectionBtnText, { color: Colors.textMuted }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {(busca || filtroCat || filtroCartaoId || filtroStatus !== 'todos') && (
          <Text style={s.resultCount}>{filtradas.length} resultado(s)</Text>
        )}
      </View>

      {/* Lista de despesas */}
      <FlatList
        data={filtradas}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={carregando}
            onRefresh={recarregar}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <Text style={s.emptyText}>
            {carregando ? 'Carregando...' : busca ? 'Nenhum resultado' : 'Nenhuma despesa'}
          </Text>
        }
      />

      <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('NovaDespesa')} activeOpacity={0.8}>
        <Plus size={26} color={Colors.textInverse} />
      </TouchableOpacity>
    </View>
  );
}

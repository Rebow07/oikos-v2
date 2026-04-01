import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Share2, FileText } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { useTransacoes } from '../hooks/useTransacoes';
import { useComparativoMensal } from '../hooks/useComparativoMensal';
import { CATEGORIAS, MESES } from '../constants';
import { formatarMoeda } from '../utils';
import { exportarRelatorioPDF } from '../services/pdf.service';
import GraficoRosca from '../components/GraficoRosca';
import GraficoEvolucao from '../components/GraficoEvolucao';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
    headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    periodNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, marginBottom: Spacing.lg, backgroundColor: C.surface, borderRadius: Radius.md, paddingVertical: Spacing.sm, marginHorizontal: Spacing.sm },
    periodText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.textPrimary, minWidth: 140, textAlign: 'center' },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary, marginBottom: Spacing.md, marginTop: Spacing.lg },
    chartContainer: { alignItems: 'center', marginBottom: Spacing.lg },
    catItem: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
    catRank: { width: 24, fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: C.textMuted },
    catLabel: { width: 90, fontSize: FontSize.sm, color: C.textSecondary },
    catBarBg: { flex: 1, height: 10, backgroundColor: C.border, borderRadius: 5, marginHorizontal: Spacing.sm, overflow: 'hidden' },
    catBar: { height: 10, borderRadius: 5 },
    catValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: C.textPrimary, width: 80, textAlign: 'right' },
    catPct: { fontSize: FontSize.xs, color: C.textMuted, width: 40, textAlign: 'right' },
    summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    summaryCard: { flex: 1, backgroundColor: C.surface, borderRadius: Radius.sm, padding: Spacing.md, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    summaryLabel: { fontSize: FontSize.xs, color: C.textMuted, marginBottom: 2 },
    summaryValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    emptyText: { fontSize: FontSize.md, color: C.textMuted, textAlign: 'center', paddingVertical: Spacing.xxl },
    // Comparativo
    comparCard: {
      borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
    },
    comparRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    comparPct: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
    comparSub: { fontSize: FontSize.xs, color: C.textMuted, marginTop: 2 },
    comparDetail: { fontSize: FontSize.xs, color: C.textMuted, marginTop: Spacing.xs },
    // Evolução
    evolCard: { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  });
}

export default function RelatoriosScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = useMemo(() => makeStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { mesSelecionado, setMesSelecionado, anoSelecionado, setAnoSelecionado, grupoId, nomeUsuario } = useApp();
  const { transacoes, totalDespesas, totalReceitas, saldo, porCategoria } = useTransacoes();
  const comparativo = useComparativoMensal(grupoId, mesSelecionado, anoSelecionado, totalDespesas, porCategoria);

  const mesAnterior = () => {
    if (mesSelecionado === 1) { setMesSelecionado(12); setAnoSelecionado(anoSelecionado - 1); }
    else setMesSelecionado(mesSelecionado - 1);
  };
  const mesProximo = () => {
    if (mesSelecionado === 12) { setMesSelecionado(1); setAnoSelecionado(anoSelecionado + 1); }
    else setMesSelecionado(mesSelecionado + 1);
  };

  const chartData = porCategoria.slice(0, 8).map((item) => {
    const cat = CATEGORIAS.find((c) => c.id === item.categoria);
    return { label: cat?.label || item.categoria, value: item.valor, color: cat?.cor || '#95A5A6' };
  });
  const maxVal = porCategoria[0]?.valor || 1;

  const handleCompartilhar = async () => {
    try {
      const linhas = porCategoria.map((item, i) => {
        const cat = CATEGORIAS.find((c) => c.id === item.categoria);
        return `${i + 1}. ${cat?.label || item.categoria}: ${formatarMoeda(item.valor)}`;
      }).join('\n');
      const texto = [
        `📊 Relatório Oikos Family — ${MESES[mesSelecionado - 1]} ${anoSelecionado}`,
        ``,
        `💸 Despesas: ${formatarMoeda(totalDespesas)}`,
        `💰 Receitas: ${formatarMoeda(totalReceitas)}`,
        `📈 Saldo: ${formatarMoeda(saldo)}`,
        ``,
        `📂 Por categoria:`,
        linhas,
      ].join('\n');
      await Share.share({ message: texto, title: 'Relatório Oikos' });
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    }
  };

  const handleExportarPDF = async () => {
    try {
      await exportarRelatorioPDF(transacoes, mesSelecionado, anoSelecionado, nomeUsuario || 'Usuário');
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível exportar o PDF.');
    }
  };

  // Comparativo visual
  const variacaoPositiva = comparativo.variacaoPctTotal > 0; // gastou mais
  const variacaoZero = comparativo.variacaoPctTotal === 0 || comparativo.despesasMesAnterior === 0;
  const variacaoAbs = Math.abs(comparativo.variacaoPctTotal);
  const comparBg = variacaoZero ? Colors.border + '30' : variacaoPositiva ? Colors.despesa + '15' : Colors.renda + '15';
  const comparBorder = variacaoZero ? Colors.border : variacaoPositiva ? Colors.despesa + '40' : Colors.renda + '40';
  const comparColor = variacaoZero ? Colors.textMuted : variacaoPositiva ? Colors.despesa : Colors.renda;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>Relatórios</Text>
        <View style={s.headerActions}>
          <TouchableOpacity onPress={handleExportarPDF} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <FileText size={22} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCompartilhar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Share2 size={22} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <X size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Seletor de período */}
        <View style={s.periodNav}>
          <TouchableOpacity onPress={mesAnterior} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ChevronLeft size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.periodText}>{MESES[mesSelecionado - 1]} {anoSelecionado}</Text>
          <TouchableOpacity onPress={mesProximo} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ChevronRight size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={s.summaryRow}>
          <View style={s.summaryCard}><Text style={s.summaryLabel}>Despesas</Text><Text style={[s.summaryValue, { color: Colors.despesa }]}>{formatarMoeda(totalDespesas)}</Text></View>
          <View style={s.summaryCard}><Text style={s.summaryLabel}>Receitas</Text><Text style={[s.summaryValue, { color: Colors.renda }]}>{formatarMoeda(totalReceitas)}</Text></View>
          <View style={s.summaryCard}><Text style={s.summaryLabel}>Saldo</Text><Text style={[s.summaryValue, { color: saldo >= 0 ? Colors.renda : Colors.despesa }]}>{formatarMoeda(saldo)}</Text></View>
        </View>

        {/* ── Comparativo inter-mensal (#12) */}
        {!comparativo.carregando && comparativo.despesasMesAnterior > 0 && (
          <>
            <Text style={s.sectionTitle}>Comparativo</Text>
            <View style={[s.comparCard, { backgroundColor: comparBg, borderColor: comparBorder }]}>
              <View style={s.comparRow}>
                {variacaoPositiva
                  ? <TrendingUp size={22} color={comparColor} />
                  : <TrendingDown size={22} color={comparColor} />}
                <Text style={[s.comparPct, { color: comparColor }]}>
                  {variacaoPositiva ? '+' : '-'}{variacaoAbs.toFixed(0)}%
                </Text>
                <Text style={{ fontSize: FontSize.md, color: Colors.textSecondary, flex: 1 }}>
                  {variacaoPositiva ? 'a mais que o mês anterior' : 'a menos que o mês anterior'}
                </Text>
              </View>
              <Text style={s.comparDetail}>
                {MESES[mesSelecionado - 1]}: {formatarMoeda(totalDespesas)} · Mês anterior: {formatarMoeda(comparativo.despesasMesAnterior)}
              </Text>
              {comparativo.maiorAltaCategoria && comparativo.maiorAltaPct > 5 && (
                <Text style={[s.comparDetail, { marginTop: 4 }]}>
                  ⚠️ Maior alta: {CATEGORIAS.find((c) => c.id === comparativo.maiorAltaCategoria)?.label || comparativo.maiorAltaCategoria} (+{comparativo.maiorAltaPct.toFixed(0)}%)
                </Text>
              )}
            </View>
          </>
        )}

        {/* ── Gráfico Evolução 6 meses (#7) */}
        <Text style={s.sectionTitle}>Evolução 6 meses</Text>
        <View style={s.evolCard}>
          <GraficoEvolucao grupoId={grupoId} mesAtual={mesSelecionado} anoAtual={anoSelecionado} />
        </View>

        {/* Donut */}
        {chartData.length > 0 ? (
          <>
            <Text style={s.sectionTitle}>Despesas por categoria</Text>
            <View style={s.chartContainer}>
              <GraficoRosca data={chartData} size={200} centerLabel="Total" centerValue={formatarMoeda(totalDespesas)} />
            </View>
          </>
        ) : <Text style={s.emptyText}>Sem dados para exibir</Text>}

        {/* Ranking */}
        {porCategoria.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Ranking de categorias</Text>
            {porCategoria.map((item, idx) => {
              const cat = CATEGORIAS.find((c) => c.id === item.categoria);
              const pct = totalDespesas > 0 ? (item.valor / totalDespesas) * 100 : 0;
              const barW = (item.valor / maxVal) * 100;
              return (
                <View key={item.categoria} style={s.catItem}>
                  <Text style={s.catRank}>{idx + 1}.</Text>
                  <Text style={s.catLabel} numberOfLines={1}>{cat?.label || item.categoria}</Text>
                  <View style={s.catBarBg}>
                    <View style={[s.catBar, { width: `${barW}%`, backgroundColor: cat?.cor || Colors.primary }]} />
                  </View>
                  <Text style={s.catValue}>{formatarMoeda(item.valor)}</Text>
                  <Text style={s.catPct}>{Math.round(pct)}%</Text>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

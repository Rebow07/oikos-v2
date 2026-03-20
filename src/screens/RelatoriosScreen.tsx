import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { useTransacoes } from '../hooks/useTransacoes';
import { CATEGORIAS, MESES } from '../constants';
import { formatarMoeda } from '../utils';
import GraficoRosca from '../components/GraficoRosca';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
    headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary },
    scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    // Seletor de período
    periodNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, marginBottom: Spacing.lg, backgroundColor: C.surface, borderRadius: Radius.md, paddingVertical: Spacing.sm, marginHorizontal: Spacing.sm },
    periodText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.textPrimary, minWidth: 140, textAlign: 'center' },
    mesLabel: { fontSize: FontSize.md, color: C.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },
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
  });
}

export default function RelatoriosScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { mesSelecionado, setMesSelecionado, anoSelecionado, setAnoSelecionado } = useApp();
  const { totalDespesas, totalReceitas, saldo, porCategoria } = useTransacoes();

  // Navegação de período local
  const mesAnterior = () => {
    if (mesSelecionado === 1) {
      setMesSelecionado(12);
      setAnoSelecionado(anoSelecionado - 1);
    } else {
      setMesSelecionado(mesSelecionado - 1);
    }
  };

  const mesProximo = () => {
    if (mesSelecionado === 12) {
      setMesSelecionado(1);
      setAnoSelecionado(anoSelecionado + 1);
    } else {
      setMesSelecionado(mesSelecionado + 1);
    }
  };

  const chartData = porCategoria.slice(0, 8).map((item) => {
    const cat = CATEGORIAS.find((c) => c.id === item.categoria);
    return { label: cat?.label || item.categoria, value: item.valor, color: cat?.cor || '#95A5A6' };
  });

  const maxVal = porCategoria[0]?.valor || 1;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>Relatórios</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><X size={24} color={Colors.textPrimary} /></TouchableOpacity>
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

        {/* Donut Chart */}
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

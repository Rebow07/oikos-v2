import React, { useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowDownCircle, ArrowUpCircle, TrendingUp, ChevronRight, ArrowLeft,
  CheckCircle2, Clock, Target, PiggyBank, BarChart3, Users, Scale, ShoppingCart,
} from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { useTransacoes } from '../hooks/useTransacoes';
import { useReceitas } from '../hooks/useReceitas';
import { CATEGORIAS, MESES } from '../constants';
import { formatarMoeda } from '../utils';
import CircularProgress from '../components/CircularProgress';
import GraficoRosca from '../components/GraficoRosca';
import TransacaoItem from '../components/TransacaoItem';
import InsightsIA from '../components/InsightsIA';
import { marcarPago } from '../services/transacoes.service';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl + 80 },
    // Header com espaço adequado
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.md, gap: Spacing.sm },
    greetingWrap: { flex: 1 },
    greeting: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },
    mesLabel: { fontSize: FontSize.sm, color: C.textSecondary, marginTop: 2 },
    membrosChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary + '15', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.full },
    membrosText: { fontSize: FontSize.xs, color: C.primary, fontWeight: FontWeight.bold },
    // Summary
    summaryCard: { backgroundColor: C.cardDark, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLeft: { flex: 1 },
    summaryItem: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
    summaryLabel: { fontSize: FontSize.sm, color: C.textOnCard, opacity: 0.7, marginLeft: Spacing.sm },
    summaryValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginLeft: Spacing.sm },
    saldoRow: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.textOnCard + '15' },
    saldoLabel: { fontSize: FontSize.sm, color: C.textOnCard, opacity: 0.7, marginLeft: Spacing.sm },
    saldoValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, marginLeft: Spacing.sm },
    // Status
    statusRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
    statusCard: { flex: 1, backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    statusLabel: { fontSize: FontSize.xs, color: C.textMuted, marginBottom: Spacing.xs, marginTop: Spacing.xs },
    statusValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },
    // Sections
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md, marginTop: Spacing.sm },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },
    sectionLink: { flexDirection: 'row', alignItems: 'center' },
    sectionLinkText: { fontSize: FontSize.sm, color: C.primary, fontWeight: FontWeight.semibold },
    chartContainer: { alignItems: 'center', marginBottom: Spacing.lg },
    // Quick access — 2 rows
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
    quickCard: { width: '23%', backgroundColor: C.surface, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    quickLabel: { fontSize: 10, color: C.textSecondary, marginTop: Spacing.xs, fontWeight: FontWeight.semibold, textAlign: 'center' },
    // Categories
    catItem: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
    catLabel: { width: 80, fontSize: FontSize.sm, color: C.textSecondary },
    catBarBg: { flex: 1, height: 8, backgroundColor: C.border, borderRadius: 4, marginHorizontal: Spacing.sm, overflow: 'hidden' },
    catBar: { height: 8, borderRadius: 4 },
    catValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: C.textPrimary, width: 75, textAlign: 'right' },
    emptyText: { fontSize: FontSize.sm, color: C.textMuted, textAlign: 'center', paddingVertical: Spacing.lg },
  });
}

export default function DashboardScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { nomeUsuario, mesSelecionado, anoSelecionado, orcamentoMensal, getNomeMembro, qtdMembros } = useApp();
  const { transacoes, carregando, recarregar, totalDespesas, totalReceitas, saldo, totalPago, totalAPagar, porCategoria } = useTransacoes();
  const { totalReceitas: totalReceitasFixas } = useReceitas();

  const receitaTotal = totalReceitas + totalReceitasFixas;
  const saldoReal = receitaTotal - totalDespesas;
  const percentGasto = orcamentoMensal > 0 ? (totalDespesas / orcamentoMensal) * 100 : 0;
  const recentes = transacoes.slice(0, 5);
  const top5 = porCategoria.slice(0, 5);
  const maxCat = top5[0]?.valor || 1;
  const chartData = porCategoria.slice(0, 6).map((item) => {
    const cat = CATEGORIAS.find((c) => c.id === item.categoria);
    return { label: cat?.label || item.categoria, value: item.valor, color: cat?.cor || '#95A5A6' };
  });

  const handleTogglePago = useCallback(async (t: any) => { await marcarPago(t.id, !t.pago); recarregar(); }, [recarregar]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header — com espaço correto */}
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.greetingWrap}>
          <Text style={s.greeting}>Olá, {nomeUsuario || 'Usuário'}</Text>
          <Text style={s.mesLabel}>{MESES[mesSelecionado - 1]} {anoSelecionado}</Text>
        </View>
        <View style={s.membrosChip}>
          <Users size={12} color={Colors.primary} />
          <Text style={s.membrosText}>{qtdMembros}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={recarregar} tintColor={Colors.primary} colors={[Colors.primary]} />}>

        {/* Receita primeiro, despesa depois */}
        <View style={s.summaryCard}>
          <View style={s.summaryRow}>
            <View style={s.summaryLeft}>
              <View style={s.summaryItem}>
                <ArrowUpCircle size={18} color={Colors.renda} />
                <Text style={s.summaryLabel}>Receitas</Text>
                <Text style={[s.summaryValue, { color: Colors.renda }]}>{formatarMoeda(receitaTotal)}</Text>
              </View>
              <View style={s.summaryItem}>
                <ArrowDownCircle size={18} color={Colors.despesa} />
                <Text style={s.summaryLabel}>Despesas</Text>
                <Text style={[s.summaryValue, { color: Colors.despesa }]}>{formatarMoeda(totalDespesas)}</Text>
              </View>
            </View>
            {orcamentoMensal > 0 && <CircularProgress percent={percentGasto} size={85} strokeWidth={7} label="gasto" />}
          </View>
          <View style={s.saldoRow}>
            <TrendingUp size={18} color={saldoReal >= 0 ? Colors.renda : Colors.despesa} />
            <Text style={s.saldoLabel}>Saldo</Text>
            <Text style={[s.saldoValue, { color: saldoReal >= 0 ? Colors.renda : Colors.despesa }]}>{formatarMoeda(saldoReal)}</Text>
          </View>
        </View>

        {/* Status cards */}
        <View style={s.statusRow}>
          <View style={s.statusCard}><ArrowDownCircle size={14} color={Colors.despesa} /><Text style={s.statusLabel}>Total</Text><Text style={s.statusValue}>{formatarMoeda(totalDespesas)}</Text></View>
          <View style={s.statusCard}><CheckCircle2 size={14} color={Colors.renda} /><Text style={s.statusLabel}>Pago</Text><Text style={[s.statusValue, { color: Colors.renda }]}>{formatarMoeda(totalPago)}</Text></View>
          <View style={s.statusCard}><Clock size={14} color={Colors.textMuted} /><Text style={s.statusLabel}>A pagar</Text><Text style={[s.statusValue, { color: Colors.despesa }]}>{formatarMoeda(totalAPagar)}</Text></View>
        </View>

        <InsightsIA totalDespesas={totalDespesas} totalReceitas={receitaTotal} porCategoria={porCategoria} mes={mesSelecionado} ano={anoSelecionado} />

        {/* Donut */}
        {chartData.length > 0 && (
          <>
            <View style={[s.sectionHeader, { marginTop: Spacing.lg }]}><Text style={s.sectionTitle}>Gastos por categoria</Text></View>
            <View style={s.chartContainer}><GraficoRosca data={chartData} size={170} centerLabel="Total" centerValue={formatarMoeda(totalDespesas)} /></View>
          </>
        )}

        {/* Acesso rápido — grid de 4 colunas */}
        <View style={s.sectionHeader}><Text style={s.sectionTitle}>Acesso rápido</Text></View>
        <View style={s.quickGrid}>
          <TouchableOpacity style={s.quickCard} onPress={() => navigation.navigate('Metas')}><Target size={20} color={Colors.primary} /><Text style={s.quickLabel}>Metas</Text></TouchableOpacity>
          <TouchableOpacity style={s.quickCard} onPress={() => navigation.navigate('Reservas')}><PiggyBank size={20} color={Colors.primary} /><Text style={s.quickLabel}>Reservas</Text></TouchableOpacity>
          <TouchableOpacity style={s.quickCard} onPress={() => navigation.navigate('Balanco')}><Scale size={20} color={Colors.primary} /><Text style={s.quickLabel}>Balanço</Text></TouchableOpacity>
          <TouchableOpacity style={s.quickCard} onPress={() => navigation.navigate('Relatorios')}><BarChart3 size={20} color={Colors.primary} /><Text style={s.quickLabel}>Relatórios</Text></TouchableOpacity>
          <TouchableOpacity style={s.quickCard} onPress={() => navigation.navigate('ComprasHome')}><ShoppingCart size={20} color={Colors.renda} /><Text style={s.quickLabel}>Compras</Text></TouchableOpacity>
        </View>

        {/* Top categorias */}
        {top5.length > 0 && (
          <>
            <View style={s.sectionHeader}><Text style={s.sectionTitle}>Top categorias</Text></View>
            {top5.map((item) => {
              const cat = CATEGORIAS.find((c) => c.id === item.categoria);
              return (
                <View key={item.categoria} style={s.catItem}>
                  <Text style={s.catLabel} numberOfLines={1}>{cat?.label || item.categoria}</Text>
                  <View style={s.catBarBg}><View style={[s.catBar, { width: `${(item.valor / maxCat) * 100}%`, backgroundColor: cat?.cor || Colors.primary }]} /></View>
                  <Text style={s.catValue}>{formatarMoeda(item.valor)}</Text>
                </View>
              );
            })}
          </>
        )}

        {/* Últimas transações */}
        <View style={[s.sectionHeader, { marginTop: Spacing.lg }]}>
          <Text style={s.sectionTitle}>Últimas transações</Text>
          <TouchableOpacity style={s.sectionLink} onPress={() => navigation.navigate('Despesas')}>
            <Text style={s.sectionLinkText}>Ver todas</Text><ChevronRight size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        {recentes.length > 0 ? recentes.map((t) => (
          <TransacaoItem key={t.id} transacao={t} onPress={() => navigation.navigate('DetalheTransacao', { transacaoId: t.id })} onTogglePago={handleTogglePago} getNomeMembro={getNomeMembro} />
        )) : <Text style={s.emptyText}>{carregando ? 'Carregando...' : 'Nenhuma transação'}</Text>}
      </ScrollView>
    </View>
  );
}

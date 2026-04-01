import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronLeft, ChevronRight, CreditCard, Banknote } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { supabase } from '../services/supabase';
import { formatarMoeda, formatarData } from '../utils';
import { MESES, CATEGORIAS } from '../constants';
import type { Cartao, Transacao } from '../types';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
    headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary },
    navPeriodo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    periodoText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.textPrimary, minWidth: 140, textAlign: 'center' },
    summaryCard: { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.lg, margin: Spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, alignItems: 'center' },
    summaryLabel: { fontSize: FontSize.sm, color: C.textSecondary, marginBottom: Spacing.xs },
    summaryValue: { fontSize: 32, fontWeight: FontWeight.extrabold, color: C.despesa },
    summaryDate: { fontSize: FontSize.xs, color: C.textMuted, marginTop: Spacing.sm },
    btnPagar: { backgroundColor: C.primary, borderRadius: Radius.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl, marginTop: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    btnPagarText: { color: C.textInverse, fontWeight: FontWeight.bold, fontSize: FontSize.md },
    listTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.textPrimary, marginHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.md },
    item: { flexDirection: 'row', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border, alignItems: 'center' },
    itemInfo: { flex: 1 },
    itemTitle: { fontSize: FontSize.md, color: C.textPrimary, fontWeight: FontWeight.semibold },
    itemSubtitle: { fontSize: FontSize.xs, color: C.textMuted },
    itemVal: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.despesa },
    empty: { textAlign: 'center', color: C.textMuted, marginVertical: Spacing.xl },
  });
}

export default function FaturaCartaoScreen({ route, navigation }: any) {
  const { cartaoId } = route.params;
  const { Colors } = useTheme();
  const s = useMemo(() => makeStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  
  const [cartao, setCartao] = useState<Cartao | null>(null);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);

  const prevMonth = () => {
    if (mes === 1) { setMes(12); setAno(ano - 1); }
    else setMes(mes - 1);
  };
  const nextMonth = () => {
    if (mes === 12) { setMes(1); setAno(ano + 1); }
    else setMes(mes + 1);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: cartaoData } = await supabase.from('cartoes').select('*').eq('id', cartaoId).single();
      if (!cartaoData) return;
      setCartao(cartaoData as Cartao);

      // Calculando ciclo da fatura
      // Vencimento = X do mês selecionado
      // Fechamento = Vencimento - 7 dias
      const fechamentoDate = new Date(ano, mes - 1, cartaoData.vencimento);
      fechamentoDate.setDate(fechamentoDate.getDate() - 7);
      
      const cicloInicio = new Date(fechamentoDate);
      cicloInicio.setMonth(cicloInicio.getMonth() - 1); // Fechamento do mês anterior

      // Busca transações >= cicloInicio E < fechamentoDate
      const { data: txs } = await supabase.from('transacoes')
        .select('*')
        .eq('cartao_id', cartaoId)
        .gte('data', cicloInicio.toISOString().split('T')[0])
        .lt('data', fechamentoDate.toISOString().split('T')[0])
        .order('data', { ascending: false });

      setTransacoes((txs as Transacao[]) || []);
    } catch (e) {
      console.warn('Erro fatura', e);
    } finally {
      setLoading(false);
    }
  }, [cartaoId, mes, ano]);

  useEffect(() => { loadData(); }, [loadData]);

  const total = transacoes.reduce((acc, t) => acc + (t.tipo === 'despesa' ? t.valor : -t.valor), 0);
  
  const handlePagar = () => {
     if (total <= 0) { Alert.alert('Ops', 'Fatura atual está zerada.'); return; }
     Alert.alert('Funcionalidade', 'Aqui abrirá a tela de pagamento de fatura, que criará uma transação de Despesa e zerará o limite temporário.');
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>Fatura: {cartao?.nome || 'Cartão'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={s.navPeriodo}>
        <TouchableOpacity onPress={prevMonth} hitSlop={10}><ChevronLeft color={Colors.textPrimary} /></TouchableOpacity>
        <Text style={s.periodoText}>{MESES[mes - 1]} {ano}</Text>
        <TouchableOpacity onPress={nextMonth} hitSlop={10}><ChevronRight color={Colors.textPrimary} /></TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing.xl }} />
      ) : (
        <FlatList
          data={transacoes}
          keyExtractor={t => t.id}
          ListHeaderComponent={
            <View style={[s.summaryCard, !!cartao && { borderTopWidth: 4, borderTopColor: cartao.cor }]}>
              <Text style={s.summaryLabel}>Total da fatura</Text>
              <Text style={s.summaryValue}>{formatarMoeda(total)}</Text>
              {cartao && <Text style={s.summaryDate}>Vence no dia {cartao.vencimento}</Text>}
              <TouchableOpacity style={s.btnPagar} onPress={handlePagar} disabled={total <= 0}>
                <Banknote size={20} color={Colors.textInverse} />
                <Text style={s.btnPagarText}>Pagar Fatura</Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={<Text style={s.empty}>Nenhuma transação nesta fatura.</Text>}
          renderItem={({ item }) => {
            const catLabel = CATEGORIAS.find(c => c.id === item.categoria)?.label || item.categoria;
            return (
              <View style={s.item}>
                <View style={s.itemInfo}>
                  <Text style={s.itemTitle}>{item.titulo}</Text>
                  <Text style={s.itemSubtitle}>{formatarData(item.data)} • {catLabel}</Text>
                </View>
                <Text style={s.itemVal}>{formatarMoeda(item.valor)}</Text>
              </View>
            )
          }}
        />
      )}
    </View>
  );
}

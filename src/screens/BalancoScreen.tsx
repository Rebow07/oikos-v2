import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ArrowRight } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { useTransacoes } from '../hooks/useTransacoes';
import { formatarMoeda, corAvatar, iniciais } from '../utils';
import { MESES } from '../constants';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
    headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary },
    scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    mesLabel: { fontSize: FontSize.md, color: C.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary, marginBottom: Spacing.md, marginTop: Spacing.md },
    memberCard: { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    avatarText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#FFFFFF' },
    memberInfo: { flex: 1 },
    memberName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: C.textPrimary },
    memberValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    debtCard: { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    debtNames: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
    debtName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: C.textPrimary },
    debtValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.despesa },
    emptyText: { fontSize: FontSize.md, color: C.textMuted, textAlign: 'center', paddingVertical: Spacing.xxl },
  });
}

export default function BalancoScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { membros, mesSelecionado, anoSelecionado } = useApp();
  const { transacoes } = useTransacoes('despesa');

  // Gasto por membro
  const gastosPorMembro = useMemo(() => {
    const map = new Map<string, number>();
    transacoes.forEach((t) => {
      map.set(t.criado_por, (map.get(t.criado_por) || 0) + t.valor);
    });
    return map;
  }, [transacoes]);

  const totalGeral = useMemo(() => {
    let total = 0;
    gastosPorMembro.forEach((v) => { total += v; });
    return total;
  }, [gastosPorMembro]);

  const mediaPorPessoa = membros.length > 0 ? totalGeral / membros.length : 0;

  // Algoritmo de liquidação mínima
  const dividas = useMemo(() => {
    if (membros.length < 2) return [];

    const saldos = membros.map((m, i) => ({
      userId: m.user_id,
      nome: m.nome,
      saldo: (gastosPorMembro.get(m.user_id) || 0) - mediaPorPessoa,
      idx: i,
    }));

    const devedores = saldos.filter((s) => s.saldo < -0.01).map((s) => ({ ...s, saldo: Math.abs(s.saldo) }));
    const credores = saldos.filter((s) => s.saldo > 0.01).map((s) => ({ ...s }));

    devedores.sort((a, b) => b.saldo - a.saldo);
    credores.sort((a, b) => b.saldo - a.saldo);

    const transfers: { de: string; para: string; valor: number }[] = [];

    let i = 0, j = 0;
    while (i < devedores.length && j < credores.length) {
      const amount = Math.min(devedores[i].saldo, credores[j].saldo);
      if (amount > 0.01) {
        transfers.push({ de: devedores[i].nome, para: credores[j].nome, valor: Math.round(amount * 100) / 100 });
      }
      devedores[i].saldo -= amount;
      credores[j].saldo -= amount;
      if (devedores[i].saldo < 0.01) i++;
      if (credores[j].saldo < 0.01) j++;
    }

    return transfers;
  }, [membros, gastosPorMembro, mediaPorPessoa]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>Balanço</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><X size={24} color={Colors.textPrimary} /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.mesLabel}>{MESES[mesSelecionado - 1]} {anoSelecionado} · Média: {formatarMoeda(mediaPorPessoa)}/pessoa</Text>

        <Text style={s.sectionTitle}>Gastos por membro</Text>
        {membros.map((m, idx) => {
          const gasto = gastosPorMembro.get(m.user_id) || 0;
          const diff = gasto - mediaPorPessoa;
          return (
            <View key={m.user_id} style={s.memberCard}>
              <View style={[s.avatar, { backgroundColor: corAvatar(idx) }]}>
                <Text style={s.avatarText}>{iniciais(m.nome)}</Text>
              </View>
              <View style={s.memberInfo}>
                <Text style={s.memberName}>{m.nome}</Text>
              </View>
              <Text style={[s.memberValue, { color: diff >= 0 ? Colors.renda : Colors.despesa }]}>
                {formatarMoeda(gasto)}
              </Text>
            </View>
          );
        })}

        <Text style={[s.sectionTitle, { marginTop: Spacing.lg }]}>Acerto de contas</Text>
        {dividas.length === 0 ? (
          <Text style={s.emptyText}>Tudo acertado! Ninguém deve nada.</Text>
        ) : (
          dividas.map((d, i) => (
            <View key={i} style={s.debtCard}>
              <View style={s.debtNames}>
                <Text style={s.debtName}>{d.de}</Text>
                <ArrowRight size={16} color={Colors.textMuted} />
                <Text style={s.debtName}>{d.para}</Text>
              </View>
              <Text style={s.debtValue}>{formatarMoeda(d.valor)}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

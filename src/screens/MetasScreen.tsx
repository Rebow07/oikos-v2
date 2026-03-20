import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, AlertTriangle } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { useTransacoes } from '../hooks/useTransacoes';
import { buscarMetas, salvarMeta, excluirMeta } from '../services/metas.service';
import { formatarMoeda } from '../utils';
import { CATEGORIAS, MESES } from '../constants';
import CategoriaIcon from '../components/CategoriaIcon';
import type { Meta } from '../types';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
    headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary },
    scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    mesLabel: { fontSize: FontSize.md, color: C.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },
    card: { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
    cardInfo: { flex: 1, marginLeft: Spacing.md },
    cardCat: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: C.textPrimary },
    cardValues: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
    cardGasto: { fontSize: FontSize.sm, color: C.textSecondary },
    cardLimite: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: C.textPrimary },
    barBg: { height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
    barFill: { height: 8, borderRadius: 4 },
    alertRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs },
    alertText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
    metaInput: { flex: 1, backgroundColor: C.background, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.sm, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    saveBtn: { backgroundColor: C.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm },
    saveBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: C.textInverse },
    removeBtn: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm },
    removeBtnText: { fontSize: FontSize.xs, color: C.despesa, fontWeight: FontWeight.bold },
  });
}

export default function MetasScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { usuario, grupoId, mesSelecionado, anoSelecionado } = useApp();
  const { porCategoria } = useTransacoes('despesa');
  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    try {
      const data = await buscarMetas(grupoId, mesSelecionado, anoSelecionado);
      setMetas(data);
      const inp: Record<string, string> = {};
      data.forEach((m) => { inp[m.categoria] = String(m.valor_limite); });
      setInputs(inp);
    } finally { setLoading(false); }
  }, [grupoId, mesSelecionado, anoSelecionado]);

  useEffect(() => { carregar(); }, [carregar]);

  const gastoMap = new Map(porCategoria.map((p) => [p.categoria, p.valor]));

  const handleSalvar = useCallback(async (catId: string) => {
    const val = parseFloat((inputs[catId] || '0').replace(',', '.'));
    if (isNaN(val) || val <= 0) { Alert.alert('Erro', 'Valor inválido.'); return; }
    await salvarMeta({ grupo_id: grupoId, criado_por: usuario.id, categoria: catId, valor_limite: val, mes: mesSelecionado, ano: anoSelecionado });
    carregar();
  }, [inputs, grupoId, usuario, mesSelecionado, anoSelecionado, carregar]);

  const handleRemover = useCallback(async (catId: string) => {
    const meta = metas.find((m) => m.categoria === catId);
    if (meta) { await excluirMeta(meta.id); carregar(); }
  }, [metas, carregar]);

  const items = CATEGORIAS.map((cat) => ({
    ...cat, gasto: gastoMap.get(cat.id) || 0, meta: metas.find((m) => m.categoria === cat.id),
  })).sort((a, b) => (a.meta && !b.meta ? -1 : !a.meta && b.meta ? 1 : b.gasto - a.gasto));

  if (loading) return <View style={[s.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>Metas por Categoria</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><X size={24} color={Colors.textPrimary} /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.mesLabel}>{MESES[mesSelecionado - 1]} {anoSelecionado}</Text>
        {items.map((item) => {
          const limite = item.meta?.valor_limite || 0;
          const pct = limite > 0 ? (item.gasto / limite) * 100 : 0;
          const over = pct > 100;
          const near = pct > 80 && !over;
          const barColor = over ? Colors.despesa : near ? '#F39C12' : Colors.renda;
          return (
            <View key={item.id} style={s.card}>
              <View style={s.cardHeader}>
                <CategoriaIcon categoria={item.id} size={36} />
                <View style={s.cardInfo}><Text style={s.cardCat}>{item.label}</Text></View>
              </View>
              {!!item.meta && (
                <>
                  <View style={s.cardValues}>
                    <Text style={s.cardGasto}>Gasto: {formatarMoeda(item.gasto)}</Text>
                    <Text style={s.cardLimite}>Limite: {formatarMoeda(limite)}</Text>
                  </View>
                  <View style={s.barBg}><View style={[s.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }]} /></View>
                  {over && <View style={s.alertRow}><AlertTriangle size={12} color={Colors.despesa} /><Text style={[s.alertText, { color: Colors.despesa }]}>Ultrapassou em {formatarMoeda(item.gasto - limite)}</Text></View>}
                  {near && <View style={s.alertRow}><AlertTriangle size={12} color="#F39C12" /><Text style={[s.alertText, { color: '#F39C12' }]}>Próximo do limite ({Math.round(pct)}%)</Text></View>}
                </>
              )}
              <View style={s.inputRow}>
                <TextInput style={s.metaInput} placeholder={item.meta ? String(limite) : 'Limite R$'} placeholderTextColor={Colors.textMuted} value={inputs[item.id] || ''} onChangeText={(t) => setInputs((p) => ({ ...p, [item.id]: t }))} keyboardType="decimal-pad" />
                <TouchableOpacity style={s.saveBtn} onPress={() => handleSalvar(item.id)}><Text style={s.saveBtnText}>Salvar</Text></TouchableOpacity>
                {!!item.meta && <TouchableOpacity style={s.removeBtn} onPress={() => handleRemover(item.id)}><Text style={s.removeBtnText}>Remover</Text></TouchableOpacity>}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

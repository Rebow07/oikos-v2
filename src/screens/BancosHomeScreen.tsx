import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, TextInput, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, X, Building2, ChevronRight } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabase';
import { formatarMoeda } from '../utils';
import { BANCOS } from '../constants';
import type { ContaBancaria } from '../types';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
    title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: C.textPrimary, marginBottom: Spacing.md },
    totalCard: { backgroundColor: C.cardDark, borderRadius: Radius.lg, padding: Spacing.lg, marginHorizontal: Spacing.md, marginBottom: Spacing.md },
    totalLabel: { fontSize: FontSize.sm, color: C.textOnCard, opacity: 0.6 },
    totalValue: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold, color: C.primary, marginTop: 4 },
    totalSub: { fontSize: FontSize.xs, color: C.textOnCard, opacity: 0.5, marginTop: 4 },
    list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    card: { backgroundColor: C.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    cardIcon: { width: 48, height: 48, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    cardInfo: { flex: 1 },
    cardNome: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.textPrimary },
    cardBanco: { fontSize: FontSize.xs, color: C.textMuted, marginTop: 2 },
    cardSaldo: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginRight: Spacing.sm },
    emptyText: { fontSize: FontSize.md, color: C.textMuted, textAlign: 'center', paddingVertical: Spacing.xxl },
    fab: { position: 'absolute', right: Spacing.md, bottom: Spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 },
    modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: C.background, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingBottom: Spacing.xxl, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },
    modalScroll: { paddingHorizontal: Spacing.md },
    label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: C.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.lg },
    input: { backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    bancosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    bancoItem: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, borderColor: C.border },
    bancoItemSel: { borderColor: C.primary, backgroundColor: C.primary + '15' },
    bancoText: { fontSize: FontSize.sm, color: C.textPrimary },
    bancoTextSel: { color: C.primary, fontWeight: FontWeight.bold },
    submitBtn: { backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.lg },
    submitBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textInverse },
  });
}

export default function BancosHomeScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { usuario, grupoId } = useApp();

  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [nome, setNome] = useState('');
  const [banco, setBanco] = useState('nubank');
  const [saving, setSaving] = useState(false);

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('contas').select('*').eq('grupo_id', grupoId).eq('ativo', true).order('nome');
    setContas((data as ContaBancaria[]) || []); setLoading(false);
  }, [grupoId]);

  useEffect(() => { if (grupoId) carregar(); }, [grupoId, carregar]);

  const totalSaldo = contas.reduce((a, c) => a + Number(c.saldo_atual || 0), 0);
  const getBanco = (id: string) => BANCOS.find((b) => b.id === id);

  const handleCriar = useCallback(async () => {
    if (!nome.trim()) { Alert.alert('Erro', 'Informe o nome.'); return; }
    const b = getBanco(banco);
    setSaving(true);
    try {
      await supabase.from('contas').insert({ grupo_id: grupoId, criado_por: usuario.id, nome: nome.trim(), banco, tipo: 'corrente', saldo_inicial: 0, saldo_atual: 0, cor: b?.cor || '#2980B9', ativo: true });
      setShowModal(false); setNome(''); carregar();
    } catch (err: any) { Alert.alert('Erro', err.message); } finally { setSaving(false); }
  }, [nome, banco, grupoId, usuario, carregar]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}><Text style={s.title}>Bancos</Text></View>
      <FlatList data={contas} keyExtractor={(i) => i.id} contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={carregar} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <View style={s.totalCard}><Text style={s.totalLabel}>Patrimônio total</Text><Text style={s.totalValue}>{formatarMoeda(totalSaldo)}</Text><Text style={s.totalSub}>{contas.length} banco{contas.length !== 1 ? 's' : ''}</Text></View>
        }
        renderItem={({ item }) => {
          const b = getBanco(item.banco);
          return (
            <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={() => navigation.navigate('BancoDetalhe', { contaId: item.id, contaNome: item.nome })}>
              <View style={[s.cardIcon, { backgroundColor: (b?.cor || '#2980B9') + '18' }]}><Building2 size={22} color={b?.cor || '#2980B9'} /></View>
              <View style={s.cardInfo}><Text style={s.cardNome}>{item.nome}</Text><Text style={s.cardBanco}>{b?.label || item.banco}</Text></View>
              <Text style={[s.cardSaldo, { color: Number(item.saldo_atual) >= 0 ? Colors.renda : Colors.despesa }]}>{formatarMoeda(Number(item.saldo_atual || 0))}</Text>
              <ChevronRight size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={s.emptyText}>{loading ? 'Carregando...' : 'Nenhum banco'}</Text>}
      />
      <TouchableOpacity style={s.fab} onPress={() => setShowModal(true)} activeOpacity={0.8}><Plus size={26} color={Colors.textInverse} /></TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHeader}><Text style={s.modalTitle}>Novo Banco</Text><TouchableOpacity onPress={() => setShowModal(false)}><X size={22} color={Colors.textPrimary} /></TouchableOpacity></View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Nome</Text>
              <TextInput style={s.input} placeholder="Ex: Nubank Principal" placeholderTextColor={Colors.textMuted} value={nome} onChangeText={setNome} />
              <Text style={s.label}>Banco</Text>
              <View style={s.bancosGrid}>{BANCOS.map((b) => (
                <TouchableOpacity key={b.id} style={[s.bancoItem, banco === b.id && s.bancoItemSel]} onPress={() => setBanco(b.id)}>
                  <Text style={[s.bancoText, banco === b.id && s.bancoTextSel]}>{b.label}</Text>
                </TouchableOpacity>
              ))}</View>
              <TouchableOpacity style={[s.submitBtn, saving && { opacity: 0.5 }]} onPress={handleCriar} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.textInverse} /> : <Text style={s.submitBtnText}>Criar</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

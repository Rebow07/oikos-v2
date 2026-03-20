import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Plus, Trash2, Building2 } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabase';
import { formatarMoeda } from '../utils';
import { BANCOS } from '../constants';
import type { ContaBancaria } from '../types';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
    headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary },
    list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    totalCard: { backgroundColor: C.primary + '15', borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.lg, alignItems: 'center' },
    totalLabel: { fontSize: FontSize.sm, color: C.primary, fontWeight: FontWeight.semibold },
    totalValue: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold, color: C.primary, marginTop: Spacing.xs },
    card: { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    cardIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    cardInfo: { flex: 1 },
    cardNome: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: C.textPrimary },
    cardBanco: { fontSize: FontSize.xs, color: C.textMuted, marginTop: 2 },
    cardSaldo: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    emptyText: { fontSize: FontSize.md, color: C.textMuted, textAlign: 'center', paddingVertical: Spacing.xxl },
    fab: { position: 'absolute', right: Spacing.md, bottom: Spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 },
    modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: C.background, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingBottom: Spacing.xxl, maxHeight: '80%' },
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

export default function ContasBancariasScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { usuario, grupoId } = useApp();

  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [nome, setNome] = useState('');
  const [banco, setBanco] = useState('nubank');
  const [saldoInicial, setSaldoInicial] = useState('');
  const [saving, setSaving] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('contas')
        .select('*')
        .eq('grupo_id', grupoId)
        .eq('ativo', true)
        .order('nome');

      if (error) {
        console.error('Erro buscar contas:', error.message);
        setContas([]);
      } else {
        setContas((data as ContaBancaria[]) || []);
      }
    } catch (err) {
      console.error('Erro contas:', err);
    } finally {
      setLoading(false);
    }
  }, [grupoId]);

  useEffect(() => { if (grupoId) carregar(); }, [grupoId, carregar]);

  const totalSaldo = contas.reduce((acc, c) => acc + Number(c.saldo_atual || 0), 0);
  const getBancoInfo = (id: string) => BANCOS.find((b) => b.id === id);

  const handleCriar = useCallback(async () => {
    if (!nome.trim()) { Alert.alert('Erro', 'Informe o nome.'); return; }
    const val = parseFloat(saldoInicial.replace(',', '.')) || 0;
    const bancoInfo = getBancoInfo(banco);
    setSaving(true);
    try {
      const { error } = await supabase.from('contas').insert({
        grupo_id: grupoId,
        criado_por: usuario.id,
        nome: nome.trim(),
        banco,
        tipo: 'corrente',
        saldo_inicial: val,
        saldo_atual: val,
        cor: bancoInfo?.cor || '#2980B9',
        ativo: true,
      });
      if (error) throw error;
      setShowModal(false); setNome(''); setSaldoInicial(''); carregar();
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally { setSaving(false); }
  }, [nome, banco, saldoInicial, grupoId, usuario, carregar]);

  const handleExcluir = useCallback((c: ContaBancaria) => {
    Alert.alert('Excluir', `Remover "${c.nome}"?`, [
      { text: 'Cancelar' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        await supabase.from('contas').update({ ativo: false }).eq('id', c.id);
        carregar();
      }},
    ]);
  }, [carregar]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>Contas Bancárias</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><X size={24} color={Colors.textPrimary} /></TouchableOpacity>
      </View>

      <FlatList data={contas} keyExtractor={(item) => item.id} contentContainerStyle={s.list}
        ListHeaderComponent={
          <View style={s.totalCard}>
            <Text style={s.totalLabel}>Saldo total</Text>
            <Text style={s.totalValue}>{formatarMoeda(totalSaldo)}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const b = getBancoInfo(item.banco);
          return (
            <View style={s.card}>
              <View style={[s.cardIcon, { backgroundColor: (b?.cor || item.cor || '#2980B9') + '20' }]}>
                <Building2 size={20} color={b?.cor || item.cor || '#2980B9'} />
              </View>
              <View style={s.cardInfo}>
                <Text style={s.cardNome}>{item.nome}</Text>
                <Text style={s.cardBanco}>{b?.label || item.banco} · {item.tipo || 'corrente'}</Text>
              </View>
              <Text style={[s.cardSaldo, { color: Number(item.saldo_atual) >= 0 ? Colors.renda : Colors.despesa }]}>
                {formatarMoeda(Number(item.saldo_atual || 0))}
              </Text>
              <TouchableOpacity style={{ marginLeft: Spacing.sm }} onPress={() => handleExcluir(item)}>
                <Trash2 size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={s.emptyText}>{loading ? 'Carregando...' : 'Nenhuma conta cadastrada'}</Text>}
      />

      <TouchableOpacity style={s.fab} onPress={() => setShowModal(true)} activeOpacity={0.8}>
        <Plus size={26} color={Colors.textInverse} />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Nova Conta</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><X size={22} color={Colors.textPrimary} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Nome</Text>
              <TextInput style={s.input} placeholder="Ex: Conta Principal" placeholderTextColor={Colors.textMuted} value={nome} onChangeText={setNome} />

              <Text style={s.label}>Banco</Text>
              <View style={s.bancosGrid}>
                {BANCOS.map((b) => (
                  <TouchableOpacity key={b.id} style={[s.bancoItem, banco === b.id && s.bancoItemSel]} onPress={() => setBanco(b.id)}>
                    <Text style={[s.bancoText, banco === b.id && s.bancoTextSel]}>{b.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Saldo inicial (R$)</Text>
              <TextInput style={s.input} placeholder="0,00" placeholderTextColor={Colors.textMuted} value={saldoInicial} onChangeText={setSaldoInicial} keyboardType="decimal-pad" />

              <TouchableOpacity style={[s.submitBtn, saving && { opacity: 0.5 }]} onPress={handleCriar} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.textInverse} /> : <Text style={s.submitBtnText}>Criar Conta</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, X, Trash2, ArrowUpCircle, ArrowDownCircle, Wallet, PiggyBank, TrendingUp, CreditCard } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabase';
import { formatarMoeda, formatarData } from '../utils';
import type { Subconta, MovimentacaoBanco } from '../types';

const TIPOS_SUBCONTA = [
  { id: 'corrente', label: 'Conta Corrente', icon: CreditCard, cor: '#2980B9' },
  { id: 'poupanca', label: 'Poupança', icon: Wallet, cor: '#27AE60' },
  { id: 'caixinha', label: 'Caixinha', icon: PiggyBank, cor: '#E67E22' },
  { id: 'investimento', label: 'Investimento', icon: TrendingUp, cor: '#8E44AD' },
];

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: Spacing.md },
    headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary, flex: 1 },
    scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    totalCard: { backgroundColor: C.cardDark, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
    totalLabel: { fontSize: FontSize.sm, color: C.textOnCard, opacity: 0.6 },
    totalValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: C.primary, marginTop: 4 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md, marginTop: Spacing.md },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary + '15', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full },
    addBtnText: { fontSize: FontSize.xs, color: C.primary, fontWeight: FontWeight.bold },
    // Subconta card
    subCard: { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    subIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    subInfo: { flex: 1 },
    subNome: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: C.textPrimary },
    subTipo: { fontSize: FontSize.xs, color: C.textMuted, marginTop: 2 },
    subSaldo: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    subActions: { flexDirection: 'row', gap: Spacing.sm, marginLeft: Spacing.sm },
    // Extrato
    movItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    movIcon: { marginRight: Spacing.md },
    movInfo: { flex: 1 },
    movDesc: { fontSize: FontSize.sm, color: C.textPrimary },
    movData: { fontSize: FontSize.xs, color: C.textMuted },
    movValor: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
    emptyText: { fontSize: FontSize.sm, color: C.textMuted, textAlign: 'center', paddingVertical: Spacing.lg },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: C.background, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingBottom: Spacing.xxl, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },
    modalScroll: { paddingHorizontal: Spacing.md },
    label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: C.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.lg },
    input: { backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    tipoRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
    tipoItem: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, borderColor: C.border },
    tipoItemSel: { borderColor: C.primary, backgroundColor: C.primary + '15' },
    tipoText: { fontSize: FontSize.sm, color: C.textPrimary },
    tipoTextSel: { color: C.primary, fontWeight: FontWeight.bold },
    submitBtn: { backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.lg },
    submitBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textInverse },
    // Mov type buttons
    movTypeRow: { flexDirection: 'row', gap: Spacing.sm },
    movTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.md, borderRadius: Radius.sm, borderWidth: 1, borderColor: C.border },
    movTypeBtnSel: { borderWidth: 2 },
  });
}

export default function BancoDetalheScreen({ route, navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { usuario, grupoId } = useApp();
  const { contaId, contaNome } = route.params;

  const [subcontas, setSubcontas] = useState<Subconta[]>([]);
  const [movimentos, setMovimentos] = useState<MovimentacaoBanco[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showMovModal, setShowMovModal] = useState(false);
  const [subcontaSel, setSubcontaSel] = useState<Subconta | null>(null);

  // Sub form
  const [subNome, setSubNome] = useState('');
  const [subTipo, setSubTipo] = useState('corrente');
  const [subSaldo, setSubSaldo] = useState('');
  const [saving, setSaving] = useState(false);

  // Mov form
  const [movTipo, setMovTipo] = useState<'entrada' | 'saida'>('entrada');
  const [movValor, setMovValor] = useState('');
  const [movDesc, setMovDesc] = useState('');

  const carregar = useCallback(async () => {
    const [subsRes, movsRes] = await Promise.all([
      supabase.from('subcontas').select('*').eq('conta_id', contaId).order('criado_em'),
      supabase.from('movimentacoes_banco').select('*').eq('conta_id', contaId).order('data', { ascending: false }).limit(30),
    ]);
    setSubcontas((subsRes.data as Subconta[]) || []);
    setMovimentos((movsRes.data as MovimentacaoBanco[]) || []);
    setLoading(false);
  }, [contaId]);

  useEffect(() => { carregar(); }, [carregar]);

  const totalSub = subcontas.reduce((a, s) => a + Number(s.saldo || 0), 0);

  const handleCriarSub = useCallback(async () => {
    if (!subNome.trim()) { Alert.alert('Erro', 'Nome obrigatório.'); return; }
    const val = parseFloat(subSaldo.replace(',', '.')) || 0;
    setSaving(true);
    try {
      await supabase.from('subcontas').insert({ conta_id: contaId, grupo_id: grupoId, criado_por: usuario.id, nome: subNome.trim(), tipo: subTipo, saldo: val });
      await supabase.rpc('recalcular_saldo_conta', { p_conta_id: contaId });
      setShowSubModal(false); setSubNome(''); setSubSaldo(''); carregar();
    } catch (err: any) { Alert.alert('Erro', err.message); } finally { setSaving(false); }
  }, [subNome, subTipo, subSaldo, contaId, grupoId, usuario, carregar]);

  const handleMov = useCallback(async () => {
    if (!subcontaSel) return;
    const val = parseFloat(movValor.replace(',', '.'));
    if (isNaN(val) || val <= 0) { Alert.alert('Erro', 'Valor inválido.'); return; }
    try {
      await supabase.from('movimentacoes_banco').insert({
        subconta_id: subcontaSel.id, conta_id: contaId, grupo_id: grupoId, criado_por: usuario.id,
        tipo: movTipo, valor: val, descricao: movDesc.trim() || null,
      });
      // Update subconta saldo
      const novoSaldo = movTipo === 'entrada' ? Number(subcontaSel.saldo) + val : Number(subcontaSel.saldo) - val;
      await supabase.from('subcontas').update({ saldo: novoSaldo }).eq('id', subcontaSel.id);
      await supabase.rpc('recalcular_saldo_conta', { p_conta_id: contaId });
      setShowMovModal(false); setMovValor(''); setMovDesc(''); carregar();
    } catch (err: any) { Alert.alert('Erro', err.message); }
  }, [subcontaSel, movTipo, movValor, movDesc, contaId, grupoId, usuario, carregar]);

  const openMov = (sub: Subconta) => { setSubcontaSel(sub); setMovTipo('entrada'); setMovValor(''); setMovDesc(''); setShowMovModal(true); };

  const handleDeleteSub = (sub: Subconta) => {
    Alert.alert('Excluir', `Remover "${sub.nome}"?`, [
      { text: 'Cancelar' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        await supabase.from('subcontas').delete().eq('id', sub.id);
        await supabase.rpc('recalcular_saldo_conta', { p_conta_id: contaId });
        carregar();
      }},
    ]);
  };

  const getTipoInfo = (tipo: string) => TIPOS_SUBCONTA.find((t) => t.id === tipo) || TIPOS_SUBCONTA[0];

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color={Colors.textPrimary} /></TouchableOpacity>
        <Text style={s.headerTitle}>{contaNome}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.totalCard}>
          <Text style={s.totalLabel}>Saldo total neste banco</Text>
          <Text style={s.totalValue}>{formatarMoeda(totalSub)}</Text>
        </View>

        {/* Subcontas */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Contas</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowSubModal(true)}>
            <Plus size={14} color={Colors.primary} /><Text style={s.addBtnText}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        {subcontas.length === 0 ? <Text style={s.emptyText}>Nenhuma conta cadastrada</Text> :
          subcontas.map((sub) => {
            const info = getTipoInfo(sub.tipo);
            const Icon = info.icon;
            return (
              <View key={sub.id} style={s.subCard}>
                <View style={[s.subIcon, { backgroundColor: info.cor + '18' }]}><Icon size={20} color={info.cor} /></View>
                <View style={s.subInfo}>
                  <Text style={s.subNome}>{sub.nome}</Text>
                  <Text style={s.subTipo}>{info.label}</Text>
                </View>
                <Text style={[s.subSaldo, { color: Number(sub.saldo) >= 0 ? Colors.renda : Colors.despesa }]}>{formatarMoeda(Number(sub.saldo))}</Text>
                <View style={s.subActions}>
                  <TouchableOpacity onPress={() => openMov(sub)}><Plus size={18} color={Colors.primary} /></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteSub(sub)}><Trash2 size={16} color={Colors.textMuted} /></TouchableOpacity>
                </View>
              </View>
            );
          })
        }

        {/* Extrato */}
        <View style={[s.sectionHeader, { marginTop: Spacing.lg }]}>
          <Text style={s.sectionTitle}>Extrato</Text>
        </View>

        {movimentos.length === 0 ? <Text style={s.emptyText}>Nenhuma movimentação</Text> :
          movimentos.map((m) => (
            <View key={m.id} style={s.movItem}>
              <View style={s.movIcon}>
                {m.tipo === 'entrada' ? <ArrowUpCircle size={18} color={Colors.renda} /> : <ArrowDownCircle size={18} color={Colors.despesa} />}
              </View>
              <View style={s.movInfo}>
                <Text style={s.movDesc}>{m.descricao || (m.tipo === 'entrada' ? 'Entrada' : 'Saída')}</Text>
                <Text style={s.movData}>{formatarData(m.data || m.criado_em)}</Text>
              </View>
              <Text style={[s.movValor, { color: m.tipo === 'entrada' ? Colors.renda : Colors.despesa }]}>
                {m.tipo === 'entrada' ? '+' : '-'} {formatarMoeda(Number(m.valor))}
              </Text>
            </View>
          ))
        }
      </ScrollView>

      {/* Modal nova subconta */}
      <Modal visible={showSubModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowSubModal(false)}>
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHeader}><Text style={s.modalTitle}>Nova Conta</Text><TouchableOpacity onPress={() => setShowSubModal(false)}><X size={22} color={Colors.textPrimary} /></TouchableOpacity></View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Nome</Text>
              <TextInput style={s.input} placeholder="Ex: Caixinha Viagem" placeholderTextColor={Colors.textMuted} value={subNome} onChangeText={setSubNome} />
              <Text style={s.label}>Tipo</Text>
              <View style={s.tipoRow}>
                {TIPOS_SUBCONTA.map((t) => (
                  <TouchableOpacity key={t.id} style={[s.tipoItem, subTipo === t.id && s.tipoItemSel]} onPress={() => setSubTipo(t.id)}>
                    <Text style={[s.tipoText, subTipo === t.id && s.tipoTextSel]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.label}>Saldo atual (R$)</Text>
              <TextInput style={s.input} placeholder="0,00" placeholderTextColor={Colors.textMuted} value={subSaldo} onChangeText={setSubSaldo} keyboardType="decimal-pad" />
              <TouchableOpacity style={[s.submitBtn, saving && { opacity: 0.5 }]} onPress={handleCriarSub} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.textInverse} /> : <Text style={s.submitBtnText}>Criar</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal movimentação */}
      <Modal visible={showMovModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowMovModal(false)}>
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHeader}><Text style={s.modalTitle}>Nova Movimentação</Text><TouchableOpacity onPress={() => setShowMovModal(false)}><X size={22} color={Colors.textPrimary} /></TouchableOpacity></View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              {subcontaSel && <Text style={[s.label, { marginTop: Spacing.sm }]}>{subcontaSel.nome}</Text>}
              <Text style={s.label}>Tipo</Text>
              <View style={s.movTypeRow}>
                <TouchableOpacity style={[s.movTypeBtn, movTipo === 'entrada' && s.movTypeBtnSel, movTipo === 'entrada' && { borderColor: Colors.renda }]}
                  onPress={() => setMovTipo('entrada')}>
                  <ArrowUpCircle size={16} color={Colors.renda} /><Text style={{ color: Colors.renda, fontWeight: FontWeight.bold, fontSize: FontSize.sm }}>Entrada</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.movTypeBtn, movTipo === 'saida' && s.movTypeBtnSel, movTipo === 'saida' && { borderColor: Colors.despesa }]}
                  onPress={() => setMovTipo('saida')}>
                  <ArrowDownCircle size={16} color={Colors.despesa} /><Text style={{ color: Colors.despesa, fontWeight: FontWeight.bold, fontSize: FontSize.sm }}>Saída</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.label}>Valor (R$)</Text>
              <TextInput style={s.input} placeholder="0,00" placeholderTextColor={Colors.textMuted} value={movValor} onChangeText={setMovValor} keyboardType="decimal-pad" />
              <Text style={s.label}>Descrição (opcional)</Text>
              <TextInput style={s.input} placeholder="Ex: Transferência PIX" placeholderTextColor={Colors.textMuted} value={movDesc} onChangeText={setMovDesc} />
              <TouchableOpacity style={s.submitBtn} onPress={handleMov}>
                <Text style={s.submitBtnText}>Confirmar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, Modal, ActivityIndicator, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Plus, ArrowUpCircle, ArrowDownCircle, Trash2 } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { buscarReservas, criarReserva, excluirReserva, registrarMovimento, buscarMovimentos } from '../services/reservas.service';
import { formatarMoeda, formatarData } from '../utils';
import type { Reserva, ReservaMovimento } from '../types';

const CORES = ['#c9a227', '#2980B9', '#E74C3C', '#27AE60', '#8E44AD', '#E67E22', '#1ABC9C'];
const ICONES = ['PiggyBank', 'Home', 'Plane', 'Car', 'Heart', 'Gift', 'Target'];

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
    headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary },
    scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    card: { backgroundColor: C.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
    cardDot: { width: 14, height: 14, borderRadius: 7, marginRight: Spacing.sm },
    cardName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary, flex: 1 },
    cardDesc: { fontSize: FontSize.xs, color: C.textMuted, marginBottom: Spacing.md },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
    progressLabel: { fontSize: FontSize.sm, color: C.textSecondary },
    progressValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: C.textPrimary },
    barBg: { height: 10, backgroundColor: C.border, borderRadius: 5, overflow: 'hidden', marginBottom: Spacing.sm },
    barFill: { height: 10, borderRadius: 5 },
    pctText: { fontSize: FontSize.xs, color: C.textMuted, textAlign: 'right', marginBottom: Spacing.md },
    actionsRow: { flexDirection: 'row', gap: Spacing.sm },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, borderRadius: Radius.sm, gap: Spacing.xs },
    actionDeposit: { backgroundColor: C.renda + '15' },
    actionWithdraw: { backgroundColor: C.despesa + '15' },
    actionText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
    emptyText: { fontSize: FontSize.md, color: C.textMuted, textAlign: 'center', paddingVertical: Spacing.xxl },
    fab: { position: 'absolute', right: Spacing.md, bottom: Spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 },
    // Modals
    modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: C.background, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingBottom: Spacing.xxl, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },
    modalScroll: { paddingHorizontal: Spacing.md },
    label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: C.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.lg },
    input: { backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    coresRow: { flexDirection: 'row', gap: Spacing.sm },
    corItem: { width: 32, height: 32, borderRadius: 16 },
    corItemSel: { borderWidth: 3, borderColor: C.textPrimary },
    submitBtn: { backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.lg },
    submitBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textInverse },
    movItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    movText: { fontSize: FontSize.sm, color: C.textSecondary },
    movValor: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  });
}

export default function ReservasScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { usuario, grupoId } = useApp();

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCriar, setShowCriar] = useState(false);
  const [showMov, setShowMov] = useState(false);
  const [reservaSel, setReservaSel] = useState<Reserva | null>(null);
  const [movimentos, setMovimentos] = useState<ReservaMovimento[]>([]);
  const [movTipo, setMovTipo] = useState<'deposito' | 'saque'>('deposito');
  const [movValor, setMovValor] = useState('');
  const [movDesc, setMovDesc] = useState('');

  // Create form
  const [nome, setNome] = useState('');
  const [desc, setDesc] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [cor, setCor] = useState(CORES[0]);
  const [saving, setSaving] = useState(false);

  const carregar = useCallback(async () => {
    try { const data = await buscarReservas(grupoId); setReservas(data); } finally { setLoading(false); }
  }, [grupoId]);

  useEffect(() => { carregar(); }, [carregar]);

  const handleCriar = useCallback(async () => {
    const val = parseFloat(objetivo.replace(',', '.'));
    if (!nome.trim() || isNaN(val) || val <= 0) { Alert.alert('Erro', 'Preencha nome e objetivo.'); return; }
    setSaving(true);
    try {
      await criarReserva({ grupo_id: grupoId, criado_por: usuario.id, nome: nome.trim(), descricao: desc.trim() || null, valor_objetivo: val, cor, icone: 'PiggyBank' });
      setShowCriar(false); setNome(''); setDesc(''); setObjetivo(''); carregar();
    } catch (err: any) { Alert.alert('Erro', err.message); } finally { setSaving(false); }
  }, [nome, desc, objetivo, cor, grupoId, usuario, carregar]);

  const openMov = useCallback(async (r: Reserva, tipo: 'deposito' | 'saque') => {
    setReservaSel(r); setMovTipo(tipo); setMovValor(''); setMovDesc(''); setShowMov(true);
    const movs = await buscarMovimentos(r.id); setMovimentos(movs);
  }, []);

  const handleMov = useCallback(async () => {
    if (!reservaSel) return;
    const val = parseFloat(movValor.replace(',', '.'));
    if (isNaN(val) || val <= 0) { Alert.alert('Erro', 'Valor inválido.'); return; }
    try {
      await registrarMovimento({ reserva_id: reservaSel.id, grupo_id: grupoId, criado_por: usuario.id, tipo: movTipo, valor: val, descricao: movDesc.trim() || null });
      setShowMov(false); carregar();
    } catch (err: any) { Alert.alert('Erro', err.message); }
  }, [reservaSel, movValor, movDesc, movTipo, grupoId, usuario, carregar]);

  const handleExcluir = useCallback((r: Reserva) => {
    Alert.alert('Excluir', `Remover "${r.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => { await excluirReserva(r.id); carregar(); } },
    ]);
  }, [carregar]);

  if (loading) return <View style={[s.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>Reservas</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><X size={24} color={Colors.textPrimary} /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {reservas.length === 0 ? <Text style={s.emptyText}>Nenhuma reserva criada</Text> : reservas.map((r) => {
          const pct = r.valor_objetivo > 0 ? (r.valor_atual / r.valor_objetivo) * 100 : 0;
          return (
            <View key={r.id} style={s.card}>
              <View style={s.cardTop}>
                <View style={[s.cardDot, { backgroundColor: r.cor }]} />
                <Text style={s.cardName}>{r.nome}</Text>
                <TouchableOpacity onPress={() => handleExcluir(r)}><Trash2 size={16} color={Colors.textMuted} /></TouchableOpacity>
              </View>
              {r.descricao ? <Text style={s.cardDesc}>{r.descricao}</Text> : null}
              <View style={s.progressRow}>
                <Text style={s.progressLabel}>{formatarMoeda(r.valor_atual)}</Text>
                <Text style={s.progressValue}>{formatarMoeda(r.valor_objetivo)}</Text>
              </View>
              <View style={s.barBg}><View style={[s.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: r.cor }]} /></View>
              <Text style={s.pctText}>{Math.round(pct)}%</Text>
              <View style={s.actionsRow}>
                <TouchableOpacity style={[s.actionBtn, s.actionDeposit]} onPress={() => openMov(r, 'deposito')}>
                  <ArrowUpCircle size={16} color={Colors.renda} /><Text style={[s.actionText, { color: Colors.renda }]}>Depositar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, s.actionWithdraw]} onPress={() => openMov(r, 'saque')}>
                  <ArrowDownCircle size={16} color={Colors.despesa} /><Text style={[s.actionText, { color: Colors.despesa }]}>Sacar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={() => setShowCriar(true)} activeOpacity={0.8}>
        <Plus size={26} color={Colors.textInverse} />
      </TouchableOpacity>

      {/* Modal criar reserva */}
      <Modal visible={showCriar} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowCriar(false)}>
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHeader}><Text style={s.modalTitle}>Nova Reserva</Text><TouchableOpacity onPress={() => setShowCriar(false)}><X size={22} color={Colors.textPrimary} /></TouchableOpacity></View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Nome</Text>
              <TextInput style={s.input} placeholder="Ex: Viagem" placeholderTextColor={Colors.textMuted} value={nome} onChangeText={setNome} />
              <Text style={s.label}>Descrição (opcional)</Text>
              <TextInput style={s.input} placeholder="Detalhes..." placeholderTextColor={Colors.textMuted} value={desc} onChangeText={setDesc} />
              <Text style={s.label}>Valor objetivo (R$)</Text>
              <TextInput style={s.input} placeholder="0,00" placeholderTextColor={Colors.textMuted} value={objetivo} onChangeText={setObjetivo} keyboardType="decimal-pad" />
              <Text style={s.label}>Cor</Text>
              <View style={s.coresRow}>{CORES.map((c) => <TouchableOpacity key={c} style={[s.corItem, { backgroundColor: c }, cor === c && s.corItemSel]} onPress={() => setCor(c)} />)}</View>
              <TouchableOpacity style={[s.submitBtn, saving && { opacity: 0.5 }]} onPress={handleCriar} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.textInverse} /> : <Text style={s.submitBtnText}>Criar Reserva</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal movimento */}
      <Modal visible={showMov} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowMov(false)}>
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHeader}><Text style={s.modalTitle}>{movTipo === 'deposito' ? 'Depositar' : 'Sacar'}</Text><TouchableOpacity onPress={() => setShowMov(false)}><X size={22} color={Colors.textPrimary} /></TouchableOpacity></View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Valor (R$)</Text>
              <TextInput style={s.input} placeholder="0,00" placeholderTextColor={Colors.textMuted} value={movValor} onChangeText={setMovValor} keyboardType="decimal-pad" />
              <Text style={s.label}>Descrição (opcional)</Text>
              <TextInput style={s.input} placeholder="Motivo..." placeholderTextColor={Colors.textMuted} value={movDesc} onChangeText={setMovDesc} />
              <TouchableOpacity style={s.submitBtn} onPress={handleMov}>
                <Text style={s.submitBtnText}>Confirmar</Text>
              </TouchableOpacity>

              {movimentos.length > 0 && <>
                <Text style={s.label}>Histórico</Text>
                {movimentos.slice(0, 10).map((m) => (
                  <View key={m.id} style={s.movItem}>
                    <Text style={s.movText}>{formatarData(m.criado_em)} {m.descricao ? `· ${m.descricao}` : ''}</Text>
                    <Text style={[s.movValor, { color: m.tipo === 'deposito' ? Colors.renda : Colors.despesa }]}>
                      {m.tipo === 'deposito' ? '+' : '-'} {formatarMoeda(m.valor)}
                    </Text>
                  </View>
                ))}
              </>}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

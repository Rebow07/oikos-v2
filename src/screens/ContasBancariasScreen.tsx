import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
  Alert, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Plus, Trash2, Building2, ArrowLeftRight } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabase';
import { formatarMoeda } from '../utils';
import { BANCOS } from '../constants';
import type { ContaBancaria } from '../types';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container:        { flex: 1, backgroundColor: C.background },
    headerBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
    headerTitle:      { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary },
    list:             { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    totalCard:        { backgroundColor: C.primary + '15', borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.md, alignItems: 'center' },
    totalLabel:       { fontSize: FontSize.sm, color: C.primary, fontWeight: FontWeight.semibold },
    totalValue:       { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold, color: C.primary, marginTop: Spacing.xs },
    transferBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, marginTop: Spacing.sm },
    transferBtnText:  { fontSize: FontSize.xs, color: C.textInverse, fontWeight: FontWeight.bold },
    card:             { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    cardIcon:         { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    cardInfo:         { flex: 1 },
    cardNome:         { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: C.textPrimary },
    cardBanco:        { fontSize: FontSize.xs, color: C.textMuted, marginTop: 2 },
    cardSaldo:        { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    emptyText:        { fontSize: FontSize.md, color: C.textMuted, textAlign: 'center', paddingVertical: Spacing.xxl },
    fab:              { position: 'absolute', right: Spacing.md, bottom: Spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 },
    modalOverlay:     { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
    modalContent:     { backgroundColor: C.background, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingBottom: Spacing.xxl, maxHeight: '88%' },
    modalHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    modalTitle:       { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },
    modalScroll:      { paddingHorizontal: Spacing.md },
    label:            { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: C.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.lg },
    input:            { backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    bancosGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    bancoItem:        { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, borderColor: C.border },
    bancoItemSel:     { borderColor: C.primary, backgroundColor: C.primary + '15' },
    bancoText:        { fontSize: FontSize.sm, color: C.textPrimary },
    bancoTextSel:     { color: C.primary, fontWeight: FontWeight.bold },
    submitBtn:        { backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.lg },
    submitBtnDisabled:{ opacity: 0.5 },
    submitBtnText:    { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textInverse },
    // Selector de conta (modal transferência)
    selectorItem:     { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.sm, borderWidth: 1, borderColor: C.border, marginBottom: Spacing.xs, gap: Spacing.sm },
    selectorItemSel:  { borderColor: C.primary, backgroundColor: C.primary + '12' },
    selectorLabel:    { flex: 1, fontSize: FontSize.sm, color: C.textPrimary },
    selectorSaldo:    { fontSize: FontSize.xs, color: C.textMuted },
    selectorDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
    infoBox:          { backgroundColor: C.primary + '10', borderRadius: Radius.sm, padding: Spacing.sm, marginTop: Spacing.sm },
    infoText:         { fontSize: FontSize.xs, color: C.primary },
    arrowBox:         { alignItems: 'center', paddingVertical: Spacing.xs },
  });
}

export default function ContasBancariasScreen({ navigation }: any) {
  const { Colors } = useTheme();
  // ✅ useMemo para evitar recriar StyleSheet a cada render
  const s = useMemo(() => makeStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { usuario, grupoId } = useApp();

  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal nova conta
  const [showModal, setShowModal] = useState(false);
  const [nome, setNome] = useState('');
  const [banco, setBanco] = useState('nubank');
  const [saldoInicial, setSaldoInicial] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal transferência entre contas
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [contaOrigemId, setContaOrigemId] = useState('');
  const [contaDestinoId, setContaDestinoId] = useState('');
  const [transferValor, setTransferValor] = useState('');
  const [transferDesc, setTransferDesc] = useState('');
  const [savingTransfer, setSavingTransfer] = useState(false);

  // ── Carregar contas ─────────────────────────────────────────────────────────

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

  // ── Criar conta ─────────────────────────────────────────────────────────────

  const handleCriar = useCallback(async () => {
    if (!nome.trim()) { Alert.alert('Erro', 'Informe o nome.'); return; }
    const val = parseFloat(saldoInicial.replace(',', '.')) || 0;
    const bancoInfo = getBancoInfo(banco);
    setSaving(true);
    try {
      const { error } = await supabase.from('contas').insert({
        grupo_id:     grupoId,
        criado_por:   usuario?.id,
        nome:         nome.trim(),
        banco,
        tipo:         'corrente',
        saldo_inicial: val,
        saldo_atual:  val,
        cor:          bancoInfo?.cor || '#2980B9',
        ativo:        true,
      });
      if (error) throw error;
      setShowModal(false);
      setNome(''); setSaldoInicial(''); setBanco('nubank');
      carregar();
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setSaving(false);
    }
  }, [nome, banco, saldoInicial, grupoId, usuario, carregar]);

  // ── Excluir conta ───────────────────────────────────────────────────────────

  const handleExcluir = useCallback((c: ContaBancaria) => {
    Alert.alert('Excluir', `Remover "${c.nome}"?`, [
      { text: 'Cancelar' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          await supabase.from('contas').update({ ativo: false }).eq('id', c.id);
          carregar();
        } catch (err: any) {
          Alert.alert('Erro ao excluir', err.message);
        }
      }},
    ]);
  }, [carregar]);

  // ── Transferência entre contas (nível conta, sem subconta específica) ────────

  const contaOrigem  = contas.find((c) => c.id === contaOrigemId);
  const contaDestino = contas.find((c) => c.id === contaDestinoId);

  const handleTransferir = useCallback(async () => {
    const val = parseFloat(transferValor.replace(',', '.'));
    if (!contaOrigemId)  { Alert.alert('Erro', 'Selecione a conta de origem.'); return; }
    if (!contaDestinoId) { Alert.alert('Erro', 'Selecione a conta de destino.'); return; }
    if (contaOrigemId === contaDestinoId) { Alert.alert('Erro', 'Origem e destino não podem ser iguais.'); return; }
    if (isNaN(val) || val <= 0) { Alert.alert('Erro', 'Valor inválido.'); return; }

    const origem  = contas.find((c) => c.id === contaOrigemId)!;
    const destino = contas.find((c) => c.id === contaDestinoId)!;

    if (val > Number(origem.saldo_atual)) {
      Alert.alert(
        'Saldo insuficiente',
        `Saldo disponível em "${origem.nome}": ${formatarMoeda(Number(origem.saldo_atual))}`,
      );
      return;
    }

    setSavingTransfer(true);
    try {
      const agora = new Date().toISOString();
      const descSaida   = transferDesc.trim() || `Transferência → ${destino.nome}`;
      const descEntrada = transferDesc.trim() || `Transferência ← ${origem.nome}`;

      // Registra saída na origem
      await supabase.from('movimentacoes_banco').insert({
        subconta_id: null,
        conta_id:    contaOrigemId,
        grupo_id:    grupoId,
        criado_por:  usuario?.id,
        tipo:        'saida',
        valor:       val,
        descricao:   descSaida,
        data:        agora,
        referencia:  'transferencia_externa',
      });
      // Registra entrada no destino
      await supabase.from('movimentacoes_banco').insert({
        subconta_id: null,
        conta_id:    contaDestinoId,
        grupo_id:    grupoId,
        criado_por:  usuario?.id,
        tipo:        'entrada',
        valor:       val,
        descricao:   descEntrada,
        data:        agora,
        referencia:  'transferencia_externa',
      });
      // Atualiza saldos
      await Promise.all([
        supabase.from('contas').update({ saldo_atual: Number(origem.saldo_atual) - val  }).eq('id', contaOrigemId),
        supabase.from('contas').update({ saldo_atual: Number(destino.saldo_atual) + val }).eq('id', contaDestinoId),
      ]);

      setShowTransferModal(false);
      setContaOrigemId(''); setContaDestinoId('');
      setTransferValor(''); setTransferDesc('');
      carregar();
      Alert.alert('✅ Transferência realizada', `${formatarMoeda(val)} de "${origem.nome}" → "${destino.nome}"`);
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setSavingTransfer(false);
    }
  }, [contaOrigemId, contaDestinoId, transferValor, transferDesc, contas, grupoId, usuario, carregar]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>Contas Bancárias</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={contas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <>
            {/* Card de saldo total + botão transferência */}
            <View style={s.totalCard}>
              <Text style={s.totalLabel}>Saldo total</Text>
              <Text style={s.totalValue}>{formatarMoeda(totalSaldo)}</Text>
              {/* Botão transferência entre contas — só aparece com 2+ contas */}
              {contas.length >= 2 && (
                <TouchableOpacity
                  style={s.transferBtn}
                  onPress={() => {
                    setContaOrigemId('');
                    setContaDestinoId('');
                    setTransferValor('');
                    setTransferDesc('');
                    setShowTransferModal(true);
                  }}
                >
                  <ArrowLeftRight size={14} color={Colors.textInverse} />
                  <Text style={s.transferBtnText}>Transferir entre contas</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
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
              <TouchableOpacity style={{ marginLeft: Spacing.sm }} onPress={() => handleExcluir(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Trash2 size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={s.emptyText}>{loading ? 'Carregando...' : 'Nenhuma conta cadastrada'}</Text>
        }
      />

      <TouchableOpacity style={s.fab} onPress={() => setShowModal(true)} activeOpacity={0.8}>
        <Plus size={26} color={Colors.textInverse} />
      </TouchableOpacity>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL — Nova Conta
      ════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Nova Conta</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Nome</Text>
              <TextInput
                style={s.input}
                placeholder="Ex: Conta Principal"
                placeholderTextColor={Colors.textMuted}
                value={nome}
                onChangeText={setNome}
              />

              <Text style={s.label}>Banco</Text>
              <View style={s.bancosGrid}>
                {BANCOS.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    style={[s.bancoItem, banco === b.id && s.bancoItemSel]}
                    onPress={() => setBanco(b.id)}
                  >
                    <Text style={[s.bancoText, banco === b.id && s.bancoTextSel]}>{b.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Saldo inicial (R$)</Text>
              <TextInput
                style={s.input}
                placeholder="0,00"
                placeholderTextColor={Colors.textMuted}
                value={saldoInicial}
                onChangeText={setSaldoInicial}
                keyboardType="decimal-pad"
              />

              <TouchableOpacity
                style={[s.submitBtn, saving && s.submitBtnDisabled]}
                onPress={handleCriar}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color={Colors.textInverse} />
                  : <Text style={s.submitBtnText}>Criar Conta</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL — Transferência entre Contas
      ════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showTransferModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowTransferModal(false)}>
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Transferência entre Contas</Text>
              <TouchableOpacity onPress={() => setShowTransferModal(false)}>
                <X size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">

              {/* Conta de origem */}
              <Text style={s.label}>De (origem)</Text>
              {contas.map((c) => {
                const sel = contaOrigemId === c.id;
                const b = getBancoInfo(c.banco);
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.selectorItem, sel && s.selectorItemSel]}
                    onPress={() => {
                      setContaOrigemId(c.id);
                      // Se destino for igual à nova origem, limpa destino
                      if (contaDestinoId === c.id) setContaDestinoId('');
                    }}
                  >
                    <View style={s.selectorDot} />
                    <Text style={s.selectorLabel}>{c.nome} {b ? `· ${b.label}` : ''}</Text>
                    <Text style={s.selectorSaldo}>{formatarMoeda(Number(c.saldo_atual))}</Text>
                  </TouchableOpacity>
                );
              })}

              {/* Seta de direção */}
              {contaOrigemId && contaDestinoId ? (
                <View style={s.infoBox}>
                  <Text style={s.infoText}>
                    {contaOrigem?.nome}  →  {contaDestino?.nome}
                  </Text>
                </View>
              ) : (
                <View style={s.arrowBox}>
                  <ArrowLeftRight size={20} color={Colors.textMuted} />
                </View>
              )}

              {/* Conta de destino */}
              <Text style={s.label}>Para (destino)</Text>
              {contas
                .filter((c) => c.id !== contaOrigemId) // Remove a conta de origem das opções
                .map((c) => {
                  const sel = contaDestinoId === c.id;
                  const b = getBancoInfo(c.banco);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[s.selectorItem, sel && s.selectorItemSel]}
                      onPress={() => setContaDestinoId(c.id)}
                    >
                      <View style={s.selectorDot} />
                      <Text style={s.selectorLabel}>{c.nome} {b ? `· ${b.label}` : ''}</Text>
                      <Text style={s.selectorSaldo}>{formatarMoeda(Number(c.saldo_atual))}</Text>
                    </TouchableOpacity>
                  );
                })
              }

              {/* Valor */}
              <Text style={s.label}>Valor (R$)</Text>
              <TextInput
                style={s.input}
                placeholder="0,00"
                placeholderTextColor={Colors.textMuted}
                value={transferValor}
                onChangeText={setTransferValor}
                keyboardType="decimal-pad"
              />

              {/* Descrição */}
              <Text style={s.label}>Descrição (opcional)</Text>
              <TextInput
                style={s.input}
                placeholder="Ex: PIX, TED, transferência..."
                placeholderTextColor={Colors.textMuted}
                value={transferDesc}
                onChangeText={setTransferDesc}
              />

              <TouchableOpacity
                style={[s.submitBtn, savingTransfer && s.submitBtnDisabled]}
                onPress={handleTransferir}
                disabled={savingTransfer}
              >
                {savingTransfer
                  ? <ActivityIndicator color={Colors.textInverse} />
                  : <Text style={s.submitBtnText}>Confirmar Transferência</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

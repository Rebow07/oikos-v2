import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, Plus, X, Trash2, ArrowUpCircle, ArrowDownCircle,
  Wallet, PiggyBank, TrendingUp, CreditCard, ArrowLeftRight,
} from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabase';
import { formatarMoeda, formatarData } from '../utils';
import type { Subconta, MovimentacaoBanco } from '../types';

// ─── Constantes ────────────────────────────────────────────────────────────────

const TIPOS_SUBCONTA = [
  { id: 'corrente',    label: 'Conta Corrente', icon: CreditCard,  cor: '#2980B9' },
  { id: 'poupanca',   label: 'Poupança',        icon: Wallet,      cor: '#27AE60' },
  { id: 'caixinha',   label: 'Caixinha',        icon: PiggyBank,   cor: '#E67E22' },
  { id: 'investimento', label: 'Investimento',  icon: TrendingUp,  cor: '#8E44AD' },
];

// Tipos de movimentação disponíveis no modal
type MovTipoOpcao = 'entrada' | 'saida' | 'transferencia_interna' | 'transferencia_externa';

const MOV_OPCOES: { id: MovTipoOpcao; label: string; desc: string }[] = [
  { id: 'entrada',               label: 'Entrada',              desc: 'Depósito / recebimento' },
  { id: 'saida',                 label: 'Saída',                desc: 'Retirada / pagamento' },
  { id: 'transferencia_interna', label: 'Mover internamente',   desc: 'Entre contas deste banco' },
  { id: 'transferencia_externa', label: 'Transferir p/ banco',  desc: 'Para outra conta cadastrada' },
];

// ─── Estilos ───────────────────────────────────────────────────────────────────

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container:        { flex: 1, backgroundColor: C.background },
    headerBar:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: Spacing.md },
    headerTitle:      { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary, flex: 1 },
    scroll:           { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    totalCard:        { backgroundColor: C.cardDark, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
    totalLabel:       { fontSize: FontSize.sm, color: C.textOnCard, opacity: 0.6 },
    totalValue:       { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: C.primary, marginTop: 4 },
    sectionHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md, marginTop: Spacing.md },
    sectionTitle:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },
    addBtn:           { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primary + '15', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full },
    addBtnText:       { fontSize: FontSize.xs, color: C.primary, fontWeight: FontWeight.bold },
    subCard:          { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    subIcon:          { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    subInfo:          { flex: 1 },
    subNome:          { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: C.textPrimary },
    subTipo:          { fontSize: FontSize.xs, color: C.textMuted, marginTop: 2 },
    subSaldo:         { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    subActions:       { flexDirection: 'row', gap: Spacing.sm, marginLeft: Spacing.sm },
    movItem:          { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    movIcon:          { marginRight: Spacing.md },
    movInfo:          { flex: 1 },
    movDesc:          { fontSize: FontSize.sm, color: C.textPrimary },
    movData:          { fontSize: FontSize.xs, color: C.textMuted },
    movValor:         { fontSize: FontSize.md, fontWeight: FontWeight.bold },
    movSubconta:      { fontSize: FontSize.xs, color: C.textMuted, fontStyle: 'italic' },
    emptyText:        { fontSize: FontSize.sm, color: C.textMuted, textAlign: 'center', paddingVertical: Spacing.lg },
    modalOverlay:     { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
    modalContent:     { backgroundColor: C.background, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingBottom: Spacing.xxl, maxHeight: '92%' },
    modalHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    modalTitle:       { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },
    modalScroll:      { paddingHorizontal: Spacing.md },
    label:            { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: C.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.lg },
    input:            { backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    tipoRow:          { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
    tipoItem:         { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, borderColor: C.border },
    tipoItemSel:      { borderColor: C.primary, backgroundColor: C.primary + '15' },
    tipoText:         { fontSize: FontSize.sm, color: C.textPrimary },
    tipoTextSel:      { color: C.primary, fontWeight: FontWeight.bold },
    submitBtn:        { backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.lg },
    submitBtnDisabled:{ opacity: 0.5 },
    submitBtnText:    { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textInverse },
    // Opções de tipo de movimentação (grid 2x2)
    movOpcaoGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
    movOpcaoBtn:      { width: '47%', paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, borderRadius: Radius.md, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', gap: 4 },
    movOpcaoBtnSel:   { borderColor: C.primary, backgroundColor: C.primary + '12' },
    movOpcaoLabel:    { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: C.textPrimary, textAlign: 'center' },
    movOpcaoLabelSel: { color: C.primary },
    movOpcaoDesc:     { fontSize: FontSize.xs, color: C.textMuted, textAlign: 'center' },
    // Selector de subconta / conta destino
    selectorItem:     { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.sm, borderWidth: 1, borderColor: C.border, marginBottom: Spacing.xs, gap: Spacing.sm },
    selectorItemSel:  { borderColor: C.primary, backgroundColor: C.primary + '12' },
    selectorDot:      { width: 10, height: 10, borderRadius: 5 },
    selectorLabel:    { flex: 1, fontSize: FontSize.sm, color: C.textPrimary },
    selectorSaldo:    { fontSize: FontSize.xs, color: C.textMuted },
    // Badge de transferência no extrato
    transferBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
    transferIcon:     { opacity: 0.7 },
    infoBox:          { backgroundColor: C.primary + '10', borderRadius: Radius.sm, padding: Spacing.sm, marginTop: Spacing.sm },
    infoText:         { fontSize: FontSize.xs, color: C.primary },
  });
}

// ─── Tipos locais ──────────────────────────────────────────────────────────────

interface ContaExterna { id: string; nome: string; banco: string; saldo_atual: number; }

// ─── Componente ───────────────────────────────────────────────────────────────

export default function BancoDetalheScreen({ route, navigation }: any) {
  const { Colors } = useTheme();
  // ✅ Memoizado para evitar recriação de StyleSheet a cada render
  const s = useMemo(() => makeStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { usuario, grupoId } = useApp();
  const { contaId, contaNome } = route.params;

  const [subcontas, setSubcontas]   = useState<Subconta[]>([]);
  const [movimentos, setMovimentos] = useState<MovimentacaoBanco[]>([]);
  const [contasExternas, setContasExternas] = useState<ContaExterna[]>([]);
  const [loading, setLoading]       = useState(true);

  // Modal nova subconta
  const [showSubModal, setShowSubModal] = useState(false);
  const [subNome, setSubNome]   = useState('');
  const [subTipo, setSubTipo]   = useState('corrente');
  const [subSaldo, setSubSaldo] = useState('');
  const [savingSub, setSavingSub] = useState(false);

  // Modal movimentação (entrada / saída / transferência)
  const [showMovModal, setShowMovModal]   = useState(false);
  const [subcontaSel, setSubcontaSel]     = useState<Subconta | null>(null);
  const [movTipo, setMovTipo]             = useState<MovTipoOpcao>('entrada');
  const [movValor, setMovValor]           = useState('');
  const [movDesc, setMovDesc]             = useState('');
  const [subDestinoId, setSubDestinoId]   = useState(''); // transferência interna
  const [contaDestinoId, setContaDestinoId] = useState(''); // transferência externa
  const [savingMov, setSavingMov]         = useState(false);

  // ── Carregar dados ──────────────────────────────────────────────────────────

  const carregar = useCallback(async () => {
    try {
      const [subsRes, movsRes, contasRes] = await Promise.all([
        supabase.from('subcontas').select('*').eq('conta_id', contaId).order('criado_em'),
        supabase
          .from('movimentacoes_banco')
          .select('*')
          .eq('conta_id', contaId)
          .order('data', { ascending: false })
          .limit(50),
        // Busca outras contas do mesmo grupo para transferência externa
        supabase
          .from('contas')
          .select('id, nome, banco, saldo_atual')
          .eq('grupo_id', grupoId)
          .eq('ativo', true)
          .neq('id', contaId)
          .order('nome'),
      ]);
      setSubcontas((subsRes.data as Subconta[]) || []);
      setMovimentos((movsRes.data as MovimentacaoBanco[]) || []);
      setContasExternas((contasRes.data as ContaExterna[]) || []);
    } catch (err) {
      console.error('Erro ao carregar banco detalhe:', err);
    } finally {
      setLoading(false);
    }
  }, [contaId, grupoId]);

  useEffect(() => { carregar(); }, [carregar]);

  const totalSub = subcontas.reduce((a, sub) => a + Number(sub.saldo || 0), 0);
  const getTipoInfo = (tipo: string) => TIPOS_SUBCONTA.find((t) => t.id === tipo) || TIPOS_SUBCONTA[0];

  // ── Criar subconta ──────────────────────────────────────────────────────────

  const handleCriarSub = useCallback(async () => {
    if (!subNome.trim()) { Alert.alert('Erro', 'Nome obrigatório.'); return; }
    const val = parseFloat(subSaldo.replace(',', '.')) || 0;
    setSavingSub(true);
    try {
      await supabase.from('subcontas').insert({
        conta_id: contaId, grupo_id: grupoId, criado_por: usuario?.id,
        nome: subNome.trim(), tipo: subTipo, saldo: val,
      });
      await supabase.rpc('recalcular_saldo_conta', { p_conta_id: contaId });
      setShowSubModal(false);
      setSubNome(''); setSubSaldo(''); setSubTipo('corrente');
      carregar();
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setSavingSub(false);
    }
  }, [subNome, subTipo, subSaldo, contaId, grupoId, usuario, carregar]);

  // ── Abrir modal de movimentação ─────────────────────────────────────────────

  const openMov = useCallback((sub: Subconta) => {
    setSubcontaSel(sub);
    setMovTipo('entrada');
    setMovValor('');
    setMovDesc('');
    setSubDestinoId('');
    setContaDestinoId('');
    setShowMovModal(true);
  }, []);

  // ── Confirmar movimentação ──────────────────────────────────────────────────

  const handleMov = useCallback(async () => {
    if (!subcontaSel) return;
    const val = parseFloat(movValor.replace(',', '.'));
    if (isNaN(val) || val <= 0) { Alert.alert('Erro', 'Valor inválido.'); return; }

    // Validações específicas por tipo
    if (movTipo === 'transferencia_interna') {
      if (!subDestinoId) { Alert.alert('Erro', 'Selecione a conta de destino.'); return; }
      if (subDestinoId === subcontaSel.id) { Alert.alert('Erro', 'Origem e destino não podem ser iguais.'); return; }
      if (val > Number(subcontaSel.saldo)) {
        Alert.alert('Saldo insuficiente', `Saldo disponível: ${formatarMoeda(Number(subcontaSel.saldo))}`);
        return;
      }
    }
    if (movTipo === 'transferencia_externa') {
      if (!contaDestinoId) { Alert.alert('Erro', 'Selecione o banco de destino.'); return; }
      if (val > Number(subcontaSel.saldo)) {
        Alert.alert('Saldo insuficiente', `Saldo disponível: ${formatarMoeda(Number(subcontaSel.saldo))}`);
        return;
      }
    }
    if (movTipo === 'saida' && val > Number(subcontaSel.saldo)) {
      Alert.alert(
        'Saldo insuficiente',
        `Saldo disponível: ${formatarMoeda(Number(subcontaSel.saldo))}\n\nDeseja continuar mesmo assim?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => executarMov(val) },
        ],
      );
      return;
    }

    await executarMov(val);
  }, [subcontaSel, movValor, movTipo, movDesc, subDestinoId, contaDestinoId]);

  const executarMov = useCallback(async (val: number) => {
    if (!subcontaSel) return;
    setSavingMov(true);
    try {
      const agora = new Date().toISOString();
      const descricaoBase = movDesc.trim() || null;

      if (movTipo === 'entrada' || movTipo === 'saida') {
        // ── Entrada / Saída simples ────────────────────────────────────────────
        await supabase.from('movimentacoes_banco').insert({
          subconta_id: subcontaSel.id,
          conta_id:    contaId,
          grupo_id:    grupoId,
          criado_por:  usuario?.id,
          tipo:        movTipo,
          valor:       val,
          descricao:   descricaoBase,
          data:        agora,
        });
        // Atualiza saldo da subconta
        const delta = movTipo === 'entrada' ? val : -val;
        await supabase
          .from('subcontas')
          .update({ saldo: Number(subcontaSel.saldo) + delta })
          .eq('id', subcontaSel.id);

      } else if (movTipo === 'transferencia_interna') {
        // ── Transferência interna (entre subcontas do mesmo banco) ─────────────
        const subDestino = subcontas.find((s) => s.id === subDestinoId)!;
        const descSaida  = descricaoBase || `Transferência → ${subDestino.nome}`;
        const descEntrada = descricaoBase || `Transferência ← ${subcontaSel.nome}`;

        // Registra saída na origem
        await supabase.from('movimentacoes_banco').insert({
          subconta_id: subcontaSel.id,
          conta_id:    contaId,
          grupo_id:    grupoId,
          criado_por:  usuario?.id,
          tipo:        'saida',
          valor:       val,
          descricao:   descSaida,
          data:        agora,
          referencia:  'transferencia_interna',
        });
        // Registra entrada no destino
        await supabase.from('movimentacoes_banco').insert({
          subconta_id: subDestinoId,
          conta_id:    contaId,
          grupo_id:    grupoId,
          criado_por:  usuario?.id,
          tipo:        'entrada',
          valor:       val,
          descricao:   descEntrada,
          data:        agora,
          referencia:  'transferencia_interna',
        });
        // Atualiza saldos
        await Promise.all([
          supabase.from('subcontas').update({ saldo: Number(subcontaSel.saldo) - val }).eq('id', subcontaSel.id),
          supabase.from('subcontas').update({ saldo: Number(subDestino.saldo) + val }).eq('id', subDestinoId),
        ]);

      } else if (movTipo === 'transferencia_externa') {
        // ── Transferência externa (entre bancos / contas diferentes) ───────────
        const contaDestino = contasExternas.find((c) => c.id === contaDestinoId)!;
        const descSaida   = descricaoBase || `Transferência → ${contaDestino.nome}`;
        const descEntrada = descricaoBase || `Transferência ← ${contaNome}`;

        // Registra saída na subconta de origem
        await supabase.from('movimentacoes_banco').insert({
          subconta_id: subcontaSel.id,
          conta_id:    contaId,
          grupo_id:    grupoId,
          criado_por:  usuario?.id,
          tipo:        'saida',
          valor:       val,
          descricao:   descSaida,
          data:        agora,
          referencia:  'transferencia_externa',
        });
        // Registra entrada na conta destino (nível conta, sem subconta específica)
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
        // Atualiza saldo da subconta de origem e da conta destino
        await Promise.all([
          supabase.from('subcontas').update({ saldo: Number(subcontaSel.saldo) - val }).eq('id', subcontaSel.id),
          supabase.from('contas').update({ saldo_atual: Number(contaDestino.saldo_atual) + val }).eq('id', contaDestinoId),
        ]);
        // Recalcula saldo total da conta de origem
        await supabase.rpc('recalcular_saldo_conta', { p_conta_id: contaId });
      }

      setShowMovModal(false);
      setMovValor(''); setMovDesc(''); setSubDestinoId(''); setContaDestinoId('');
      carregar();
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setSavingMov(false);
    }
  }, [subcontaSel, movTipo, movDesc, subDestinoId, contaDestinoId, subcontas, contasExternas, contaId, contaNome, grupoId, usuario, carregar]);

  // ── Excluir subconta ────────────────────────────────────────────────────────

  const handleDeleteSub = useCallback((sub: Subconta) => {
    Alert.alert('Excluir', `Remover "${sub.nome}"?`, [
      { text: 'Cancelar' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          await supabase.from('subcontas').delete().eq('id', sub.id);
          await supabase.rpc('recalcular_saldo_conta', { p_conta_id: contaId });
          carregar();
        } catch (err: any) {
          Alert.alert('Erro', err.message);
        }
      }},
    ]);
  }, [contaId, carregar]);

  // ── Ícone de movimentação no extrato ────────────────────────────────────────

  const MovIcon = useCallback(({ tipo, referencia }: { tipo: string; referencia?: string }) => {
    if (referencia === 'transferencia_interna' || referencia === 'transferencia_externa') {
      return <ArrowLeftRight size={18} color={Colors.primary} />;
    }
    return tipo === 'entrada'
      ? <ArrowUpCircle size={18} color={Colors.renda} />
      : <ArrowDownCircle size={18} color={Colors.despesa} />;
  }, [Colors]);

  const corMovimento = (tipo: string, referencia?: string) => {
    if (referencia?.startsWith('transferencia')) return Colors.primary;
    return tipo === 'entrada' ? Colors.renda : Colors.despesa;
  };

  // ── Subcontas disponíveis como destino interno ───────────────────────────────

  const subcontasDestino = subcontas.filter((s) => s.id !== subcontaSel?.id);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{contaNome}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Total */}
        <View style={s.totalCard}>
          <Text style={s.totalLabel}>Saldo total neste banco</Text>
          <Text style={s.totalValue}>{formatarMoeda(totalSub)}</Text>
        </View>

        {/* ── Subcontas ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Contas</Text>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowSubModal(true)}>
            <Plus size={14} color={Colors.primary} />
            <Text style={s.addBtnText}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.lg }} />
        ) : subcontas.length === 0 ? (
          <Text style={s.emptyText}>Nenhuma conta cadastrada</Text>
        ) : (
          subcontas.map((sub) => {
            const info = getTipoInfo(sub.tipo);
            const Icon = info.icon;
            return (
              <View key={sub.id} style={s.subCard}>
                <View style={[s.subIcon, { backgroundColor: info.cor + '18' }]}>
                  <Icon size={20} color={info.cor} />
                </View>
                <View style={s.subInfo}>
                  <Text style={s.subNome}>{sub.nome}</Text>
                  <Text style={s.subTipo}>{info.label}</Text>
                </View>
                <Text style={[s.subSaldo, { color: Number(sub.saldo) >= 0 ? Colors.renda : Colors.despesa }]}>
                  {formatarMoeda(Number(sub.saldo))}
                </Text>
                <View style={s.subActions}>
                  <TouchableOpacity onPress={() => openMov(sub)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Plus size={18} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteSub(sub)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Trash2 size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* ── Extrato ── */}
        <View style={[s.sectionHeader, { marginTop: Spacing.lg }]}>
          <Text style={s.sectionTitle}>Extrato</Text>
        </View>

        {movimentos.length === 0 ? (
          <Text style={s.emptyText}>Nenhuma movimentação</Text>
        ) : (
          movimentos.map((m) => (
            <View key={m.id} style={s.movItem}>
              <View style={s.movIcon}>
                <MovIcon tipo={m.tipo} referencia={(m as any).referencia} />
              </View>
              <View style={s.movInfo}>
                <Text style={s.movDesc}>{m.descricao || (m.tipo === 'entrada' ? 'Entrada' : 'Saída')}</Text>
                <Text style={s.movData}>{formatarData(m.data || (m as any).criado_em)}</Text>
              </View>
              <Text style={[s.movValor, { color: corMovimento(m.tipo, (m as any).referencia) }]}>
                {m.tipo === 'entrada' ? '+' : '-'} {formatarMoeda(Number(m.valor))}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL — Nova Subconta
      ════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showSubModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowSubModal(false)}>
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Nova Conta</Text>
              <TouchableOpacity onPress={() => setShowSubModal(false)}>
                <X size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Nome</Text>
              <TextInput
                style={s.input}
                placeholder="Ex: Caixinha Viagem"
                placeholderTextColor={Colors.textMuted}
                value={subNome}
                onChangeText={setSubNome}
              />

              <Text style={s.label}>Tipo</Text>
              <View style={s.tipoRow}>
                {TIPOS_SUBCONTA.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[s.tipoItem, subTipo === t.id && s.tipoItemSel]}
                    onPress={() => setSubTipo(t.id)}
                  >
                    <Text style={[s.tipoText, subTipo === t.id && s.tipoTextSel]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Saldo atual (R$)</Text>
              <TextInput
                style={s.input}
                placeholder="0,00"
                placeholderTextColor={Colors.textMuted}
                value={subSaldo}
                onChangeText={setSubSaldo}
                keyboardType="decimal-pad"
              />

              <TouchableOpacity
                style={[s.submitBtn, savingSub && s.submitBtnDisabled]}
                onPress={handleCriarSub}
                disabled={savingSub}
              >
                {savingSub
                  ? <ActivityIndicator color={Colors.textInverse} />
                  : <Text style={s.submitBtnText}>Criar</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL — Movimentação / Transferência
      ════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showMovModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowMovModal(false)}>
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Movimentação</Text>
              <TouchableOpacity onPress={() => setShowMovModal(false)}>
                <X size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              {/* Subconta de origem */}
              {subcontaSel && (
                <View style={[s.infoBox, { marginTop: Spacing.md }]}>
                  <Text style={s.infoText}>
                    📂 {subcontaSel.nome}  ·  Saldo: {formatarMoeda(Number(subcontaSel.saldo))}
                  </Text>
                </View>
              )}

              {/* Tipo de operação */}
              <Text style={s.label}>O que deseja fazer?</Text>
              <View style={s.movOpcaoGrid}>
                {MOV_OPCOES.map((op) => {
                  // Esconde transferência interna se só há 1 subconta
                  if (op.id === 'transferencia_interna' && subcontasDestino.length === 0) return null;
                  // Esconde transferência externa se não há outras contas
                  if (op.id === 'transferencia_externa' && contasExternas.length === 0) return null;
                  const sel = movTipo === op.id;
                  return (
                    <TouchableOpacity
                      key={op.id}
                      style={[s.movOpcaoBtn, sel && s.movOpcaoBtnSel]}
                      onPress={() => {
                        setMovTipo(op.id);
                        setSubDestinoId('');
                        setContaDestinoId('');
                      }}
                    >
                      {op.id === 'entrada'               && <ArrowUpCircle   size={18} color={sel ? Colors.primary : Colors.renda} />}
                      {op.id === 'saida'                 && <ArrowDownCircle size={18} color={sel ? Colors.primary : Colors.despesa} />}
                      {op.id === 'transferencia_interna' && <ArrowLeftRight  size={18} color={Colors.primary} />}
                      {op.id === 'transferencia_externa' && <ArrowLeftRight  size={18} color={Colors.primary} />}
                      <Text style={[s.movOpcaoLabel, sel && s.movOpcaoLabelSel]}>{op.label}</Text>
                      <Text style={s.movOpcaoDesc}>{op.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Seletor de subconta destino (transferência interna) ── */}
              {movTipo === 'transferencia_interna' && (
                <>
                  <Text style={s.label}>Para qual conta mover?</Text>
                  {subcontasDestino.map((sub) => {
                    const info = getTipoInfo(sub.tipo);
                    const sel = subDestinoId === sub.id;
                    return (
                      <TouchableOpacity
                        key={sub.id}
                        style={[s.selectorItem, sel && s.selectorItemSel]}
                        onPress={() => setSubDestinoId(sub.id)}
                      >
                        <View style={[s.selectorDot, { backgroundColor: info.cor }]} />
                        <Text style={s.selectorLabel}>{sub.nome}</Text>
                        <Text style={s.selectorSaldo}>{formatarMoeda(Number(sub.saldo))}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              {/* ── Seletor de conta externa destino (transferência externa) ── */}
              {movTipo === 'transferencia_externa' && (
                <>
                  <Text style={s.label}>Para qual banco transferir?</Text>
                  {contasExternas.map((conta) => {
                    const sel = contaDestinoId === conta.id;
                    return (
                      <TouchableOpacity
                        key={conta.id}
                        style={[s.selectorItem, sel && s.selectorItemSel]}
                        onPress={() => setContaDestinoId(conta.id)}
                      >
                        <View style={[s.selectorDot, { backgroundColor: Colors.primary }]} />
                        <Text style={s.selectorLabel}>{conta.nome}</Text>
                        <Text style={s.selectorSaldo}>{formatarMoeda(Number(conta.saldo_atual))}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              {/* Valor */}
              <Text style={s.label}>Valor (R$)</Text>
              <TextInput
                style={s.input}
                placeholder="0,00"
                placeholderTextColor={Colors.textMuted}
                value={movValor}
                onChangeText={setMovValor}
                keyboardType="decimal-pad"
              />

              {/* Descrição */}
              <Text style={s.label}>Descrição (opcional)</Text>
              <TextInput
                style={s.input}
                placeholder={
                  movTipo === 'transferencia_interna' ? 'Ex: Movendo para poupança' :
                  movTipo === 'transferencia_externa' ? 'Ex: PIX para outro banco' :
                  'Ex: Depósito, Saque...'
                }
                placeholderTextColor={Colors.textMuted}
                value={movDesc}
                onChangeText={setMovDesc}
              />

              <TouchableOpacity
                style={[s.submitBtn, savingMov && s.submitBtnDisabled]}
                onPress={handleMov}
                disabled={savingMov}
              >
                {savingMov
                  ? <ActivityIndicator color={Colors.textInverse} />
                  : <Text style={s.submitBtnText}>
                      {movTipo === 'entrada'               ? 'Confirmar Entrada' :
                       movTipo === 'saida'                 ? 'Confirmar Saída' :
                       movTipo === 'transferencia_interna' ? 'Mover Internamente' :
                                                             'Transferir'}
                    </Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

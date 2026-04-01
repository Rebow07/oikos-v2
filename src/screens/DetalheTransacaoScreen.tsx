import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Modal, Image, Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X, Trash2, Check, Clock, CreditCard, User, Calendar, Tag, Repeat, FastForward, Minus, Plus,
} from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabase';
import { excluirTransacao, excluirParcelas, marcarPago, adiantarParcelas } from '../services/transacoes.service';
import { formatarMoeda, formatarData } from '../utils';
import { CATEGORIAS, CATEGORIAS_RECEITA } from '../constants';
import CategoriaIcon from '../components/CategoriaIcon';
import type { Transacao } from '../types';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
    headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary },
    scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    valorContainer: { alignItems: 'center', paddingVertical: Spacing.xl },
    valorText: { fontSize: 36, fontWeight: FontWeight.extrabold },
    tituloText: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary, marginTop: Spacing.sm, textAlign: 'center' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, marginTop: Spacing.md },
    statusText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
    detailSection: { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    detailRowLast: { borderBottomWidth: 0 },
    detailLabel: { fontSize: FontSize.sm, color: C.textMuted, flex: 1 },
    detailValue: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: C.textPrimary },
    actionsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, borderRadius: Radius.md, gap: Spacing.sm },
    actionBtnPagar: { backgroundColor: C.renda + '15' },
    actionBtnExcluir: { backgroundColor: C.despesa + '15' },
    actionBtnAdiantar: { backgroundColor: C.primary + '15' },
    actionBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
    // Comprovante
    comprovanteSection: { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    comprovanteImg: { width: '100%', height: 160, borderRadius: Radius.sm, marginTop: Spacing.sm },
    // Parcelas info
    parcelasSection: { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    parcelasSectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.textPrimary, marginBottom: Spacing.sm },
    parcelaItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    parcelaItemLast: { borderBottomWidth: 0 },
    parcelaLabel: { fontSize: FontSize.sm, color: C.textPrimary },
    parcelaStatus: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    // Modal adiantar
    modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'center', paddingHorizontal: Spacing.lg },
    modalBox: { backgroundColor: C.background, borderRadius: Radius.lg, padding: Spacing.lg },
    modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary, marginBottom: Spacing.md, textAlign: 'center' },
    modalSubtitle: { fontSize: FontSize.sm, color: C.textMuted, textAlign: 'center', marginBottom: Spacing.lg },
    counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, marginBottom: Spacing.lg },
    counterBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary + '20', justifyContent: 'center', alignItems: 'center' },
    counterValue: { fontSize: 32, fontWeight: FontWeight.extrabold, color: C.textPrimary, minWidth: 60, textAlign: 'center' },
    modalTotal: { fontSize: FontSize.md, color: C.textSecondary, textAlign: 'center', marginBottom: Spacing.lg },
    modalTotalValue: { fontWeight: FontWeight.bold, color: C.primary },
    modalActions: { flexDirection: 'row', gap: Spacing.sm },
    modalCancelBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    modalCancelText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: C.textSecondary },
    modalConfirmBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md, alignItems: 'center', backgroundColor: C.primary },
    modalConfirmText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.textInverse },
  });
}

export default function DetalheTransacaoScreen({ route, navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { getNomeMembro } = useApp();

  const { transacaoId } = route.params;
  const [transacao, setTransacao] = useState<Transacao | null>(null);
  const [parcelas, setParcelas] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Modal de antecipação parcial ──
  const [showAdiantarModal, setShowAdiantarModal] = useState(false);
  const [qtdAdiantar, setQtdAdiantar] = useState(1);

  useEffect(() => {
    supabase
      .from('transacoes')
      .select('*')
      .eq('id', transacaoId)
      .single()
      .then(({ data }) => {
        if (data) {
          setTransacao(data as Transacao);
          // Se parcelado, buscar todas as parcelas
          if (data.parcela_grupo_id) {
            supabase
              .from('transacoes')
              .select('*')
              .eq('parcela_grupo_id', data.parcela_grupo_id)
              .order('parcela_index', { ascending: true })
              .then(({ data: parcs }) => {
                if (parcs) setParcelas(parcs as Transacao[]);
              });
          }
        }
        setLoading(false);
      });
  }, [transacaoId]);

  const handleTogglePago = useCallback(async () => {
    if (!transacao) return;
    await marcarPago(transacao.id, !transacao.pago);
    setTransacao((prev) => prev ? { ...prev, pago: !prev.pago, pago_em: !prev.pago ? new Date().toISOString().split('T')[0] : null } : null);
    // Atualizar lista de parcelas
    setParcelas((prev) => prev.map((p) => p.id === transacao.id ? { ...p, pago: !transacao.pago, pago_em: !transacao.pago ? new Date().toISOString().split('T')[0] : null } : p));
  }, [transacao]);

  // ── Abrir modal de adiantar parcelas (escolher quantas) ──
  const handleAbrirAdiantar = useCallback(() => {
    if (!transacao || !transacao.parcela_grupo_id) return;
    const pendentes = parcelas.filter((p) => !p.pago);
    if (pendentes.length === 0) {
      Alert.alert('Pronto', 'Todas as parcelas já estão pagas.');
      return;
    }
    setQtdAdiantar(Math.min(1, pendentes.length));
    setShowAdiantarModal(true);
  }, [transacao, parcelas]);

  // ── Confirmar antecipação parcial ──
  const handleConfirmarAdiantar = useCallback(async () => {
    if (!transacao || !transacao.parcela_grupo_id) return;

    const pendentes = parcelas.filter((p) => !p.pago);
    // Pegar as N primeiras pendentes (por ordem de parcela_index)
    const parcelasParaPagar = pendentes
      .sort((a, b) => (a.parcela_index || 0) - (b.parcela_index || 0))
      .slice(0, qtdAdiantar);

    try {
      const ids = parcelasParaPagar.map((p) => p.id);
      await adiantarParcelas(ids);

      // Atualizar estado local — parcelas pagas ficam na data original
      const hoje = new Date().toISOString().split('T')[0];
      setParcelas((prev) => prev.map((p) =>
        ids.includes(p.id) ? { ...p, pago: true, pago_em: hoje } : p
      ));

      // Se a transação atual está entre as quitadas, atualizar
      if (ids.includes(transacao.id)) {
        setTransacao((prev) => prev ? { ...prev, pago: true, pago_em: hoje } : null);
      }

      setShowAdiantarModal(false);
      Alert.alert('Pronto', `${parcelasParaPagar.length} parcela(s) marcada(s) como paga(s).`);
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    }
  }, [transacao, parcelas, qtdAdiantar]);

  const handleExcluir = useCallback(() => {
    if (!transacao) return;

    const actions: any[] = [{ text: 'Cancelar', style: 'cancel' }];

    if (transacao.parcelado && transacao.parcela_grupo_id) {
      actions.push({
        text: 'Excluir esta',
        onPress: async () => { await excluirTransacao(transacao.id); navigation.goBack(); },
      });
      actions.push({
        text: 'Excluir todas as parcelas',
        style: 'destructive',
        onPress: async () => { await excluirParcelas(transacao.parcela_grupo_id!); navigation.goBack(); },
      });
    } else {
      actions.push({
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => { await excluirTransacao(transacao.id); navigation.goBack(); },
      });
    }

    Alert.alert('Excluir transação', `Deseja excluir "${transacao.titulo}"?`, actions);
  }, [transacao, navigation]);

  if (loading) {
    return (
      <View style={[s.container, s.loaderContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!transacao) {
    return (
      <View style={[s.container, s.loaderContainer, { paddingTop: insets.top }]}>
        <Text style={{ color: Colors.textMuted, fontSize: FontSize.md }}>Transação não encontrada</Text>
      </View>
    );
  }

  const isDespesa = transacao.tipo === 'despesa';
  const lista = isDespesa ? CATEGORIAS : CATEGORIAS_RECEITA;
  const cat = lista.find((c) => c.id === transacao.categoria);
  const isParcelado = transacao.parcelado && transacao.parcela_grupo_id && parcelas.length > 0;
  const parcelasPagas = parcelas.filter((p) => p.pago).length;
  const parcelasPendentes = parcelas.filter((p) => !p.pago).length;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>Detalhes</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><X size={24} color={Colors.textPrimary} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.valorContainer}>
          <CategoriaIcon categoria={transacao.categoria} tipo={transacao.tipo} size={56} />
          <Text style={[s.valorText, { color: isDespesa ? Colors.despesa : Colors.renda }]}>
            {isDespesa ? '- ' : '+ '}{formatarMoeda(transacao.valor)}
          </Text>
          <Text style={s.tituloText}>{transacao.titulo}</Text>
          {isDespesa && (
            <View style={[s.statusBadge, { backgroundColor: transacao.pago ? Colors.renda + '20' : Colors.textMuted + '20' }]}>
              {transacao.pago ? <Check size={14} color={Colors.renda} /> : <Clock size={14} color={Colors.textMuted} />}
              <Text style={[s.statusText, { color: transacao.pago ? Colors.renda : Colors.textMuted }]}>
                {transacao.pago ? 'Pago' : 'Pendente'}
              </Text>
            </View>
          )}
        </View>

        <View style={s.detailSection}>
          <View style={s.detailRow}>
            <Tag size={16} color={Colors.textMuted} style={{ marginRight: Spacing.md }} />
            <Text style={s.detailLabel}>Categoria</Text>
            <Text style={s.detailValue}>{cat?.label || transacao.categoria}</Text>
          </View>
          <View style={s.detailRow}>
            <Calendar size={16} color={Colors.textMuted} style={{ marginRight: Spacing.md }} />
            <Text style={s.detailLabel}>Data</Text>
            <Text style={s.detailValue}>{formatarData(transacao.data)}</Text>
          </View>
          <View style={s.detailRow}>
            <User size={16} color={Colors.textMuted} style={{ marginRight: Spacing.md }} />
            <Text style={s.detailLabel}>Criado por</Text>
            <Text style={s.detailValue}>{transacao.criado_por_nome || getNomeMembro(transacao.criado_por)}</Text>
          </View>
          {transacao.fixo && (
            <View style={s.detailRow}>
              <Repeat size={16} color={Colors.textMuted} style={{ marginRight: Spacing.md }} />
              <Text style={s.detailLabel}>Tipo</Text>
              <Text style={s.detailValue}>Fixa</Text>
            </View>
          )}
          {isParcelado && (
            <View style={s.detailRow}>
              <CreditCard size={16} color={Colors.textMuted} style={{ marginRight: Spacing.md }} />
              <Text style={s.detailLabel}>Parcela</Text>
              <Text style={s.detailValue}>{transacao.parcela_index}/{parcelas.length}</Text>
            </View>
          )}
          {transacao.pago_em && (
            <View style={[s.detailRow, s.detailRowLast]}>
              <Check size={16} color={Colors.renda} style={{ marginRight: Spacing.md }} />
              <Text style={s.detailLabel}>Pago em</Text>
              <Text style={[s.detailValue, { color: Colors.renda }]}>{formatarData(transacao.pago_em)}</Text>
            </View>
          )}
        </View>

        {/* ── Comprovante ── */}
        {transacao.comprovante_url && (
          <View style={s.comprovanteSection}>
            <Text style={s.detailLabel}>Comprovante Anexado</Text>
            <TouchableOpacity onPress={() => Linking.openURL(transacao.comprovante_url!)} activeOpacity={0.8}>
              <Image source={{ uri: transacao.comprovante_url }} style={s.comprovanteImg} resizeMode="cover" />
            </TouchableOpacity>
          </View>
        )}

        {/* Seção de parcelas */}
        {isParcelado && (
          <View style={s.parcelasSection}>
            <Text style={s.parcelasSectionTitle}>
              Parcelas ({parcelasPagas}/{parcelas.length} pagas)
            </Text>
            {parcelas.map((p, idx) => (
              <View key={p.id} style={[s.parcelaItem, idx === parcelas.length - 1 && s.parcelaItemLast]}>
                <Text style={s.parcelaLabel}>{p.parcela_index}/{parcelas.length} — {formatarMoeda(p.valor)}</Text>
                <Text style={[s.parcelaStatus, { color: p.pago ? Colors.renda : Colors.despesa }]}>
                  {p.pago ? 'Pago' : 'Pendente'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={s.actionsRow}>
          {isDespesa && (
            <TouchableOpacity style={[s.actionBtn, s.actionBtnPagar]} onPress={handleTogglePago} activeOpacity={0.7}>
              {transacao.pago ? <Clock size={18} color={Colors.renda} /> : <Check size={18} color={Colors.renda} />}
              <Text style={[s.actionBtnText, { color: Colors.renda }]}>
                {transacao.pago ? 'Desfazer' : 'Marcar como pago'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[s.actionBtn, s.actionBtnExcluir]} onPress={handleExcluir} activeOpacity={0.7}>
            <Trash2 size={18} color={Colors.despesa} />
            <Text style={[s.actionBtnText, { color: Colors.despesa }]}>Excluir</Text>
          </TouchableOpacity>
        </View>

        {/* Botão adiantar parcelas — agora abre modal para escolher quantas */}
        {isParcelado && parcelasPendentes > 0 && (
          <TouchableOpacity
            style={[s.actionBtn, s.actionBtnAdiantar, { marginTop: Spacing.sm }]}
            onPress={handleAbrirAdiantar}
            activeOpacity={0.7}
          >
            <FastForward size={18} color={Colors.primary} />
            <Text style={[s.actionBtnText, { color: Colors.primary }]}>
              Adiantar parcelas ({parcelasPendentes} pendente{parcelasPendentes > 1 ? 's' : ''})
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Modal para escolher quantas parcelas adiantar ── */}
      <Modal visible={showAdiantarModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Adiantar parcelas</Text>
            <Text style={s.modalSubtitle}>
              Escolha quantas parcelas deseja pagar antecipadamente.{'\n'}
              As parcelas ficam registradas na data original.
            </Text>

            <View style={s.counterRow}>
              <TouchableOpacity
                style={s.counterBtn}
                onPress={() => setQtdAdiantar((prev) => Math.max(1, prev - 1))}
                activeOpacity={0.7}
              >
                <Minus size={20} color={Colors.primary} />
              </TouchableOpacity>

              <Text style={s.counterValue}>{qtdAdiantar}</Text>

              <TouchableOpacity
                style={s.counterBtn}
                onPress={() => setQtdAdiantar((prev) => Math.min(parcelasPendentes, prev + 1))}
                activeOpacity={0.7}
              >
                <Plus size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <Text style={s.modalTotal}>
              Valor total:{' '}
              <Text style={s.modalTotalValue}>
                {formatarMoeda(
                  parcelas
                    .filter((p) => !p.pago)
                    .sort((a, b) => (a.parcela_index || 0) - (b.parcela_index || 0))
                    .slice(0, qtdAdiantar)
                    .reduce((acc, p) => acc + p.valor, 0)
                )}
              </Text>
            </Text>

            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setShowAdiantarModal(false)}>
                <Text style={s.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalConfirmBtn} onPress={handleConfirmarAdiantar}>
                <Text style={s.modalConfirmText}>
                  Pagar {qtdAdiantar} parcela{qtdAdiantar > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

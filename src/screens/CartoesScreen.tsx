import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, TextInput, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, X, CreditCard, Trash2, Pencil } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { useCartoes } from '../hooks/useCartoes';
import { criarCartao, excluirCartao } from '../services/cartoes.service';
import { formatarMoeda } from '../utils';
import { supabase } from '../services/supabase';
import type { Cartao } from '../types';

const CORES_CARTAO = ['#8E44AD', '#2980B9', '#E74C3C', '#27AE60', '#E67E22', '#1ABC9C', '#D35400', '#2C3E50'];

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
    title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: C.textPrimary, marginBottom: Spacing.md },
    totalCard: { backgroundColor: C.cardDark, borderRadius: Radius.lg, padding: Spacing.lg, marginHorizontal: Spacing.md, marginBottom: Spacing.md },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
    totalItem: { alignItems: 'center', flex: 1 },
    totalLabel: { fontSize: FontSize.xs, color: C.textOnCard, opacity: 0.6, marginBottom: 4 },
    totalValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textOnCard },
    totalBarBg: { height: 6, backgroundColor: C.textOnCard + '20', borderRadius: 3, marginTop: Spacing.md, overflow: 'hidden' },
    totalBarFill: { height: 6, borderRadius: 3 },
    totalPct: { fontSize: FontSize.xs, color: C.textOnCard, opacity: 0.6, marginTop: 4, textAlign: 'right' },
    list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    card: { borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
    cardName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#FFFFFF', marginBottom: Spacing.sm },
    cardIcon: { position: 'absolute', top: Spacing.md, right: Spacing.md },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
    cardLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' },
    cardValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#FFFFFF' },
    barBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: Spacing.md, overflow: 'hidden' },
    barFill: { height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
    barLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', marginTop: Spacing.xs },
    vencText: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', marginTop: Spacing.sm },
    actionsRow: { position: 'absolute', bottom: Spacing.md, right: Spacing.md, flexDirection: 'row', gap: 16 },
    emptyText: { fontSize: FontSize.md, color: C.textMuted, textAlign: 'center', paddingVertical: Spacing.xxl },
    fab: { position: 'absolute', right: Spacing.md, bottom: Spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 },
    modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: C.background, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingBottom: Spacing.xxl, maxHeight: '70%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },
    modalScroll: { paddingHorizontal: Spacing.md },
    label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: C.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.lg },
    input: { backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    coresRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
    corItem: { width: 36, height: 36, borderRadius: 18 },
    corItemSel: { borderWidth: 3, borderColor: C.textPrimary },
    submitBtn: { backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.lg },
    submitBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textInverse },
  });
}

interface CardWithGasto extends Cartao { gastoMes: number; }

export default function CartoesScreen() {
  const { Colors } = useTheme();
  const s = useMemo(() => makeStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { usuario, grupoId } = useApp();
  const { cartoes, carregando, recarregar } = useCartoes();

  const [cartoesComGasto, setCartoesComGasto] = useState<CardWithGasto[]>([]);
  const [loadingGastos, setLoadingGastos] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editandoCartao, setEditandoCartao] = useState<Cartao | null>(null);

  const [nome, setNome] = useState('');
  const [limite, setLimite] = useState('');
  const [vencimento, setVencimento] = useState('10');
  const [cor, setCor] = useState(CORES_CARTAO[0]);
  const [saving, setSaving] = useState(false);

  const cartoesIdsRef = useRef('');

  const cartoesIdsKey = useMemo(() => cartoes.map((c) => c.id).sort().join(','), [cartoes]);

  useEffect(() => {
    if (cartoesIdsKey === cartoesIdsRef.current && cartoesComGasto.length > 0) return;
    cartoesIdsRef.current = cartoesIdsKey;

    if (!cartoesIdsKey) {
      setCartoesComGasto([]);
      return;
    }

    let cancelled = false;
    setLoadingGastos(true);

    Promise.all(
      cartoes.map(async (c) => {
        try {
          const { data: gastoTotal, error } = await supabase.rpc('limite_disponivel_cartao', { p_cartao_id: c.id });
          const usadoTotal = error ? 0 : Math.max(Number(c.limite) - Number(gastoTotal), 0);
          return { ...c, gastoMes: usadoTotal };
        } catch {
          return { ...c, gastoMes: 0 };
        }
      })
    ).then((result) => {
      if (!cancelled) {
        setCartoesComGasto(result);
        setLoadingGastos(false);
      }
    });

    return () => { cancelled = true; };
  }, [cartoesIdsKey]);

  const totalLimite = cartoesComGasto.reduce((a, c) => a + Number(c.limite), 0);
  const totalUsado = cartoesComGasto.reduce((a, c) => a + c.gastoMes, 0);
  const totalDisponivel = Math.max(totalLimite - totalUsado, 0);
  const totalPct = totalLimite > 0 ? (totalUsado / totalLimite) * 100 : 0;

  const handleEditar = (c: Cartao) => {
    setEditandoCartao(c);
    setNome(c.nome);
    setLimite(c.limite.toString().replace('.', ','));
    setVencimento(c.vencimento.toString());
    setCor(c.cor);
    setShowModal(true);
  };

  const handleExcluir = useCallback((c: Cartao) => {
    Alert.alert('Excluir cartão', `Remover "${c.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          await excluirCartao(c.id);
          cartoesIdsRef.current = '';
          recarregar();
        } catch (err: any) {
          Alert.alert('Erro', err.message);
        }
      }},
    ]);
  }, [recarregar]);

  const handleSalvar = useCallback(async () => {
    const limiteNum = parseFloat(limite.replace(',', '.'));
    if (!nome.trim() || isNaN(limiteNum) || limiteNum <= 0) {
      Alert.alert('Erro', 'Preencha nome e limite.');
      return;
    }
    setSaving(true);
    try {
      if (editandoCartao) {
        const { error } = await supabase.from('cartoes').update({
          nome: nome.trim(),
          limite: limiteNum,
          vencimento: parseInt(vencimento, 10) || 10,
          cor,
        }).eq('id', editandoCartao.id);
        if (error) throw error;
      } else {
        await criarCartao({
          grupo_id: grupoId,
          criado_por: usuario?.id,
          nome: nome.trim(),
          limite: limiteNum,
          vencimento: parseInt(vencimento, 10) || 10,
          cor,
          criado_em: new Date().toISOString(),
        });
      }
      setShowModal(false);
      setEditandoCartao(null);
      cartoesIdsRef.current = '';
      recarregar();
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setSaving(false);
    }
  }, [nome, limite, vencimento, cor, grupoId, usuario, editandoCartao, recarregar]);

  const renderCard = useCallback(({ item }: { item: CardWithGasto }) => {
    const usado = item.gastoMes;
    const disponivel = Math.max(Number(item.limite) - usado, 0);
    const pct = Number(item.limite) > 0 ? Math.min((usado / Number(item.limite)) * 100, 100) : 0;
    return (
      <View style={[s.card, { backgroundColor: item.cor }]}>
        <View style={s.cardIcon}><CreditCard size={24} color="rgba(255,255,255,0.3)" /></View>
        <Text style={s.cardName}>{item.nome}</Text>
        <View style={s.cardRow}>
          <View><Text style={s.cardLabel}>Usado</Text><Text style={s.cardValue}>{formatarMoeda(usado)}</Text></View>
          <View><Text style={s.cardLabel}>Disponível</Text><Text style={s.cardValue}>{formatarMoeda(disponivel)}</Text></View>
          <View><Text style={s.cardLabel}>Limite</Text><Text style={s.cardValue}>{formatarMoeda(Number(item.limite))}</Text></View>
        </View>
        <View style={s.barBg}><View style={[s.barFill, { width: `${pct}%`, backgroundColor: pct > 80 ? '#ff6b6b' : '#FFFFFF' }]} /></View>
        <Text style={s.barLabel}>{Math.round(pct)}% do limite comprometido</Text>
        <Text style={s.vencText}>Vencimento: dia {item.vencimento}</Text>
        <View style={s.actionsRow}>
          <TouchableOpacity onPress={() => handleEditar(item)}><Pencil size={18} color="#FFF" /></TouchableOpacity>
          <TouchableOpacity onPress={() => handleExcluir(item)}><Trash2 size={18} color="rgba(255,255,255,0.6)" /></TouchableOpacity>
        </View>
      </View>
    );
  }, [s, handleExcluir]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}><Text style={s.title}>Cartões</Text></View>
      <FlatList
        data={cartoesComGasto}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => { cartoesIdsRef.current = ''; recarregar(); }} />}
        ListHeaderComponent={cartoesComGasto.length > 0 ? (
          <View style={s.totalCard}>
            <View style={s.totalRow}>
              <View style={s.totalItem}><Text style={s.totalLabel}>Total Usado</Text><Text style={s.totalValue}>{formatarMoeda(totalUsado)}</Text></View>
              <View style={s.totalItem}><Text style={s.totalLabel}>Disponível</Text><Text style={s.totalValue}>{formatarMoeda(totalDisponivel)}</Text></View>
            </View>
            <View style={s.totalBarBg}><View style={[s.totalBarFill, { width: `${Math.min(totalPct, 100)}%`, backgroundColor: totalPct > 80 ? Colors.despesa : Colors.renda }]} /></View>
            <Text style={s.totalPct}>{Math.round(totalPct)}% ocupado</Text>
          </View>
        ) : null}
        ListEmptyComponent={<Text style={s.emptyText}>{carregando || loadingGastos ? 'Carregando...' : 'Nenhum cartão'}</Text>}
      />
      <TouchableOpacity style={s.fab} onPress={() => { setEditandoCartao(null); setNome(''); setLimite(''); setShowModal(true); }}>
        <Plus size={26} color="#FFF" />
      </TouchableOpacity>
      <Modal visible={showModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editandoCartao ? 'Editar' : 'Novo'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><X size={22} color={Colors.textPrimary} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalScroll}>
              <Text style={s.label}>Nome</Text>
              <TextInput style={s.input} value={nome} onChangeText={setNome} placeholder="Ex: Nubank" />
              <Text style={s.label}>Limite</Text>
              <TextInput style={s.input} value={limite} onChangeText={setLimite} keyboardType="decimal-pad" placeholder="0,00" />
              <Text style={s.label}>Vencimento (Dia)</Text>
              <TextInput style={s.input} value={vencimento} onChangeText={setVencimento} keyboardType="number-pad" />
              <TouchableOpacity style={s.submitBtn} onPress={handleSalvar} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.submitBtnText}>Salvar</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
  Alert, TextInput, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, X, Pause, Play, Trash2, Zap, Calendar } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { useRecorrentes } from '../hooks/useRecorrentes';
import {
  criarRecorrente,
  atualizarRecorrente,
  excluirRecorrente,
  gerarRecorrentes,
} from '../services/recorrentes.service';
import { formatarMoeda } from '../utils';
import { CATEGORIAS } from '../constants';
import CategoriaIcon from '../components/CategoriaIcon';
import type { Recorrente } from '../types';

type Periodicidade = 'mensal' | 'trimestral' | 'semestral' | 'anual';

const PERIODICIDADES: { id: Periodicidade; label: string }[] = [
  { id: 'mensal', label: 'Mensal' },
  { id: 'trimestral', label: 'Trimestral' },
  { id: 'semestral', label: 'Semestral' },
  { id: 'anual', label: 'Anual' },
];

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: C.textPrimary },
    totalCard: { backgroundColor: C.despesa + '12', borderRadius: Radius.md, padding: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    totalLabel: { fontSize: FontSize.sm, color: C.textSecondary },
    totalValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.despesa },
    gerarBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary + '20', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm, gap: Spacing.xs },
    gerarBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: C.primary },
    autoGenText: { fontSize: FontSize.xs, color: C.renda, textAlign: 'center', marginBottom: Spacing.sm },
    list: { paddingHorizontal: Spacing.md },
    card: { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    cardInactive: { opacity: 0.45 },
    cardInfo: { flex: 1, marginLeft: Spacing.md },
    cardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: C.textPrimary },
    cardSub: { fontSize: FontSize.xs, color: C.textMuted, marginTop: 2 },
    cardRight: { alignItems: 'flex-end', gap: Spacing.xs },
    cardValor: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.despesa },
    cardActions: { flexDirection: 'row', gap: Spacing.md },
    cardPeriod: { fontSize: 9, color: C.primary, fontWeight: FontWeight.bold, backgroundColor: C.primary + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
    emptyText: { fontSize: FontSize.md, color: C.textMuted, textAlign: 'center', paddingVertical: Spacing.xxl },
    fab: { position: 'absolute', right: Spacing.md, bottom: Spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4 },
    modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: C.background, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingBottom: Spacing.xxl, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },
    modalScroll: { paddingHorizontal: Spacing.md },
    label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: C.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.lg },
    input: { backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    catItem: { alignItems: 'center', width: 70, paddingVertical: Spacing.sm, borderRadius: Radius.sm },
    catItemSel: { backgroundColor: C.primary + '20', borderWidth: 1, borderColor: C.primary },
    catLabel: { fontSize: 10, color: C.textMuted, marginTop: 4, textAlign: 'center' },
    catLabelSel: { color: C.primary, fontWeight: FontWeight.bold },
    periodRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
    periodBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, borderColor: C.border },
    periodBtnSel: { borderColor: C.primary, backgroundColor: C.primary + '15' },
    periodText: { fontSize: FontSize.sm, color: C.textSecondary },
    periodTextSel: { color: C.primary, fontWeight: FontWeight.bold },
    submitBtn: { backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.lg },
    submitBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textInverse },
  });
}

export default function RecorrentesScreen() {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { usuario, grupoId, nomeUsuario } = useApp();
  const { recorrentes, totalMensal, carregando, recarregar } = useRecorrentes();

  const [showModal, setShowModal] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('contas');
  const [diaVencimento, setDiaVencimento] = useState('10');
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>('mensal');
  const [saving, setSaving] = useState(false);
  const [autoGenMsg, setAutoGenMsg] = useState('');

  // Geração automática ao abrir a tela
  const autoGenDone = useRef(false);
  useEffect(() => {
    if (!grupoId || autoGenDone.current) return;
    autoGenDone.current = true;
    (async () => {
      try {
        const qtd = await gerarRecorrentes(grupoId);
        if (qtd > 0) {
          setAutoGenMsg(`${qtd} despesa(s) recorrente(s) gerada(s) automaticamente.`);
          recarregar();
          setTimeout(() => setAutoGenMsg(''), 5000);
        }
      } catch (err) {
        console.error('Erro auto-gerar recorrentes:', err);
      }
    })();
  }, [grupoId]);

  const handleGerar = useCallback(async () => {
    try {
      const qtd = await gerarRecorrentes(grupoId);
      Alert.alert('Pronto', qtd > 0 ? `${qtd} despesa(s) gerada(s).` : 'Nenhuma despesa pendente para gerar.');
      recarregar();
    } catch {
      Alert.alert('Erro', 'Falha ao gerar recorrentes.');
    }
  }, [grupoId, recarregar]);

  const handleToggle = useCallback(async (r: Recorrente) => {
    await atualizarRecorrente(r.id, { ativo: !r.ativo });
    recarregar();
  }, [recarregar]);

  const handleExcluir = useCallback((r: Recorrente) => {
    Alert.alert('Excluir', `Remover "${r.titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => { await excluirRecorrente(r.id); recarregar(); } },
    ]);
  }, [recarregar]);

  const handleSalvar = useCallback(async () => {
    const valorNum = parseFloat(valor.replace(',', '.'));
    if (!titulo.trim() || isNaN(valorNum) || valorNum <= 0) {
      Alert.alert('Erro', 'Preencha título e valor.');
      return;
    }
    setSaving(true);
    try {
      await criarRecorrente({
        grupo_id: grupoId,
        criado_por: usuario.id,
        criado_por_nome: nomeUsuario || null,
        titulo: titulo.trim(),
        valor: valorNum,
        categoria,
        cartao_id: null,
        dia_vencimento: parseInt(diaVencimento, 10) || 10,
        ativo: true,
        periodicidade,
      });
      setShowModal(false);
      setTitulo('');
      setValor('');
      setPeriodicidade('mensal');
      recarregar();
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setSaving(false);
    }
  }, [titulo, valor, categoria, diaVencimento, periodicidade, grupoId, usuario, nomeUsuario, recarregar]);

  const getPeriodLabel = (p: string) => {
    return PERIODICIDADES.find((x) => x.id === p)?.label || 'Mensal';
  };

  const renderItem = useCallback(({ item }: { item: Recorrente }) => {
    const cat = CATEGORIAS.find((c) => c.id === item.categoria);
    const period = (item as any).periodicidade || 'mensal';
    return (
      <View style={[s.card, !item.ativo && s.cardInactive]}>
        <CategoriaIcon categoria={item.categoria} size={40} />
        <View style={s.cardInfo}>
          <Text style={s.cardTitle}>{item.titulo}</Text>
          <Text style={s.cardSub}>{cat?.label || item.categoria} · Dia {item.dia_vencimento}</Text>
          {period !== 'mensal' && <Text style={s.cardPeriod}>{getPeriodLabel(period).toUpperCase()}</Text>}
        </View>
        <View style={s.cardRight}>
          <Text style={s.cardValor}>{formatarMoeda(item.valor)}</Text>
          <View style={s.cardActions}>
            <TouchableOpacity onPress={() => handleToggle(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {item.ativo ? <Pause size={16} color={Colors.textMuted} /> : <Play size={16} color={Colors.renda} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleExcluir(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Trash2 size={16} color={Colors.despesa} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [s, Colors, handleToggle, handleExcluir]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <View style={s.titleRow}>
          <Text style={s.title}>Recorrentes</Text>
        </View>
        <View style={s.totalCard}>
          <View>
            <Text style={s.totalLabel}>Total mensal fixo</Text>
            <Text style={s.totalValue}>{formatarMoeda(totalMensal)}</Text>
          </View>
          <TouchableOpacity style={s.gerarBtn} onPress={handleGerar}>
            <Zap size={16} color={Colors.primary} />
            <Text style={s.gerarBtnText}>Gerar agora</Text>
          </TouchableOpacity>
        </View>
        {!!autoGenMsg && <Text style={s.autoGenText}>{autoGenMsg}</Text>}
      </View>

      <FlatList
        data={recorrentes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={recarregar} tintColor={Colors.primary} colors={[Colors.primary]} />}
        ListEmptyComponent={<Text style={s.emptyText}>{carregando ? 'Carregando...' : 'Nenhuma despesa recorrente'}</Text>}
      />

      <TouchableOpacity style={s.fab} onPress={() => setShowModal(true)} activeOpacity={0.8}>
        <Plus size={26} color={Colors.textInverse} />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Nova Recorrente</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><X size={22} color={Colors.textPrimary} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Título</Text>
              <TextInput style={s.input} placeholder="Ex: Internet" placeholderTextColor={Colors.textMuted} value={titulo} onChangeText={setTitulo} />

              <Text style={s.label}>Valor (R$)</Text>
              <TextInput style={s.input} placeholder="0,00" placeholderTextColor={Colors.textMuted} value={valor} onChangeText={setValor} keyboardType="decimal-pad" />

              <Text style={s.label}>Dia de vencimento</Text>
              <TextInput style={[s.input, { width: 80 }]} value={diaVencimento} onChangeText={(t) => setDiaVencimento(t.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" maxLength={2} />

              <Text style={s.label}>Periodicidade</Text>
              <View style={s.periodRow}>
                {PERIODICIDADES.map((p) => (
                  <TouchableOpacity key={p.id} style={[s.periodBtn, periodicidade === p.id && s.periodBtnSel]} onPress={() => setPeriodicidade(p.id)}>
                    <Text style={[s.periodText, periodicidade === p.id && s.periodTextSel]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Categoria</Text>
              <View style={s.catGrid}>
                {CATEGORIAS.map((cat) => (
                  <TouchableOpacity key={cat.id} style={[s.catItem, categoria === cat.id && s.catItemSel]} onPress={() => setCategoria(cat.id)}>
                    <CategoriaIcon categoria={cat.id} size={28} />
                    <Text style={[s.catLabel, categoria === cat.id && s.catLabelSel]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={[s.submitBtn, saving && { opacity: 0.5 }]} onPress={handleSalvar} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.textInverse} /> : <Text style={s.submitBtnText}>Salvar</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

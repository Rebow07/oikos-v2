import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, Switch, Modal, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, CreditCard, ChevronDown, Calendar as CalendarIcon } from 'lucide-react-native';
import * as Calendar from 'expo-calendar'; 
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { criarTransacao, criarTransacoesBatch } from '../services/transacoes.service';
import { CATEGORIAS } from '../constants';
import { dataHoje, gerarUUID, formatarMoeda } from '../utils';
import CategoriaIcon from '../components/CategoriaIcon';
import type { Cartao } from '../types';
import { supabase } from '../services/supabase';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
    headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary },
    scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: C.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.lg },
    input: { backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    inputFocused: { borderColor: C.primary },
    valorInput: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, textAlign: 'center', paddingVertical: Spacing.lg },
    categoriaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    categoriaItem: { alignItems: 'center', width: 70, paddingVertical: Spacing.sm, borderRadius: Radius.sm },
    categoriaItemSelected: { backgroundColor: C.primary + '20', borderWidth: 1, borderColor: C.primary },
    categoriaLabel: { fontSize: 10, color: C.textMuted, marginTop: 4, textAlign: 'center' },
    categoriaLabelSelected: { color: C.primary, fontWeight: FontWeight.bold },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    rowLabel: { fontSize: FontSize.md, color: C.textPrimary },
    cardSelector: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderWidth: 1, borderColor: C.border },
    cardDot: { width: 12, height: 12, borderRadius: 6 },
    cardName: { flex: 1, fontSize: FontSize.md, color: C.textPrimary },
    cardLimit: { fontSize: FontSize.xs, color: C.textMuted, marginTop: 2 },
    submitBtn: { backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xl },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textInverse },
    modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: C.background, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '60%', paddingBottom: Spacing.xxl },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },
    modalItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    modalItemText: { fontSize: FontSize.md, color: C.textPrimary },
    modalItemSub: { fontSize: FontSize.xs, color: C.textMuted },
    parcelaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
    parcelaInput: { width: 60, textAlign: 'center' },
    parcelaLabel: { fontSize: FontSize.sm, color: C.textSecondary },
    limiteInfo: { backgroundColor: C.surface, borderRadius: Radius.sm, padding: Spacing.md, marginTop: Spacing.sm, borderWidth: 1, borderColor: C.border },
    limiteRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    limiteLabel: { fontSize: FontSize.xs, color: C.textMuted },
    limiteValue: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
    parcelaPreview: { backgroundColor: C.surface, borderRadius: Radius.sm, padding: Spacing.md, marginTop: Spacing.sm, borderWidth: 1, borderColor: C.primary + '40' },
    parcelaPreviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    parcelaPreviewLabel: { fontSize: FontSize.sm, color: C.textSecondary },
    parcelaPreviewValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.primary },
    parcelaEditRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
    parcelaEditLabel: { fontSize: FontSize.xs, color: C.textMuted },
    parcelaEditInput: { width: 100, textAlign: 'center', fontSize: FontSize.md, fontWeight: FontWeight.bold },
    parcelaTotalLabel: { fontSize: FontSize.xs, color: C.textMuted, marginTop: Spacing.xs, textAlign: 'center' },
  });
}

export default function NovaTransacaoScreen({ route, navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { usuario, grupoId, nomeUsuario } = useApp();

  const params = route?.params || {};

  const [titulo, setTitulo] = useState(params.tituloPreenchido || '');
  const [valor, setValor] = useState(params.valorPreenchido || '');
  const [categoria, setCategoria] = useState(params.categoriaPreenchida || 'outros');
  const [data, setData] = useState(dataHoje());
  const [fixo, setFixo] = useState(false);
  const [parcelado, setParcelado] = useState(false);
  const [numParcelas, setNumParcelas] = useState('2');
  const [valorParcelaOverride, setValorParcelaOverride] = useState(''); 
  const [cartaoId, setCartaoId] = useState<string | null>(null);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [limiteDisponivel, setLimiteDisponivel] = useState<number | null>(null);
  const [showCartaoModal, setShowCartaoModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncAgenda, setSyncAgenda] = useState(true);

  const [diaInput, setDiaInput] = useState(data.split('-')[2]);
  const [mesInput, setMesInput] = useState(data.split('-')[1]);
  const [anoInput, setAnoInput] = useState(data.split('-')[0]);

  useEffect(() => {
    supabase.from('cartoes').select('*').eq('grupo_id', grupoId).eq('ativo', true)
      .then(({ data: cards }) => { if (cards) setCartoes(cards as Cartao[]); });
  }, [grupoId]);

  useEffect(() => {
    if (!cartaoId) { setLimiteDisponivel(null); return; }
    supabase.rpc('limite_disponivel_cartao', { p_cartao_id: cartaoId })
      .then(({ data: disp }) => { if (disp !== null) setLimiteDisponivel(Number(disp)); });
  }, [cartaoId]);

  const cartaoSelecionado = cartoes.find((c) => c.id === cartaoId);

  const valorNum = parseFloat(valor.replace(',', '.')) || 0;
  const numParcelasNum = parseInt(numParcelas, 10) || 2;

  const valorParcelaCalculado = useMemo(() => {
    if (valorNum <= 0 || numParcelasNum <= 0) return 0;
    return Math.round((valorNum / numParcelasNum) * 100) / 100;
  }, [valorNum, numParcelasNum]);

  const valorParcelaEfetivo = useMemo(() => {
    if (valorParcelaOverride) {
      const parsed = parseFloat(valorParcelaOverride.replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return valorParcelaCalculado;
  }, [valorParcelaOverride, valorParcelaCalculado]);

  const totalComJuros = useMemo(() => {
    return Math.round(valorParcelaEfetivo * numParcelasNum * 100) / 100;
  }, [valorParcelaEfetivo, numParcelasNum]);

  const temJuros = parcelado && totalComJuros > valorNum + 0.01;

  const agendarNoGoogleCalendar = async (desc: string, dataEvento: Date, valorEv: number) => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') return;

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(c => c.isPrimary) || calendars[0];

      if (defaultCalendar) {
        await Calendar.createEventAsync(defaultCalendar.id, {
          title: `💰 ${desc} - R$ ${valorEv.toFixed(2)}`,
          startDate: dataEvento,
          endDate: new Date(dataEvento.getTime() + 60 * 60 * 1000),
          notes: 'Agendado automaticamente pelo Oikos Family',
          alarms: [{ relativeOffset: -1440 }] 
        });
      }
    } catch (e) {
      console.log('Erro ao agendar no Google:', e);
    }
  };

  const handleSalvar = useCallback(async () => {
    if (!titulo.trim()) { Alert.alert('Erro', 'Informe o título.'); return; }
    if (valorNum <= 0) { Alert.alert('Erro', 'Informe o valor.'); return; }

    const valorTotalCompra = parcelado ? totalComJuros : valorNum;
    if (cartaoId && limiteDisponivel !== null && valorTotalCompra > limiteDisponivel) {
      Alert.alert('Limite insuficiente', `O cartão ${cartaoSelecionado?.nome} não possui limite para o valor TOTAL de ${formatarMoeda(valorTotalCompra)}.`);
      return;
    }

    setLoading(true);
    try {
      if (parcelado) {
        const parcelaGrupoId = gerarUUID();
        const transacoes = [];

        for (let i = 1; i <= numParcelasNum; i++) {
          const d = new Date(parseInt(anoInput), parseInt(mesInput) - 1 + (i - 1), parseInt(diaInput), 9, 0);
          const dataP = d.toISOString().split('T')[0];
          
          transacoes.push({
            grupo_id: grupoId, 
            criado_por: usuario.id,
            criado_por_nome: nomeUsuario || null,
            titulo: `${titulo.trim()} (${i}/${numParcelasNum})`,
            valor: valorParcelaEfetivo, 
            categoria, 
            tipo: 'despesa' as const, // <-- CORREÇÃO AQUI (as const)
            data: dataP, 
            fixo: false, 
            parcelado: true, 
            cartao_id: cartaoId,
            parcela_grupo_id: parcelaGrupoId, 
            parcela_index: i,
          });

          if (syncAgenda) await agendarNoGoogleCalendar(titulo, d, valorParcelaEfetivo);
        }
        await criarTransacoesBatch(transacoes);
      } else {
        const dataFinal = `${anoInput}-${mesInput.padStart(2, '0')}-${diaInput.padStart(2, '0')}`;
        await criarTransacao({
          grupo_id: grupoId, 
          criado_por: usuario.id, 
          criado_por_nome: nomeUsuario || null,
          titulo: titulo.trim(),
          valor: valorNum, 
          categoria, 
          tipo: 'despesa' as const, // <-- CORREÇÃO AQUI (as const)
          data: dataFinal,
          fixo, 
          parcelado: false, 
          cartao_id: cartaoId,
        });
        
        if (syncAgenda) {
          const dFinal = new Date(parseInt(anoInput), parseInt(mesInput) - 1, parseInt(diaInput), 9, 0);
          await agendarNoGoogleCalendar(titulo, dFinal, valorNum);
        }
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally { setLoading(false); }
  }, [titulo, valorNum, categoria, anoInput, mesInput, diaInput, fixo, parcelado, numParcelasNum, valorParcelaEfetivo, totalComJuros, cartaoId, limiteDisponivel, syncAgenda, grupoId, usuario.id, nomeUsuario, navigation, cartaoSelecionado]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>Nova Despesa</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><X size={24} color={Colors.textPrimary} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>Valor Total (R$)</Text>
        <TextInput style={[s.input, s.valorInput]} placeholder="0,00" value={valor} onChangeText={setValor} keyboardType="decimal-pad" />

        <Text style={s.label}>Descrição</Text>
        <TextInput style={s.input} placeholder="Ex: Geladeira" value={titulo} onChangeText={setTitulo} />

        <Text style={s.label}>Categoria</Text>
        <View style={s.categoriaGrid}>
          {CATEGORIAS.map((cat) => (
            <TouchableOpacity key={cat.id} style={[s.categoriaItem, categoria === cat.id && s.categoriaItemSelected]} onPress={() => setCategoria(cat.id)}>
              <CategoriaIcon categoria={cat.id} size={32} />
              <Text style={[s.categoriaLabel, categoria === cat.id && s.categoriaLabelSelected]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Data da Compra</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <TextInput style={[s.input, { flex: 1, textAlign: 'center' }]} value={diaInput} onChangeText={setDiaInput} keyboardType="number-pad" maxLength={2} />
          <TextInput style={[s.input, { flex: 1, textAlign: 'center' }]} value={mesInput} onChangeText={setMesInput} keyboardType="number-pad" maxLength={2} />
          <TextInput style={[s.input, { flex: 2, textAlign: 'center' }]} value={anoInput} onChangeText={setAnoInput} keyboardType="number-pad" maxLength={4} />
        </View>

        <Text style={s.label}>Cartão</Text>
        <TouchableOpacity style={s.cardSelector} onPress={() => setShowCartaoModal(true)}>
          <Text style={s.cardName}>{cartaoSelecionado?.nome || 'Selecionar Cartão'}</Text>
          <ChevronDown size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        <View style={[s.row, { marginTop: Spacing.lg }]}>
          <Text style={s.rowLabel}>Sincronizar com Agenda Google</Text>
          <Switch value={syncAgenda} onValueChange={setSyncAgenda} />
        </View>

        <View style={[s.row, { marginTop: Spacing.sm }]}>
          <Text style={s.rowLabel}>Parcelado</Text>
          <Switch value={parcelado} onValueChange={setParcelado} />
        </View>

        {parcelado && (
          <View style={s.parcelaPreview}>
            <View style={s.parcelaRow}>
              <Text style={s.parcelaLabel}>Nº de parcelas:</Text>
              <TextInput style={[s.input, s.parcelaInput]} value={numParcelas} onChangeText={setNumParcelas} keyboardType="number-pad" />
            </View>
            <View style={s.parcelaEditRow}>
              <Text style={s.parcelaEditLabel}>Valor de cada parcela (incluir juros se houver):</Text>
              <TextInput style={[s.input, s.parcelaEditInput]} value={valorParcelaOverride || valorParcelaCalculado.toFixed(2)} onChangeText={setValorParcelaOverride} keyboardType="decimal-pad" />
            </View>
            {temJuros && <Text style={s.parcelaTotalLabel}>Total real com juros: {formatarMoeda(totalComJuros)}</Text>}
          </View>
        )}

        <TouchableOpacity style={[s.submitBtn, loading && s.submitBtnDisabled]} onPress={handleSalvar} disabled={loading}>
          {loading ? <ActivityIndicator color={Colors.textInverse} /> : <Text style={s.submitBtnText}>Salvar Despesa</Text>}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showCartaoModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} onPress={() => setShowCartaoModal(false)}>
          <View style={s.modalContent}>
            {cartoes.map((c) => (
              <TouchableOpacity key={c.id} style={s.modalItem} onPress={() => { setCartaoId(c.id); setShowCartaoModal(false); }}>
                <View style={[s.cardDot, { backgroundColor: c.cor }]} />
                <Text style={s.modalItemText}>{c.nome} (Limite: {formatarMoeda(Number(c.limite))})</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
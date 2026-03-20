import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, Switch, Modal, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, CreditCard, ChevronDown } from 'lucide-react-native';
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
    // Preview da parcela
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

  // Receber dados de ComprasHomeScreen (finalizar compra)
  const params = route?.params || {};

  const [titulo, setTitulo] = useState(params.tituloPreenchido || '');
  const [valor, setValor] = useState(params.valorPreenchido || '');
  const [categoria, setCategoria] = useState(params.categoriaPreenchida || 'outros');
  const [data, setData] = useState(dataHoje());
  const [fixo, setFixo] = useState(false);
  const [parcelado, setParcelado] = useState(false);
  const [numParcelas, setNumParcelas] = useState('2');
  const [valorParcelaOverride, setValorParcelaOverride] = useState(''); // Valor manual da parcela (juros)
  const [cartaoId, setCartaoId] = useState<string | null>(null);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [limiteDisponivel, setLimiteDisponivel] = useState<number | null>(null);
  const [showCartaoModal, setShowCartaoModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusField, setFocusField] = useState('');

  const [diaInput, setDiaInput] = useState(data.split('-')[2]);
  const [mesInput, setMesInput] = useState(data.split('-')[1]);
  const [anoInput, setAnoInput] = useState(data.split('-')[0]);

  useEffect(() => {
    supabase
      .from('cartoes')
      .select('*')
      .eq('grupo_id', grupoId)
      .eq('ativo', true)
      .then(({ data: cards }) => {
        if (cards) setCartoes(cards as Cartao[]);
      });
  }, [grupoId]);

  // Buscar limite disponível ao selecionar cartão
  useEffect(() => {
    if (!cartaoId) { setLimiteDisponivel(null); return; }
    supabase.rpc('limite_disponivel_cartao', { p_cartao_id: cartaoId })
      .then(({ data: disp }) => {
        if (disp !== null) setLimiteDisponivel(Number(disp));
      });
  }, [cartaoId]);

  const cartaoSelecionado = cartoes.find((c) => c.id === cartaoId);

  // ── Cálculo do valor da parcela ──
  const valorNum = parseFloat(valor.replace(',', '.')) || 0;
  const numParcelasNum = parseInt(numParcelas, 10) || 2;

  // Valor calculado (sem juros) = total / parcelas
  const valorParcelaCalculado = useMemo(() => {
    if (valorNum <= 0 || numParcelasNum <= 0) return 0;
    return Math.round((valorNum / numParcelasNum) * 100) / 100;
  }, [valorNum, numParcelasNum]);

  // Valor efetivo da parcela (com override de juros)
  const valorParcelaEfetivo = useMemo(() => {
    if (valorParcelaOverride) {
      const parsed = parseFloat(valorParcelaOverride.replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return valorParcelaCalculado;
  }, [valorParcelaOverride, valorParcelaCalculado]);

  // Total real (pode ser diferente do valor digitado se houver juros)
  const totalComJuros = useMemo(() => {
    return Math.round(valorParcelaEfetivo * numParcelasNum * 100) / 100;
  }, [valorParcelaEfetivo, numParcelasNum]);

  const temJuros = parcelado && totalComJuros > valorNum + 0.01;

  // Reset override quando muda valor ou parcelas
  useEffect(() => {
    setValorParcelaOverride('');
  }, [valor, numParcelas]);

  const handleSalvar = useCallback(async () => {
    if (!titulo.trim()) { Alert.alert('Erro', 'Informe o título da despesa.'); return; }
    if (isNaN(valorNum) || valorNum <= 0) { Alert.alert('Erro', 'Informe um valor válido.'); return; }

    // Validar limite do cartão — usar valor TOTAL (com juros se houver)
    const valorTotalCompra = parcelado ? totalComJuros : valorNum;
    if (cartaoId && limiteDisponivel !== null) {
      if (valorTotalCompra > limiteDisponivel) {
        Alert.alert(
          'Limite insuficiente',
          `O cartão ${cartaoSelecionado?.nome} tem apenas ${formatarMoeda(limiteDisponivel)} disponível. O valor total da compra é ${formatarMoeda(valorTotalCompra)}.`
        );
        return;
      }
    }

    setLoading(true);
    try {
      const dataFinal = `${anoInput}-${mesInput.padStart(2, '0')}-${diaInput.padStart(2, '0')}`;

      if (parcelado) {
        const n = numParcelasNum;
        const valorParcela = valorParcelaEfetivo;
        const parcelaGrupoId = gerarUUID();
        const transacoes = [];

        for (let i = 1; i <= n; i++) {
          const d = new Date(parseInt(anoInput), parseInt(mesInput) - 1 + (i - 1), parseInt(diaInput));
          const dataP = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          transacoes.push({
            grupo_id: grupoId,
            criado_por: usuario.id,
            criado_por_nome: nomeUsuario || null,
            titulo: `${titulo.trim()} (${i}/${n})`,
            valor: valorParcela,
            categoria,
            tipo: 'despesa' as const,
            data: dataP,
            fixo: false,
            parcelado: true,
            cartao_id: cartaoId,
            parcela_grupo_id: parcelaGrupoId,
            parcela_index: i,
          });
        }
        await criarTransacoesBatch(transacoes);
      } else {
        await criarTransacao({
          grupo_id: grupoId,
          criado_por: usuario.id,
          criado_por_nome: nomeUsuario || null,
          titulo: titulo.trim(),
          valor: valorNum,
          categoria,
          tipo: 'despesa',
          data: dataFinal,
          fixo,
          parcelado: false,
          cartao_id: cartaoId,
        });
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível salvar.');
    } finally {
      setLoading(false);
    }
  }, [titulo, valor, valorNum, categoria, anoInput, mesInput, diaInput, fixo, parcelado, numParcelasNum, valorParcelaEfetivo, totalComJuros, cartaoId, limiteDisponivel, cartaoSelecionado, grupoId, usuario, nomeUsuario, navigation]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>Nova Despesa</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><X size={24} color={Colors.textPrimary} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>Valor (R$)</Text>
        <TextInput style={[s.input, s.valorInput, focusField === 'valor' && s.inputFocused]}
          placeholder="0,00" placeholderTextColor={Colors.textMuted} value={valor} onChangeText={setValor}
          keyboardType="decimal-pad" onFocus={() => setFocusField('valor')} onBlur={() => setFocusField('')} />

        <Text style={s.label}>Descrição</Text>
        <TextInput style={[s.input, focusField === 'titulo' && s.inputFocused]}
          placeholder="Ex: Supermercado" placeholderTextColor={Colors.textMuted} value={titulo} onChangeText={setTitulo}
          onFocus={() => setFocusField('titulo')} onBlur={() => setFocusField('')} />

        <Text style={s.label}>Categoria</Text>
        <View style={s.categoriaGrid}>
          {CATEGORIAS.map((cat) => (
            <TouchableOpacity key={cat.id} style={[s.categoriaItem, categoria === cat.id && s.categoriaItemSelected]}
              onPress={() => setCategoria(cat.id)} activeOpacity={0.7}>
              <CategoriaIcon categoria={cat.id} size={32} />
              <Text style={[s.categoriaLabel, categoria === cat.id && s.categoriaLabelSelected]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Data</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <TextInput style={[s.input, { flex: 1, textAlign: 'center' }]} placeholder="DD" placeholderTextColor={Colors.textMuted}
            value={diaInput} onChangeText={(t) => setDiaInput(t.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" maxLength={2} />
          <TextInput style={[s.input, { flex: 1, textAlign: 'center' }]} placeholder="MM" placeholderTextColor={Colors.textMuted}
            value={mesInput} onChangeText={(t) => setMesInput(t.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" maxLength={2} />
          <TextInput style={[s.input, { flex: 2, textAlign: 'center' }]} placeholder="AAAA" placeholderTextColor={Colors.textMuted}
            value={anoInput} onChangeText={(t) => setAnoInput(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" maxLength={4} />
        </View>

        <Text style={s.label}>Cartão (opcional)</Text>
        <TouchableOpacity style={s.cardSelector} onPress={() => setShowCartaoModal(true)}>
          {cartaoSelecionado ? (
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                <View style={[s.cardDot, { backgroundColor: cartaoSelecionado.cor }]} />
                <Text style={s.cardName}>{cartaoSelecionado.nome}</Text>
              </View>
              {limiteDisponivel !== null && (
                <Text style={s.cardLimit}>Disponível: {formatarMoeda(limiteDisponivel)}</Text>
              )}
            </View>
          ) : (
            <Text style={[s.cardName, { color: Colors.textMuted }]}>Nenhum</Text>
          )}
          <ChevronDown size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Info de limite quando cartão selecionado */}
        {cartaoId && cartaoSelecionado && limiteDisponivel !== null && (
          <View style={s.limiteInfo}>
            <View style={s.limiteRow}>
              <Text style={s.limiteLabel}>Limite total</Text>
              <Text style={s.limiteValue}>{formatarMoeda(Number(cartaoSelecionado.limite))}</Text>
            </View>
            <View style={s.limiteRow}>
              <Text style={s.limiteLabel}>Disponível</Text>
              <Text style={[s.limiteValue, { color: Colors.renda }]}>{formatarMoeda(limiteDisponivel)}</Text>
            </View>
            <View style={s.limiteRow}>
              <Text style={s.limiteLabel}>Usado</Text>
              <Text style={[s.limiteValue, { color: Colors.despesa }]}>{formatarMoeda(Number(cartaoSelecionado.limite) - limiteDisponivel)}</Text>
            </View>
          </View>
        )}

        <View style={[s.row, { marginTop: Spacing.lg }]}>
          <Text style={s.rowLabel}>Despesa fixa</Text>
          <Switch value={fixo} onValueChange={setFixo} trackColor={{ false: Colors.border, true: Colors.primary + '80' }} thumbColor={fixo ? Colors.primary : Colors.textMuted} />
        </View>

        <View style={[s.row, { marginTop: Spacing.sm }]}>
          <Text style={s.rowLabel}>Parcelado</Text>
          <Switch value={parcelado} onValueChange={setParcelado} trackColor={{ false: Colors.border, true: Colors.primary + '80' }} thumbColor={parcelado ? Colors.primary : Colors.textMuted} />
        </View>

        {parcelado && (
          <>
            <View style={s.parcelaRow}>
              <Text style={s.parcelaLabel}>Número de parcelas:</Text>
              <TextInput style={[s.input, s.parcelaInput]} value={numParcelas}
                onChangeText={(t) => setNumParcelas(t.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={2} />
            </View>

            {/* ── Preview do valor da parcela ── */}
            {valorNum > 0 && numParcelasNum > 0 && (
              <View style={s.parcelaPreview}>
                <View style={s.parcelaPreviewRow}>
                  <Text style={s.parcelaPreviewLabel}>
                    {numParcelasNum}× de
                  </Text>
                  <Text style={s.parcelaPreviewValue}>
                    {formatarMoeda(valorParcelaEfetivo)}
                  </Text>
                </View>

                {/* Campo editável para ajustar valor da parcela (juros) */}
                <View style={s.parcelaEditRow}>
                  <Text style={s.parcelaEditLabel}>Valor da parcela (editável):</Text>
                  <TextInput
                    style={[s.input, s.parcelaEditInput]}
                    value={valorParcelaOverride || valorParcelaCalculado.toFixed(2).replace('.', ',')}
                    onChangeText={setValorParcelaOverride}
                    keyboardType="decimal-pad"
                    placeholder={valorParcelaCalculado.toFixed(2).replace('.', ',')}
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>

                {/* Mostrar total com juros se diferente */}
                {temJuros && (
                  <Text style={s.parcelaTotalLabel}>
                    Total com juros: {formatarMoeda(totalComJuros)} (original: {formatarMoeda(valorNum)})
                  </Text>
                )}
              </View>
            )}
          </>
        )}

        <TouchableOpacity style={[s.submitBtn, loading && s.submitBtnDisabled]} onPress={handleSalvar} disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color={Colors.textInverse} /> : <Text style={s.submitBtnText}>Salvar Despesa</Text>}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showCartaoModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowCartaoModal(false)}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Selecionar cartão</Text>
              <TouchableOpacity onPress={() => setShowCartaoModal(false)}><X size={22} color={Colors.textPrimary} /></TouchableOpacity>
            </View>
            <TouchableOpacity style={s.modalItem} onPress={() => { setCartaoId(null); setShowCartaoModal(false); }}>
              <Text style={s.modalItemText}>Nenhum</Text>
            </TouchableOpacity>
            {cartoes.map((c) => (
              <TouchableOpacity key={c.id} style={s.modalItem} onPress={() => { setCartaoId(c.id); setShowCartaoModal(false); }}>
                <View style={[s.cardDot, { backgroundColor: c.cor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.modalItemText}>{c.nome}</Text>
                  <Text style={s.modalItemSub}>Limite: {formatarMoeda(Number(c.limite))}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

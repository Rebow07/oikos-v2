// src/screens/SplitDespesaScreen.tsx
// Dividir uma despesa entre membros específicos em valores personalizados
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Split, Users, ChevronDown } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { useCacheInvalidation, CACHE_KEYS } from '../context/CacheContext';
import { criarTransacoesBatch } from '../services/transacoes.service';
import { CATEGORIAS } from '../constants';
import { dataHoje, formatarMoeda } from '../utils';
import { getCategoriasCustom } from './CategoriasCustomScreen';
import { toast } from '../utils/toast';
import CategoriaIcon from '../components/CategoriaIcon';
import { corAvatar, iniciais } from '../utils';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
    title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary },
    scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: C.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.lg },
    input: { backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    valorInput: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, textAlign: 'center' },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    catItem: { alignItems: 'center', width: 68, paddingVertical: Spacing.sm, borderRadius: Radius.sm },
    catItemSel: { backgroundColor: C.primary + '20', borderWidth: 1, borderColor: C.primary },
    catLabel: { fontSize: 9, color: C.textMuted, marginTop: 3, textAlign: 'center' },
    catLabelSel: { color: C.primary, fontWeight: FontWeight.bold },
    // Membros
    membroCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.surface, borderRadius: Radius.md,
      padding: Spacing.md, marginBottom: Spacing.sm,
      borderWidth: StyleSheet.hairlineWidth, borderColor: C.border,
    },
    avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    avatarText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#FFF' },
    membroNome: { flex: 1, fontSize: FontSize.md, color: C.textPrimary },
    membroInput: {
      width: 90, textAlign: 'right',
      backgroundColor: C.background, borderRadius: Radius.sm,
      paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
      fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.textPrimary,
      borderWidth: 1, borderColor: C.border,
    },
    totalRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md,
      marginTop: Spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border,
    },
    totalLabel: { fontSize: FontSize.md, color: C.textSecondary },
    totalValue: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold },
    diffRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
    diffText: { fontSize: FontSize.xs },
    submitBtn: { backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xl, flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
    submitBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textInverse },
    submitBtnDisabled: { opacity: 0.5 },
  });
}

export default function SplitDespesaScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = useMemo(() => makeStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { usuario, grupoId, nomeUsuario, membros } = useApp();
  const { invalidarPorPrefixo } = useCacheInvalidation();

  const [titulo, setTitulo] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [categoria, setCategoria] = useState('outros');
  const [loading, setLoading] = useState(false);
  const [categoriasLista, setCategoriasLista] = useState([...CATEGORIAS]);

  React.useEffect(() => {
    getCategoriasCustom().then((customs) => {
      setCategoriasLista([...CATEGORIAS, ...customs]);
    });
  }, []);

  // Valores por membro — indexado por user_id
  const [valoresMembro, setValoresMembro] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    return init;
  });

  const hoje = dataHoje().split('-');
  const [diaInput, setDiaInput] = useState(hoje[2]);
  const [mesInput, setMesInput] = useState(hoje[1]);
  const [anoInput, setAnoInput] = useState(hoje[0]);

  const setValorMembro = (userId: string, val: string) => {
    setValoresMembro((prev) => ({ ...prev, [userId]: val }));
  };

  // Distribuir igualmente ao informar valor total
  const distribuirIgualmente = () => {
    const total = parseFloat(valorTotal.replace(',', '.'));
    if (isNaN(total) || total <= 0 || membros.length === 0) return;
    const porMembro = (total / membros.length).toFixed(2);
    const novo: Record<string, string> = {};
    membros.forEach((m) => { novo[m.user_id] = porMembro; });
    setValoresMembro(novo);
  };

  const somaAtual = useMemo(() => {
    return Object.values(valoresMembro).reduce((s, v) => {
      const n = parseFloat(v.replace(',', '.'));
      return s + (isNaN(n) ? 0 : n);
    }, 0);
  }, [valoresMembro]);

  const totalNum = parseFloat(valorTotal.replace(',', '.')) || 0;
  const diff = Math.round((somaAtual - totalNum) * 100) / 100;
  const diffOk = Math.abs(diff) < 0.02;

  const handleSalvar = useCallback(async () => {
    if (!usuario?.id) return;
    if (!titulo.trim()) { toast.aviso('Informe uma descrição.'); return; }
    if (totalNum <= 0) { toast.aviso('Informe o valor total.'); return; }
    if (!diffOk) { toast.aviso(`A soma dos valores (${formatarMoeda(somaAtual)}) não bate com o total (${formatarMoeda(totalNum)}).`); return; }

    const transacoesParaCriar = membros
      .filter((m) => {
        const v = parseFloat((valoresMembro[m.user_id] || '0').replace(',', '.'));
        return v > 0;
      })
      .map((m) => {
        const v = parseFloat((valoresMembro[m.user_id] || '0').replace(',', '.'));
        const dataFinal = `${anoInput}-${mesInput.padStart(2, '0')}-${diaInput.padStart(2, '0')}`;
        return {
          grupo_id: grupoId,
          criado_por: m.user_id,
          criado_por_nome: m.nome,
          titulo: `${titulo.trim()} (${m.nome})`,
          valor: v,
          categoria,
          tipo: 'despesa' as const,
          data: dataFinal,
          fixo: false,
          parcelado: false,
        };
      });

    if (transacoesParaCriar.length === 0) { toast.aviso('Nenhum membro com valor > 0.'); return; }

    setLoading(true);
    try {
      await criarTransacoesBatch(transacoesParaCriar);
      invalidarPorPrefixo(CACHE_KEYS.transacoesPrefixo(grupoId));
      toast.ok(`${transacoesParaCriar.length} despesas criadas!`);
      navigation.goBack();
    } catch (err: any) {
      toast.erro(err.message || 'Erro ao salvar split.');
    } finally {
      setLoading(false);
    }
  }, [titulo, totalNum, categoria, membros, valoresMembro, anoInput, mesInput, diaInput, grupoId, usuario, diffOk, somaAtual, navigation, invalidarPorPrefixo]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>Split de Despesa</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><X size={24} color={Colors.textPrimary} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>Valor Total (R$)</Text>
        <TextInput
          style={[s.input, s.valorInput]} placeholder="0,00" placeholderTextColor={Colors.textMuted}
          value={valorTotal} onChangeText={setValorTotal} keyboardType="decimal-pad"
        />

        <Text style={s.label}>Descrição</Text>
        <TextInput
          style={s.input} placeholder="Ex: Jantar aniversário" placeholderTextColor={Colors.textMuted}
          value={titulo} onChangeText={setTitulo}
        />

        <Text style={s.label}>Data</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <TextInput style={[s.input, { flex: 1, textAlign: 'center' }]} value={diaInput} onChangeText={setDiaInput} keyboardType="number-pad" maxLength={2} />
          <TextInput style={[s.input, { flex: 1, textAlign: 'center' }]} value={mesInput} onChangeText={setMesInput} keyboardType="number-pad" maxLength={2} />
          <TextInput style={[s.input, { flex: 2, textAlign: 'center' }]} value={anoInput} onChangeText={setAnoInput} keyboardType="number-pad" maxLength={4} />
        </View>

        <Text style={s.label}>Categoria</Text>
        <View style={s.catGrid}>
          {categoriasLista.map((cat) => (
            <TouchableOpacity key={cat.id} style={[s.catItem, categoria === cat.id && s.catItemSel]} onPress={() => setCategoria(cat.id)}>
              <CategoriaIcon categoria={cat.id} corCustom={(cat as any).cor} size={28} />
              <Text style={[s.catLabel, categoria === cat.id && s.catLabelSel]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
          <Text style={s.label}>Valor por membro</Text>
          <TouchableOpacity onPress={distribuirIgualmente} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Users size={14} color={Colors.primary} />
            <Text style={{ color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold }}>Dividir igual</Text>
          </TouchableOpacity>
        </View>

        {membros.map((m, idx) => (
          <View key={m.user_id} style={s.membroCard}>
            <View style={[s.avatar, { backgroundColor: corAvatar(idx) }]}>
              <Text style={s.avatarText}>{iniciais(m.nome)}</Text>
            </View>
            <Text style={s.membroNome}>{m.nome}{m.user_id === usuario?.id ? ' (você)' : ''}</Text>
            <TextInput
              style={s.membroInput}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={Colors.textMuted}
              value={valoresMembro[m.user_id] || ''}
              onChangeText={(v) => setValorMembro(m.user_id, v)}
            />
          </View>
        ))}

        {/* Totalizador */}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Soma dos membros</Text>
          <Text style={[s.totalValue, { color: diffOk ? Colors.renda : Colors.despesa }]}>
            {formatarMoeda(somaAtual)}
          </Text>
        </View>
        {totalNum > 0 && (
          <View style={s.diffRow}>
            <Text style={[s.diffText, { color: diffOk ? Colors.renda : Colors.despesa }]}>
              {diffOk ? '✓ Valores conferem' : diff > 0 ? `⚠ Excede em ${formatarMoeda(diff)}` : `⚠ Falta ${formatarMoeda(Math.abs(diff))}`}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.submitBtn, (!diffOk || loading) && s.submitBtnDisabled]}
          onPress={handleSalvar}
          disabled={!diffOk || loading}
        >
          {loading
            ? <ActivityIndicator color={Colors.textInverse} />
            : <><Split size={18} color={Colors.textInverse} /><Text style={s.submitBtnText}>Criar {membros.filter(m => parseFloat((valoresMembro[m.user_id]||'0').replace(',','.'))>0).length} despesas</Text></>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

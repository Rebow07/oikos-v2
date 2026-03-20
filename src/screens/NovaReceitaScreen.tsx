import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { criarReceita } from '../services/receitas.service';
import { criarTransacao } from '../services/transacoes.service';
import { CATEGORIAS_RECEITA } from '../constants';
import { dataHoje } from '../utils';
import CategoriaIcon from '../components/CategoriaIcon';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
    headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary },
    scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: C.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.lg },
    input: { backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    inputFocused: { borderColor: C.renda },
    valorInput: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, textAlign: 'center', paddingVertical: Spacing.lg },
    categoriaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    categoriaItem: { alignItems: 'center', width: 80, paddingVertical: Spacing.sm, borderRadius: Radius.sm },
    categoriaItemSelected: { backgroundColor: C.renda + '20', borderWidth: 1, borderColor: C.renda },
    categoriaLabel: { fontSize: 10, color: C.textMuted, marginTop: 4, textAlign: 'center' },
    categoriaLabelSelected: { color: C.renda, fontWeight: FontWeight.bold },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    rowLabel: { fontSize: FontSize.md, color: C.textPrimary },
    hint: { fontSize: FontSize.xs, color: C.textMuted, marginTop: Spacing.xs },
    submitBtn: { backgroundColor: C.renda, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xl },
    submitBtnDisabled: { opacity: 0.5 },
    submitBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#FFFFFF' },
  });
}

export default function NovaReceitaScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { usuario, grupoId, nomeUsuario } = useApp();

  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('salario');
  const [fixo, setFixo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [focusField, setFocusField] = useState('');

  const handleSalvar = useCallback(async () => {
    const valorNum = parseFloat(valor.replace(',', '.'));
    if (!nome.trim()) { Alert.alert('Erro', 'Informe o nome da receita.'); return; }
    if (isNaN(valorNum) || valorNum <= 0) { Alert.alert('Erro', 'Informe um valor válido.'); return; }

    setLoading(true);
    try {
      if (fixo) {
        // Criar fonte de receita fixa
        await criarReceita({
          grupo_id: grupoId,
          criado_por: usuario.id,
          nome: nome.trim(),
          valor: valorNum,
          categoria,
          fixo: true,
          ativo: true,
        });
      } else {
        // Criar transação avulsa do tipo renda
        await criarTransacao({
          grupo_id: grupoId,
          criado_por: usuario.id,
          criado_por_nome: nomeUsuario || null,
          titulo: nome.trim(),
          valor: valorNum,
          categoria,
          tipo: 'renda',
          data: dataHoje(),
          fixo: false,
          parcelado: false,
        });
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível salvar.');
    } finally {
      setLoading(false);
    }
  }, [nome, valor, categoria, fixo, grupoId, usuario, nomeUsuario, navigation]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>Nova Receita</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Valor */}
        <Text style={s.label}>Valor (R$)</Text>
        <TextInput
          style={[s.input, s.valorInput, focusField === 'valor' && s.inputFocused]}
          placeholder="0,00"
          placeholderTextColor={Colors.textMuted}
          value={valor}
          onChangeText={setValor}
          keyboardType="decimal-pad"
          onFocus={() => setFocusField('valor')}
          onBlur={() => setFocusField('')}
        />

        {/* Nome */}
        <Text style={s.label}>Nome</Text>
        <TextInput
          style={[s.input, focusField === 'nome' && s.inputFocused]}
          placeholder="Ex: Salário"
          placeholderTextColor={Colors.textMuted}
          value={nome}
          onChangeText={setNome}
          onFocus={() => setFocusField('nome')}
          onBlur={() => setFocusField('')}
        />

        {/* Categoria */}
        <Text style={s.label}>Categoria</Text>
        <View style={s.categoriaGrid}>
          {CATEGORIAS_RECEITA.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[s.categoriaItem, categoria === cat.id && s.categoriaItemSelected]}
              onPress={() => setCategoria(cat.id)}
              activeOpacity={0.7}
            >
              <CategoriaIcon categoria={cat.id} tipo="renda" size={32} />
              <Text style={[s.categoriaLabel, categoria === cat.id && s.categoriaLabelSelected]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fixo toggle */}
        <View style={[s.row, { marginTop: Spacing.lg }]}>
          <Text style={s.rowLabel}>Receita fixa</Text>
          <Switch
            value={fixo}
            onValueChange={setFixo}
            trackColor={{ false: Colors.border, true: Colors.renda + '80' }}
            thumbColor={fixo ? Colors.renda : Colors.textMuted}
          />
        </View>
        <Text style={s.hint}>
          {fixo
            ? 'Será cadastrada como fonte de receita recorrente.'
            : 'Será lançada como receita avulsa deste mês.'}
        </Text>

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, loading && s.submitBtnDisabled]}
          onPress={handleSalvar}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.submitBtnText}>Salvar Receita</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

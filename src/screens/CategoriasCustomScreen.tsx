// src/screens/CategoriasCustomScreen.tsx
// Gerenciar categorias personalizadas (salvas localmente no AsyncStorage)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, X, Trash2, Edit2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { toast } from '../utils/toast';

const KEY = '@rebow_categorias_custom';

export interface CategoriaCustom {
  id: string;
  label: string;
  cor: string;
  icon: string;
}

const PALETA = [
  '#E74C3C','#E67E22','#F1C40F','#2ECC71','#1ABC9C',
  '#3498DB','#9B59B6','#34495E','#E91E63','#00BCD4',
];

export async function getCategoriasCustom(): Promise<CategoriaCustom[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveCategoriasCustom(lista: CategoriaCustom[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(lista));
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: Spacing.md },
    title: { flex: 1, fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: C.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full },
    addBtnText: { color: C.textInverse, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
    catItem: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border,
    },
    dot: { width: 14, height: 14, borderRadius: 7, marginRight: Spacing.md },
    catLabel: { flex: 1, fontSize: FontSize.md, color: C.textPrimary },
    actions: { flexDirection: 'row', gap: Spacing.md },
    emptyText: { textAlign: 'center', color: C.textMuted, fontSize: FontSize.md, paddingVertical: Spacing.xxl },
    hint: { textAlign: 'center', color: C.textMuted, fontSize: FontSize.xs, paddingBottom: Spacing.md },
    // Modal  
    overlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
    modal: { backgroundColor: C.background, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, paddingBottom: Spacing.xxl },
    modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary, marginBottom: Spacing.lg },
    label: { fontSize: FontSize.sm, color: C.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.md, fontWeight: FontWeight.semibold },
    input: { backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    paleta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
    paletaDot: { width: 32, height: 32, borderRadius: 16 },
    paletaDotSel: { borderWidth: 3, borderColor: C.textPrimary },
    saveBtn: { backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xl },
    saveBtnText: { color: C.textInverse, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  });
}

export default function CategoriasCustomScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = useMemo(() => makeStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();

  const [categorias, setCategorias] = useState<CategoriaCustom[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<CategoriaCustom | null>(null);
  const [nomeEdit, setNomeEdit] = useState('');
  const [corEdit, setCorEdit] = useState(PALETA[0]);

  useEffect(() => {
    getCategoriasCustom().then(setCategorias);
  }, []);

  const abrirNova = () => {
    setEditando(null);
    setNomeEdit('');
    setCorEdit(PALETA[0]);
    setShowModal(true);
  };

  const abrirEditar = (cat: CategoriaCustom) => {
    setEditando(cat);
    setNomeEdit(cat.label);
    setCorEdit(cat.cor);
    setShowModal(true);
  };

  const salvar = useCallback(async () => {
    if (!nomeEdit.trim()) { toast.aviso('Nome obrigatório.'); return; }
    const nova: CategoriaCustom = {
      id: editando?.id || `custom_${Date.now()}`,
      label: nomeEdit.trim(),
      cor: corEdit,
      icon: 'Tag',
    };
    const lista = editando
      ? categorias.map((c) => c.id === editando.id ? nova : c)
      : [...categorias, nova];
    await saveCategoriasCustom(lista);
    setCategorias(lista);
    setShowModal(false);
    toast.ok(editando ? 'Categoria atualizada!' : 'Categoria criada!');
  }, [nomeEdit, corEdit, editando, categorias]);

  const excluir = (cat: CategoriaCustom) => {
    Alert.alert('Excluir categoria', `Remover "${cat.label}"?`, [
      { text: 'Cancelar' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          const lista = categorias.filter((c) => c.id !== cat.id);
          await saveCategoriasCustom(lista);
          setCategorias(lista);
          toast.ok('Categoria removida.');
        },
      },
    ]);
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Categorias Custom</Text>
        <TouchableOpacity style={s.addBtn} onPress={abrirNova}>
          <Plus size={16} color={Colors.textInverse} />
          <Text style={s.addBtnText}>Nova</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.hint}>As categorias criadas aqui aparecem no seletor de Nova Despesa</Text>

      <FlatList
        data={categorias}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={<Text style={s.emptyText}>Nenhuma categoria personalizada ainda.</Text>}
        renderItem={({ item }) => (
          <View style={s.catItem}>
            <View style={[s.dot, { backgroundColor: item.cor }]} />
            <Text style={s.catLabel}>{item.label}</Text>
            <View style={s.actions}>
              <TouchableOpacity onPress={() => abrirEditar(item)}>
                <Edit2 size={18} color={Colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => excluir(item)}>
                <Trash2 size={18} color={Colors.despesa} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={showModal} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowModal(false)}>
          <View style={s.modal} onStartShouldSetResponder={() => true}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg }}>
              <Text style={s.modalTitle}>{editando ? 'Editar Categoria' : 'Nova Categoria'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><X size={22} color={Colors.textPrimary} /></TouchableOpacity>
            </View>
            <Text style={s.label}>Nome</Text>
            <TextInput
              style={s.input} value={nomeEdit} onChangeText={setNomeEdit}
              placeholder="Ex: Viagem a trabalho" placeholderTextColor={Colors.textMuted}
            />
            <Text style={s.label}>Cor</Text>
            <View style={s.paleta}>
              {PALETA.map((c) => (
                <TouchableOpacity
                  key={c} style={[s.paletaDot, { backgroundColor: c }, corEdit === c && s.paletaDotSel]}
                  onPress={() => setCorEdit(c)}
                />
              ))}
            </View>
            <TouchableOpacity style={s.saveBtn} onPress={salvar}>
              <Text style={s.saveBtnText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

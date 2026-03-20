import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Plus, Trash2, CheckSquare, Square, ShoppingCart } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { buscarListas, criarLista, excluirLista, buscarItens, criarItem, atualizarItem, excluirItem } from '../services/compras.service';
import { formatarMoeda } from '../utils';
import type { ListaCompras, ItemCompra } from '../types';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
    headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary },
    scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    listaCard: { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    listaIcon: { marginRight: Spacing.md },
    listaInfo: { flex: 1 },
    listaNome: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: C.textPrimary },
    listaData: { fontSize: FontSize.xs, color: C.textMuted, marginTop: 2 },
    // Items view
    itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    itemCheck: { marginRight: Spacing.md },
    itemInfo: { flex: 1 },
    itemNome: { fontSize: FontSize.md, color: C.textPrimary },
    itemNomeMarcado: { textDecorationLine: 'line-through', color: C.textMuted },
    itemQtd: { fontSize: FontSize.xs, color: C.textMuted },
    itemValor: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: C.textPrimary, marginRight: Spacing.sm },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: C.border, marginTop: Spacing.md },
    totalLabel: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.textPrimary },
    totalValue: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: C.primary },
    addItemRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
    addItemInput: { flex: 1, backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.sm, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    addItemSmall: { width: 60 },
    addBtn: { backgroundColor: C.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: FontSize.md, color: C.textMuted, textAlign: 'center', paddingVertical: Spacing.xxl },
    fab: { position: 'absolute', right: Spacing.md, bottom: Spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 },
    modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: C.background, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingBottom: Spacing.xxl, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },
    modalScroll: { paddingHorizontal: Spacing.md },
    backBtn: { fontSize: FontSize.sm, color: C.primary, fontWeight: FontWeight.bold },
  });
}

export default function ListaComprasScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { usuario, grupoId } = useApp();

  const [listas, setListas] = useState<ListaCompras[]>([]);
  const [loading, setLoading] = useState(true);
  const [listaSel, setListaSel] = useState<ListaCompras | null>(null);
  const [itens, setItens] = useState<ItemCompra[]>([]);
  const [novoNomeLista, setNovoNomeLista] = useState('');
  const [showNova, setShowNova] = useState(false);

  // Add item
  const [itemNome, setItemNome] = useState('');
  const [itemQtd, setItemQtd] = useState('1');
  const [itemValor, setItemValor] = useState('');

  const carregarListas = useCallback(async () => {
    try { const data = await buscarListas(grupoId); setListas(data); } finally { setLoading(false); }
  }, [grupoId]);

  useEffect(() => { carregarListas(); }, [carregarListas]);

  const abrirLista = useCallback(async (lista: ListaCompras) => {
    setListaSel(lista);
    const data = await buscarItens(lista.id);
    setItens(data);
  }, []);

  const handleCriarLista = useCallback(async () => {
    if (!novoNomeLista.trim()) return;
    await criarLista({ grupo_id: grupoId, criado_por: usuario.id, nome: novoNomeLista.trim() });
    setNovoNomeLista('');
    setShowNova(false);
    carregarListas();
  }, [novoNomeLista, grupoId, usuario, carregarListas]);

  const handleAddItem = useCallback(async () => {
    if (!listaSel || !itemNome.trim()) return;
    await criarItem({
      lista_id: listaSel.id, grupo_id: grupoId, nome: itemNome.trim(),
      quantidade: parseFloat(itemQtd) || 1, valor_unitario: parseFloat(itemValor.replace(',', '.')) || 0,
      marcado: false, criado_por: usuario.id,
    });
    setItemNome(''); setItemQtd('1'); setItemValor('');
    const data = await buscarItens(listaSel.id); setItens(data);
  }, [listaSel, itemNome, itemQtd, itemValor, grupoId, usuario]);

  const toggleItem = useCallback(async (item: ItemCompra) => {
    await atualizarItem(item.id, { marcado: !item.marcado });
    setItens((prev) => prev.map((i) => i.id === item.id ? { ...i, marcado: !i.marcado } : i));
  }, []);

  const removeItem = useCallback(async (id: string) => {
    await excluirItem(id);
    setItens((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const totalLista = itens.reduce((acc, i) => acc + (i.quantidade * i.valor_unitario), 0);

  // Detail view (selected list)
  if (listaSel) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.headerBar}>
          <TouchableOpacity onPress={() => setListaSel(null)}><Text style={s.backBtn}>Voltar</Text></TouchableOpacity>
          <Text style={s.headerTitle}>{listaSel.nome}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}><X size={24} color={Colors.textPrimary} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.scroll}>
          {itens.map((item) => (
            <View key={item.id} style={s.itemRow}>
              <TouchableOpacity style={s.itemCheck} onPress={() => toggleItem(item)}>
                {item.marcado ? <CheckSquare size={22} color={Colors.renda} /> : <Square size={22} color={Colors.textMuted} />}
              </TouchableOpacity>
              <View style={s.itemInfo}>
                <Text style={[s.itemNome, item.marcado && s.itemNomeMarcado]}>{item.nome}</Text>
                <Text style={s.itemQtd}>{item.quantidade} × {formatarMoeda(item.valor_unitario)}</Text>
              </View>
              <Text style={s.itemValor}>{formatarMoeda(item.quantidade * item.valor_unitario)}</Text>
              <TouchableOpacity onPress={() => removeItem(item.id)}><Trash2 size={16} color={Colors.despesa} /></TouchableOpacity>
            </View>
          ))}

          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>{formatarMoeda(totalLista)}</Text>
          </View>

          {/* Add item inline */}
          <View style={s.addItemRow}>
            <TextInput style={s.addItemInput} placeholder="Item" placeholderTextColor={Colors.textMuted} value={itemNome} onChangeText={setItemNome} />
            <TextInput style={[s.addItemInput, s.addItemSmall]} placeholder="Qtd" placeholderTextColor={Colors.textMuted} value={itemQtd} onChangeText={setItemQtd} keyboardType="decimal-pad" />
            <TextInput style={[s.addItemInput, s.addItemSmall]} placeholder="R$" placeholderTextColor={Colors.textMuted} value={itemValor} onChangeText={setItemValor} keyboardType="decimal-pad" />
            <TouchableOpacity style={s.addBtn} onPress={handleAddItem}><Plus size={20} color={Colors.textInverse} /></TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Lists view
  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>Listas de Compras</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><X size={24} color={Colors.textPrimary} /></TouchableOpacity>
      </View>
      <FlatList
        data={listas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.scroll}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.listaCard} onPress={() => abrirLista(item)}>
            <ShoppingCart size={22} color={Colors.primary} style={{ marginRight: Spacing.md }} />
            <View style={s.listaInfo}>
              <Text style={s.listaNome}>{item.nome}</Text>
            </View>
            <TouchableOpacity onPress={() => { Alert.alert('Excluir', `Remover "${item.nome}"?`, [{ text: 'Cancelar' }, { text: 'Excluir', style: 'destructive', onPress: async () => { await excluirLista(item.id); carregarListas(); } }]); }}>
              <Trash2 size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={s.emptyText}>{loading ? 'Carregando...' : 'Nenhuma lista criada'}</Text>}
      />
      <TouchableOpacity style={s.fab} onPress={() => setShowNova(true)} activeOpacity={0.8}><Plus size={26} color={Colors.textInverse} /></TouchableOpacity>

      <Modal visible={showNova} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowNova(false)}>
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHeader}><Text style={s.modalTitle}>Nova Lista</Text><TouchableOpacity onPress={() => setShowNova(false)}><X size={22} color={Colors.textPrimary} /></TouchableOpacity></View>
            <View style={s.modalScroll}>
              <TextInput style={[s.addItemInput, { marginTop: Spacing.lg }]} placeholder="Nome da lista" placeholderTextColor={Colors.textMuted} value={novoNomeLista} onChangeText={setNovoNomeLista} />
              <TouchableOpacity style={[s.fab, { position: 'relative', marginTop: Spacing.lg, width: '100%', height: 48, borderRadius: Radius.md }]} onPress={handleCriarLista}>
                <Text style={{ color: Colors.textInverse, fontSize: FontSize.md, fontWeight: FontWeight.bold }}>Criar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

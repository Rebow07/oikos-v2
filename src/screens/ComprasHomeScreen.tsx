import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, Modal, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, X, Trash2, CheckSquare, Square, ShoppingCart, List, ShoppingBag } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabase';
import { formatarMoeda } from '../utils';
import type { ListaCompras, ItemCompra } from '../types';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: Spacing.md },
    headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary, flex: 1 },
    headerCount: { fontSize: FontSize.xs, color: C.textMuted },
    list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    listaCard: { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    listaInfo: { flex: 1, marginLeft: Spacing.md },
    listaNome: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: C.textPrimary },
    listaConcluida: { fontSize: FontSize.xs, color: C.renda, marginTop: 2 },
    tabRow: { flexDirection: 'row', marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: C.surface, borderRadius: Radius.sm, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    tab: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
    tabActive: { backgroundColor: C.primary + '20' },
    tabText: { fontSize: FontSize.sm, color: C.textMuted, fontWeight: FontWeight.semibold },
    tabTextActive: { color: C.primary },
    itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    itemCheck: { marginRight: Spacing.md },
    itemInfo: { flex: 1 },
    itemNome: { fontSize: FontSize.md, color: C.textPrimary },
    itemNomeDone: { textDecorationLine: 'line-through', color: C.textMuted },
    itemTotal: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: C.textPrimary, marginLeft: Spacing.sm },
    cartInputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 4 },
    cartInput: { backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4, fontSize: FontSize.sm, color: C.textPrimary, borderWidth: 1, borderColor: C.border, textAlign: 'center', minWidth: 45 },
    totalBar: { backgroundColor: C.cardDark, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.textOnCard },
    totalValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: C.primary },
    finalizarBtn: { backgroundColor: C.renda, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
    finalizarBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#FFFFFF' },
    addRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
    addInput: { flex: 1, backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    addBtn: { backgroundColor: C.primary, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: FontSize.md, color: C.textMuted, textAlign: 'center', paddingVertical: Spacing.xxl },
    fab: { position: 'absolute', right: Spacing.md, bottom: Spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: Spacing.lg },
    modalBox: { backgroundColor: C.background, borderRadius: Radius.lg, padding: Spacing.lg },
    modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary, marginBottom: Spacing.md },
    modalInput: { backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border, marginBottom: Spacing.md },
    modalBtn: { backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
    modalBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.textInverse },
  });
}

export default function ComprasHomeScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { usuario, grupoId } = useApp();

  const [listas, setListas] = useState<ListaCompras[]>([]);
  const [listaSel, setListaSel] = useState<ListaCompras | null>(null);
  const [itens, setItens] = useState<ItemCompra[]>([]);
  const [tab, setTab] = useState<'lista' | 'carrinho'>('lista');
  const [loading, setLoading] = useState(true);
  const [showNova, setShowNova] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [itemNome, setItemNome] = useState('');

  const carregarListas = useCallback(async () => {
    const { data } = await supabase.from('listas_compras').select('*').eq('grupo_id', grupoId).order('criado_em', { ascending: false });
    setListas((data as ListaCompras[]) || []);
    setLoading(false);
  }, [grupoId]);

  const carregarItens = useCallback(async (listaId: string) => {
    const { data } = await supabase.from('itens_compra').select('*').eq('lista_id', listaId).order('criado_em');
    setItens((data as ItemCompra[]) || []);
  }, []);

  useEffect(() => {
    if (grupoId) carregarListas();
  }, [grupoId, carregarListas]);

  // SOMA TOTAL: Considera apenas itens do carrinho ou todos dependendo da regra de negócio
  const totalCompra = useMemo(() => 
    itens.reduce((a, i) => a + (Number(i.quantidade || 0) * Number(i.valor_unitario || 0)), 0), 
  [itens]);

  const itensMarcadosCount = useMemo(() => itens.filter((i) => i.marcado).length, [itens]);
  const estaConcluida = useMemo(() => listaSel?.concluida || false, [listaSel]);

  const abrirLista = (l: ListaCompras) => {
    setListaSel(l);
    setTab('lista');
    carregarItens(l.id);
  };

  const handleCriarLista = async () => {
    if (!novoNome.trim()) return;
    await supabase.from('listas_compras').insert({ grupo_id: grupoId, criado_por: usuario.id, nome: novoNome.trim() });
    setNovoNome('');
    setShowNova(false);
    carregarListas();
  };

  const handleAddItem = async () => {
    if (!listaSel || estaConcluida || !itemNome.trim()) return;
    try {
      const { error } = await supabase.from('itens_compra').insert({ 
        lista_id: listaSel.id, 
        grupo_id: grupoId, 
        nome: itemNome.trim(), 
        quantidade: 1, 
        valor_unitario: 0, 
        marcado: false, 
        criado_por: usuario.id 
      });
      if (error) throw error;
      setItemNome('');
      carregarItens(listaSel.id);
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    }
  };

  const toggleItem = async (item: ItemCompra) => {
    if (estaConcluida) return;
    const novoStatus = !item.marcado;
    setItens(prev => prev.map(i => i.id === item.id ? { ...i, marcado: novoStatus } : i));
    await supabase.from('itens_compra').update({ marcado: novoStatus }).eq('id', item.id);
  };

  const updateItemField = async (item: ItemCompra, field: 'quantidade' | 'valor_unitario', value: string) => {
    if (estaConcluida) return;
    const val = parseFloat(value.replace(',', '.')) || 0;
    
    // Atualização otimista local para soma imediata
    setItens(prev => prev.map(i => i.id === item.id ? { ...i, [field]: val } : i));
    
    // Sync com banco
    await supabase.from('itens_compra').update({ [field]: val }).eq('id', item.id);
  };

  const removeItem = async (id: string) => {
    if (estaConcluida) return;
    setItens(prev => prev.filter(i => i.id !== id));
    await supabase.from('itens_compra').delete().eq('id', id);
  };

  const handleFinalizar = async () => {
    if (totalCompra <= 0) { Alert.alert('Aviso', 'O total da compra é R$ 0,00. Adicione valores aos itens.'); return; }

    try {
      const idsNaoMarcados = itens.filter(i => !i.marcado).map(i => i.id);
      if (idsNaoMarcados.length > 0) {
        await supabase.from('itens_compra').update({ marcado: true }).in('id', idsNaoMarcados);
      }
      if (listaSel) {
        await supabase.from('listas_compras').update({ concluida: true }).eq('id', listaSel.id);
        setListaSel({ ...listaSel, concluida: true });
      }
      setItens(prev => prev.map(i => ({ ...i, marcado: true })));
      setTab('lista');
      navigation.navigate('NovaDespesa', {
        valorPreenchido: totalCompra.toFixed(2).replace('.', ','),
        tituloPreenchido: `Compras: ${listaSel?.nome}`,
        categoriaPreenchida: 'mercado',
      });
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    }
  };

  if (listaSel) {
    const itensVisiveis = (estaConcluida || tab === 'lista') ? itens : itens.filter((i) => !i.marcado);

    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[s.container, { paddingTop: insets.top }]}>
          <View style={s.headerBar}>
            <TouchableOpacity onPress={() => { setListaSel(null); carregarListas(); }}>
              <ArrowLeft size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>{listaSel.nome}</Text>
            <Text style={s.headerCount}>{itensMarcadosCount}/{itens.length}</Text>
          </View>

          {!estaConcluida && (
            <View style={s.tabRow}>
              <TouchableOpacity style={[s.tab, tab === 'lista' && s.tabActive]} onPress={() => setTab('lista')}>
                <List size={16} color={tab === 'lista' ? Colors.primary : Colors.textMuted} />
                <Text style={[s.tabText, tab === 'lista' && s.tabTextActive]}>Lista</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.tab, tab === 'carrinho' && s.tabActive]} onPress={() => setTab('carrinho')}>
                <ShoppingCart size={16} color={tab === 'carrinho' ? Colors.primary : Colors.textMuted} />
                <Text style={[s.tabText, tab === 'carrinho' && s.tabTextActive]}>Carrinho</Text>
              </TouchableOpacity>
            </View>
          )}

          <FlatList 
            data={itensVisiveis} 
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => {
              const subtotal = Number(item.quantidade || 0) * Number(item.valor_unitario || 0);
              return (
                <View style={s.itemRow}>
                  <TouchableOpacity style={s.itemCheck} onPress={() => toggleItem(item)} disabled={estaConcluida}>
                    {item.marcado ? <CheckSquare size={22} color={Colors.renda} /> : <Square size={22} color={Colors.textMuted} />}
                  </TouchableOpacity>

                  <View style={s.itemInfo}>
                    <Text style={[s.itemNome, (item.marcado || estaConcluida) && s.itemNomeDone, estaConcluida && { color: Colors.renda, textDecorationLine: 'none', fontWeight: 'bold' }]}>
                      {item.nome}
                    </Text>
                    
                    {/* CAMPOS EDITÁVEIS NO CARRINHO */}
                    {!estaConcluida && tab === 'carrinho' ? (
                      <View style={s.cartInputRow}>
                        <TextInput 
                          style={s.cartInput} 
                          defaultValue={String(item.quantidade || '')}
                          placeholder="Qtd"
                          keyboardType="numeric"
                          placeholderTextColor={Colors.textMuted}
                          onEndEditing={(e) => updateItemField(item, 'quantidade', e.nativeEvent.text)}
                        />
                        <Text style={{ color: Colors.textMuted }}>x</Text>
                        <TextInput 
                          style={s.cartInput} 
                          defaultValue={item.valor_unitario > 0 ? String(item.valor_unitario) : ''}
                          placeholder="R$ 0,00"
                          keyboardType="decimal-pad"
                          placeholderTextColor={Colors.textMuted}
                          onEndEditing={(e) => updateItemField(item, 'valor_unitario', e.nativeEvent.text)}
                        />
                      </View>
                    ) : (
                      // TEXTO ESTÁTICO NA LISTA OU CONCLUÍDA
                      <Text style={{ color: Colors.textMuted, fontSize: FontSize.xs }}>
                        {item.quantidade}x {formatarMoeda(item.valor_unitario)}
                      </Text>
                    )}
                  </View>

                  {/* SOMA DO ITEM NO FINAL DA LINHA */}
                  <Text style={[s.itemTotal, estaConcluida && { color: Colors.renda }]}>
                    {formatarMoeda(subtotal)}
                  </Text>

                  {!estaConcluida && (
                    <TouchableOpacity onPress={() => removeItem(item.id)} style={{ marginLeft: Spacing.sm }}>
                      <Trash2 size={16} color={Colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={<Text style={s.emptyText}>{estaConcluida ? 'Compra finalizada' : 'Nenhum item'}</Text>}
          />

          {/* SOMATÓRIA TOTAL NO RODAPÉ */}
          <View style={s.totalBar}>
            <Text style={s.totalLabel}>{estaConcluida ? 'Total Pago' : 'Total no Carrinho'}</Text>
            <Text style={[s.totalValue, estaConcluida && { color: Colors.renda }]}>{formatarMoeda(totalCompra)}</Text>
          </View>

          {!estaConcluida && (
            <>
              {tab === 'carrinho' && (
                <TouchableOpacity style={s.finalizarBtn} onPress={handleFinalizar}>
                  <ShoppingBag size={18} color="#FFF" />
                  <Text style={s.finalizarBtnText}>Finalizar Compra</Text>
                </TouchableOpacity>
              )}
              <View style={s.addRow}>
                <TextInput style={s.addInput} placeholder="Novo item..." value={itemNome} onChangeText={setItemNome} onSubmitEditing={handleAddItem} />
                <TouchableOpacity style={s.addBtn} onPress={handleAddItem}><Plus size={20} color={Colors.textInverse} /></TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }

  // LISTA DE LISTAS (VISÃO GERAL)
  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color={Colors.textPrimary} /></TouchableOpacity>
        <Text style={s.headerTitle}>Minhas Listas</Text>
      </View>
      <FlatList 
        data={listas} 
        keyExtractor={(i) => i.id} 
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.listaCard} onPress={() => abrirLista(item)}>
            <ShoppingBag size={22} color={item.concluida ? Colors.renda : Colors.primary} />
            <View style={s.listaInfo}>
              <Text style={s.listaNome}>{item.nome}</Text>
              {item.concluida && <Text style={s.listaConcluida}>Compra realizada</Text>}
            </View>
            <Trash2 size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={s.emptyText}>{loading ? 'Carregando...' : 'Nenhuma lista'}</Text>}
      />
      <TouchableOpacity style={s.fab} onPress={() => setShowNova(true)}><Plus size={26} color={Colors.textInverse} /></TouchableOpacity>
      
      <Modal visible={showNova} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Nova Lista</Text>
            <TextInput style={s.modalInput} placeholder="Nome" value={novoNome} onChangeText={setNovoNome} autoFocus />
            <TouchableOpacity style={s.modalBtn} onPress={handleCriarLista}><Text style={s.modalBtnText}>Criar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
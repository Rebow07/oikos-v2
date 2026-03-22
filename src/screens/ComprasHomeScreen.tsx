import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, Modal, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, X, Trash2, CheckSquare, Square, ShoppingCart, List, ShoppingBag } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { useCacheInvalidation, CACHE_KEYS } from '../context/CacheContext';
import { supabase } from '../services/supabase';
import { formatarMoeda } from '../utils';
import { toast } from '../utils/toast';
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
    modalBtnRow: { flexDirection: 'row', gap: Spacing.sm },
    modalBtn: { flex: 1, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
    modalBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#FFF' },
  });
}

export default function ComprasHomeScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { usuario, grupoId } = useApp();
  const { invalidarPorPrefixo } = useCacheInvalidation();

  const [listas, setListas] = useState<ListaCompras[]>([]);
  const [listaSel, setListaSel] = useState<ListaCompras | null>(null);
  const [itens, setItens] = useState<ItemCompra[]>([]);
  const [tab, setTab] = useState<'lista' | 'carrinho'>('lista');
  const [loading, setLoading] = useState(true);
  const [showNova, setShowNova] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [itemNome, setItemNome] = useState('');

  const carregarListas = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('listas_compras').select('*').eq('grupo_id', grupoId).order('criado_em', { ascending: false });
    setListas((data as ListaCompras[]) || []);
    setLoading(false);
  }, [grupoId]);

  const carregarItens = useCallback(async (listaId: string) => {
    const { data } = await supabase.from('itens_compra').select('*').eq('lista_id', listaId).order('marcado', { ascending: true }).order('criado_em', { ascending: false });
    setItens((data as ItemCompra[]) || []);
  }, []);

  useEffect(() => {
    if (grupoId) carregarListas();
  }, [grupoId, carregarListas]);

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
    try {
      const { error } = await supabase.from('listas_compras').insert({ grupo_id: grupoId, criado_por: usuario.id, nome: novoNome.trim() });
      if (error) throw error;
      setNovoNome('');
      setShowNova(false);
      carregarListas();
      toast.ok('Lista criada!');
    } catch (err: any) { toast.erro(err.message); }
  };

  const handleExcluirLista = (id: string) => {
    Alert.alert('Excluir Lista', 'Tem certeza que deseja apagar esta lista e todos os seus itens?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
          await supabase.from('listas_compras').delete().eq('id', id);
          carregarListas();
          toast.ok('Lista removida');
      }}
    ]);
  };

  const handleAddItem = async () => {
    if (!listaSel || estaConcluida || !itemNome.trim()) return;
    try {
      const { data, error } = await supabase.from('itens_compra').insert({ 
        lista_id: listaSel.id, 
        grupo_id: grupoId, 
        nome: itemNome.trim(), 
        quantidade: 1, 
        valor_unitario: 0, 
        marcado: false, 
        criado_por: usuario.id 
      }).select().single();
      if (error) throw error;
      setItens(prev => [data, ...prev]);
      setItemNome('');
    } catch (err: any) { toast.erro(err.message); }
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
    setItens(prev => prev.map(i => i.id === item.id ? { ...i, [field]: val } : i));
    await supabase.from('itens_compra').update({ [field]: val }).eq('id', item.id);
  };

  const removeItem = async (id: string) => {
    if (estaConcluida) return;
    setItens(prev => prev.filter(i => i.id !== id));
    await supabase.from('itens_compra').delete().eq('id', id);
  };

  const handleFinalizar = async () => {
    if (totalCompra <= 0) { 
      Alert.alert('Aviso', 'O total da compra é R$ 0,00. Adicione valores aos itens no carrinho.'); 
      return; 
    }

    Alert.alert('Finalizar Compra', 'Deseja finalizar a lista e registrar a despesa agora? Você será direcionado para escolher a forma de pagamento.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Finalizar e Pagar', onPress: async () => {
          try {
            // Marca tudo como comprado no banco
            await supabase.from('itens_compra').update({ marcado: true }).eq('lista_id', listaSel?.id);
            
            if (listaSel) {
              await supabase.from('listas_compras').update({ concluida: true }).eq('id', listaSel.id);
            }
            
            toast.ok('Lista concluída!');
            
          navigation.navigate('NovaDespesa', {
            valorPreenchido: totalCompra.toFixed(2).replace('.', ','),
            tituloPreenchido: `Compras: ${listaSel?.nome}`,
            categoriaPreenchida: 'mercado'
          });
            setListaSel(null);
            carregarListas();
          } catch (err: any) { toast.erro(err.message); }
      }}
    ]);
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
            <Text style={s.headerTitle} numberOfLines={1}>{listaSel.nome}</Text>
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
                    <Text style={[s.itemNome, (item.marcado && !estaConcluida) && s.itemNomeDone, estaConcluida && { color: Colors.textPrimary, fontWeight: 'bold' }]}>
                      {item.nome}
                    </Text>
                    
                    {!estaConcluida && tab === 'carrinho' ? (
                      <View style={s.cartInputRow}>
                        <TextInput 
                          style={s.cartInput} 
                          defaultValue={String(item.quantidade || '1')}
                          keyboardType="numeric"
                          onEndEditing={(e) => updateItemField(item, 'quantidade', e.nativeEvent.text)}
                        />
                        <Text style={{ color: Colors.textMuted }}>x</Text>
                        <TextInput 
                          style={s.cartInput} 
                          defaultValue={item.valor_unitario > 0 ? String(item.valor_unitario) : ''}
                          placeholder="0,00"
                          keyboardType="decimal-pad"
                          onEndEditing={(e) => updateItemField(item, 'valor_unitario', e.nativeEvent.text)}
                        />
                      </View>
                    ) : (
                      <Text style={{ color: Colors.textMuted, fontSize: FontSize.xs }}>
                        {item.quantidade}x {formatarMoeda(item.valor_unitario)}
                      </Text>
                    )}
                  </View>

                  <Text style={[s.itemTotal, estaConcluida && { color: Colors.renda }]}>
                    {formatarMoeda(subtotal)}
                  </Text>

                  {!estaConcluida && (
                    <TouchableOpacity onPress={() => removeItem(item.id)} style={{ marginLeft: Spacing.sm }}>
                      <Trash2 size={18} color={Colors.despesa} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={<Text style={s.emptyText}>{estaConcluida ? 'Lista concluída.' : 'Nenhum item.'}</Text>}
          />

          <View style={s.totalBar}>
            <Text style={s.totalLabel}>{estaConcluida ? 'Total Pago' : 'Total no Carrinho'}</Text>
            <Text style={[s.totalValue, estaConcluida && { color: Colors.renda }]}>{formatarMoeda(totalCompra)}</Text>
          </View>

          {!estaConcluida && (
            <>
              {tab === 'carrinho' && (
                <TouchableOpacity style={s.finalizarBtn} onPress={handleFinalizar}>
                  <ShoppingCart size={18} color="#FFF" />
                  <Text style={s.finalizarBtnText}>Finalizar e Pagar</Text>
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
              {item.concluida && <Text style={s.listaConcluida}>Concluída em {new Date(item.criado_em).toLocaleDateString()}</Text>}
            </View>
            <TouchableOpacity onPress={() => handleExcluirLista(item.id)}>
              <Trash2 size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={s.emptyText}>{loading ? 'Carregando...' : 'Nenhuma lista'}</Text>}
      />
      <TouchableOpacity style={s.fab} onPress={() => setShowNova(true)}><Plus size={26} color={Colors.textInverse} /></TouchableOpacity>
      
      <Modal visible={showNova} transparent animationType="fade" onRequestClose={() => setShowNova(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Nova Lista</Text>
            <TextInput style={s.modalInput} placeholder="Nome" value={novoNome} onChangeText={setNovoNome} autoFocus />
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: Colors.border }]} onPress={() => setShowNova(false)}>
                <Text style={[s.modalBtnText, { color: Colors.textPrimary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalBtn} onPress={handleCriarLista}>
                <Text style={s.modalBtnText}>Criar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
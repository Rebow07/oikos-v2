import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Plus, Trash2, CheckSquare, Square, StickyNote, ListTodo } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { buscarNotas, criarNota, atualizarNota, excluirNota } from '../services/notas.service';
import type { Nota } from '../types';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
    headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary },
    filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
    filterBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: C.border },
    filterBtnSel: { backgroundColor: C.primary + '20', borderColor: C.primary },
    filterText: { fontSize: FontSize.sm, color: C.textSecondary },
    filterTextSel: { color: C.primary, fontWeight: FontWeight.bold },
    list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    card: { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: C.textPrimary, flex: 1 },
    cardTitleDone: { textDecorationLine: 'line-through', color: C.textMuted },
    cardContent: { fontSize: FontSize.sm, color: C.textSecondary, marginTop: Spacing.xs },
    cardActions: { flexDirection: 'row', gap: Spacing.md },
    emptyText: { fontSize: FontSize.md, color: C.textMuted, textAlign: 'center', paddingVertical: Spacing.xxl },
    fab: { position: 'absolute', right: Spacing.md, bottom: Spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 },
    modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: C.background, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingBottom: Spacing.xxl, maxHeight: '75%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },
    modalScroll: { paddingHorizontal: Spacing.md },
    label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: C.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.lg },
    input: { backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    inputMulti: { minHeight: 80, textAlignVertical: 'top' },
    tipoRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
    tipoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: Radius.sm, borderWidth: 1, borderColor: C.border },
    tipoBtnSel: { borderColor: C.primary, backgroundColor: C.primary + '15' },
    tipoText: { fontSize: FontSize.sm, color: C.textSecondary },
    tipoTextSel: { color: C.primary, fontWeight: FontWeight.bold },
    submitBtn: { backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.lg },
    submitBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textInverse },
  });
}

type Filtro = 'todas' | 'nota' | 'tarefa';

export default function NotasScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { usuario, grupoId } = useApp();

  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [showModal, setShowModal] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [tipo, setTipo] = useState<'nota' | 'tarefa'>('nota');
  const [saving, setSaving] = useState(false);

  const carregar = useCallback(async () => {
    try { const data = await buscarNotas(grupoId); setNotas(data); } finally { setLoading(false); }
  }, [grupoId]);

  useEffect(() => { carregar(); }, [carregar]);

  const filtered = filtro === 'todas' ? notas : notas.filter((n) => n.tipo === filtro);

  const toggleConcluida = useCallback(async (n: Nota) => {
    await atualizarNota(n.id, { concluida: !n.concluida });
    setNotas((prev) => prev.map((item) => item.id === n.id ? { ...item, concluida: !item.concluida } : item));
  }, []);

  const handleCriar = useCallback(async () => {
    if (!titulo.trim()) { Alert.alert('Erro', 'Informe o título.'); return; }
    setSaving(true);
    try {
      await criarNota({ grupo_id: grupoId, criado_por: usuario.id, titulo: titulo.trim(), conteudo: conteudo.trim() || null, tipo, data_lembrete: null });
      setShowModal(false); setTitulo(''); setConteudo(''); carregar();
    } catch (err: any) { Alert.alert('Erro', err.message); } finally { setSaving(false); }
  }, [titulo, conteudo, tipo, grupoId, usuario, carregar]);

  const handleExcluir = useCallback((n: Nota) => {
    Alert.alert('Excluir', `Remover "${n.titulo}"?`, [
      { text: 'Cancelar' },
      { text: 'Excluir', style: 'destructive', onPress: async () => { await excluirNota(n.id); carregar(); } },
    ]);
  }, [carregar]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>Notas e Tarefas</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><X size={24} color={Colors.textPrimary} /></TouchableOpacity>
      </View>

      <View style={s.filterRow}>
        {(['todas', 'tarefa', 'nota'] as Filtro[]).map((f) => (
          <TouchableOpacity key={f} style={[s.filterBtn, filtro === f && s.filterBtnSel]} onPress={() => setFiltro(f)}>
            <Text style={[s.filterText, filtro === f && s.filterTextSel]}>
              {f === 'todas' ? 'Todas' : f === 'tarefa' ? 'Tarefas' : 'Notas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardHeader}>
              {item.tipo === 'tarefa' && (
                <TouchableOpacity onPress={() => toggleConcluida(item)} style={{ marginRight: Spacing.sm }}>
                  {item.concluida ? <CheckSquare size={20} color={Colors.renda} /> : <Square size={20} color={Colors.textMuted} />}
                </TouchableOpacity>
              )}
              {item.tipo === 'nota' && <StickyNote size={18} color={Colors.primary} style={{ marginRight: Spacing.sm }} />}
              <Text style={[s.cardTitle, item.concluida && s.cardTitleDone]}>{item.titulo}</Text>
              <View style={s.cardActions}>
                <TouchableOpacity onPress={() => handleExcluir(item)}><Trash2 size={16} color={Colors.textMuted} /></TouchableOpacity>
              </View>
            </View>
            {item.conteudo ? <Text style={s.cardContent} numberOfLines={3}>{item.conteudo}</Text> : null}
          </View>
        )}
        ListEmptyComponent={<Text style={s.emptyText}>{loading ? 'Carregando...' : 'Nenhuma nota ou tarefa'}</Text>}
      />

      <TouchableOpacity style={s.fab} onPress={() => setShowModal(true)} activeOpacity={0.8}><Plus size={26} color={Colors.textInverse} /></TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHeader}><Text style={s.modalTitle}>Nova</Text><TouchableOpacity onPress={() => setShowModal(false)}><X size={22} color={Colors.textPrimary} /></TouchableOpacity></View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={s.tipoRow}>
                <TouchableOpacity style={[s.tipoBtn, tipo === 'nota' && s.tipoBtnSel]} onPress={() => setTipo('nota')}>
                  <StickyNote size={16} color={tipo === 'nota' ? Colors.primary : Colors.textMuted} />
                  <Text style={[s.tipoText, tipo === 'nota' && s.tipoTextSel]}>Nota</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.tipoBtn, tipo === 'tarefa' && s.tipoBtnSel]} onPress={() => setTipo('tarefa')}>
                  <ListTodo size={16} color={tipo === 'tarefa' ? Colors.primary : Colors.textMuted} />
                  <Text style={[s.tipoText, tipo === 'tarefa' && s.tipoTextSel]}>Tarefa</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.label}>Título</Text>
              <TextInput style={s.input} placeholder="Título" placeholderTextColor={Colors.textMuted} value={titulo} onChangeText={setTitulo} />
              <Text style={s.label}>Conteúdo (opcional)</Text>
              <TextInput style={[s.input, s.inputMulti]} placeholder="Detalhes..." placeholderTextColor={Colors.textMuted} value={conteudo} onChangeText={setConteudo} multiline />
              <TouchableOpacity style={[s.submitBtn, saving && { opacity: 0.5 }]} onPress={handleCriar} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.textInverse} /> : <Text style={s.submitBtnText}>Criar</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

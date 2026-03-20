import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, X, Trash2, CheckSquare, Square, StickyNote, ListTodo, Calendar } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabase';
import type { Nota } from '../types';

type Filtro = 'todas' | 'tarefa' | 'nota';

const POST_IT_COLORS = ['#FFF9C4', '#FFECB3', '#FFE0B2', '#C8E6C9', '#B3E5FC', '#E1BEE7', '#F8BBD0'];

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: Spacing.md },
    headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary, flex: 1 },
    filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.md },
    filterBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: C.border },
    filterBtnSel: { backgroundColor: C.primary + '20', borderColor: C.primary },
    filterText: { fontSize: FontSize.sm, color: C.textSecondary },
    filterTextSel: { color: C.primary, fontWeight: FontWeight.bold },
    list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    tarefaCard: { backgroundColor: '#FFFEF7', borderRadius: Radius.md, marginBottom: Spacing.sm, overflow: 'hidden', borderWidth: 1, borderColor: '#E0DDD0' },
    tarefaInner: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#C5D9F0', paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, paddingLeft: 42 },
    tarefaRedLine: { position: 'absolute', left: 36, top: 0, bottom: 0, width: 1, backgroundColor: '#E8A0A0' },
    tarefaContent: { flex: 1 },
    tarefaTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: '#333' },
    tarefaTitleDone: { textDecorationLine: 'line-through', color: '#999' },
    tarefaDesc: { fontSize: FontSize.sm, color: '#666', marginTop: 2 },
    tarefaBy: { fontSize: FontSize.xs, color: '#999', marginTop: 4 },
    tarefaDate: { fontSize: FontSize.xs, color: '#2980B9', marginTop: 2 },
    tarefaCheck: { position: 'absolute', left: Spacing.sm, top: Spacing.md },
    tarefaTrash: { marginLeft: Spacing.sm, paddingTop: 2 },
    notaCard: { borderRadius: Spacing.sm, padding: Spacing.md, marginBottom: Spacing.sm, shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
    notaFold: { position: 'absolute', top: 0, right: 0, width: 20, height: 20, backgroundColor: 'rgba(0,0,0,0.06)', borderBottomLeftRadius: 10 },
    notaTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#333', marginBottom: 4 },
    notaContent: { fontSize: FontSize.sm, color: '#555', lineHeight: 20 },
    notaBy: { fontSize: FontSize.xs, color: '#888', marginTop: Spacing.sm },
    notaTrash: { position: 'absolute', bottom: Spacing.sm, right: Spacing.sm },
    typeTag: { fontSize: 9, fontWeight: FontWeight.bold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', alignSelf: 'flex-start', marginBottom: 4 },
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
    dateRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
    dateInput: { flex: 1, textAlign: 'center' },
    submitBtn: { backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.lg },
    submitBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textInverse },
  });
}

export default function TarefasHomeScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { usuario, grupoId, getNomeMembro } = useApp();

  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [showModal, setShowModal] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [tipo, setTipo] = useState<'nota' | 'tarefa'>('tarefa');
  const [saving, setSaving] = useState(false);
  const [dataLembrete, setDataLembrete] = useState('');

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('notas').select('*').eq('grupo_id', grupoId).order('criado_em', { ascending: false });
    if (error) console.error('Erro notas:', error.message);
    setNotas((data as Nota[]) || []);
    setLoading(false);
  }, [grupoId]);

  useEffect(() => { if (grupoId) carregar(); }, [grupoId, carregar]);

  // 1. FILTRO ATUALIZADO: Tarefas concluídas somem IMEDIATAMENTE da lista
  const filtered = useMemo(() => {
    return notas.filter((n) => {
      const tipoItem = (n.tipo || 'tarefa').toLowerCase().trim();
      
      // Se for tarefa e estiver concluída, não mostra (a menos que você queira uma aba de histórico depois)
      if (tipoItem === 'tarefa' && n.concluida) return false;

      // Filtra pelo seletor de topo (Todas, Tarefas, Notas)
      if (filtro === 'todas') return true;
      return tipoItem === filtro;
    });
  }, [notas, filtro]);

  // 2. TOGGLE COM ATUALIZAÇÃO OTIMISTA
  const toggleConcluida = async (n: Nota) => {
    const statusAnterior = n.concluida;
    
    // Atualiza o estado local na hora (faz sumir da lista filtrada)
    setNotas((prev) => prev.map((i) => i.id === n.id ? { ...i, concluida: true } : i));

    try {
      const { error } = await supabase
        .from('notas')
        .update({ concluida: true, concluida_em: new Date().toISOString() })
        .eq('id', n.id);

      if (error) throw error;
    } catch (error) {
      // Reverte se falhar
      setNotas((prev) => prev.map((i) => i.id === n.id ? { ...i, concluida: statusAnterior } : i));
      Alert.alert('Erro', 'Não foi possível concluir a tarefa no servidor.');
    }
  };

  const handleCriar = async () => {
    if (!titulo.trim()) { Alert.alert('Erro', 'Título obrigatório.'); return; }
    setSaving(true);
    try {
      let dataLembreteVal: string | null = null;
      if (tipo === 'tarefa' && dataLembrete.trim()) {
        const parts = dataLembrete.split('/');
        if (parts.length === 3) {
          const [dd, mm, yyyy] = parts;
          dataLembreteVal = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T09:00:00`;
        }
      }

      const { error } = await supabase.from('notas').insert({
        grupo_id: grupoId, criado_por: usuario.id,
        titulo: titulo.trim(), conteudo: conteudo.trim() || null,
        tipo: tipo,
        concluida: false,
        data_lembrete: dataLembreteVal,
      });
      if (error) throw error;
      setShowModal(false); setTitulo(''); setConteudo(''); setDataLembrete(''); carregar();
    } catch (err: any) { Alert.alert('Erro', err.message); } finally { setSaving(false); }
  };

  const handleExcluir = (n: Nota) => {
    Alert.alert('Excluir', `Remover "${n.titulo}"?`, [
      { text: 'Cancelar' },
      { text: 'Excluir', style: 'destructive', onPress: async () => { 
          // Atualização otimista na exclusão também
          setNotas(prev => prev.filter(item => item.id !== n.id));
          await supabase.from('notas').delete().eq('id', n.id); 
        } 
      },
    ]);
  };

  const getPostItColor = (id: string) => POST_IT_COLORS[(id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % POST_IT_COLORS.length];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color={Colors.textPrimary} /></TouchableOpacity>
        <Text style={s.headerTitle}>Tarefas e Notas</Text>
      </View>

      <View style={s.filterRow}>
        {(['todas', 'tarefa', 'nota'] as Filtro[]).map((f) => (
          <TouchableOpacity key={f} style={[s.filterBtn, filtro === f && s.filterBtnSel]} onPress={() => setFiltro(f)}>
            <Text style={[s.filterText, filtro === f && s.filterTextSel]}>{f === 'todas' ? 'Todas' : f === 'tarefa' ? 'Tarefas' : 'Notas'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList 
        data={filtered} 
        keyExtractor={(i) => i.id} 
        contentContainerStyle={s.list}
        renderItem={({ item }) => {
          const tipoItem = (item.tipo || 'tarefa').toLowerCase().trim();
          const nomeMembro = getNomeMembro(item.criado_por);

          if (tipoItem === 'nota') {
            const bg = getPostItColor(item.id);
            return (
              <View style={[s.notaCard, { backgroundColor: bg }]}>
                <View style={s.notaFold} />
                <Text style={[s.typeTag, { backgroundColor: '#FF9800', color: '#FFF' }]}>NOTA</Text>
                <Text style={s.notaTitle}>{item.titulo}</Text>
                {item.conteudo ? <Text style={s.notaContent}>{item.conteudo}</Text> : null}
                <Text style={s.notaBy}>{nomeMembro}</Text>
                <TouchableOpacity style={s.notaTrash} onPress={() => handleExcluir(item)}><Trash2 size={14} color="#aaa" /></TouchableOpacity>
              </View>
            );
          }

          return (
            <View style={s.tarefaCard}>
              <View style={s.tarefaRedLine} />
              <TouchableOpacity style={s.tarefaCheck} onPress={() => toggleConcluida(item)}>
                {item.concluida ? <CheckSquare size={20} color="#4CAF50" /> : <Square size={20} color="#bbb" />}
              </TouchableOpacity>
              <View style={s.tarefaInner}>
                <View style={s.tarefaContent}>
                  <Text style={[s.typeTag, { backgroundColor: '#2196F3', color: '#FFF' }]}>TAREFA</Text>
                  <Text style={[s.tarefaTitle, item.concluida && s.tarefaTitleDone]}>{item.titulo}</Text>
                  {item.conteudo ? <Text style={s.tarefaDesc}>{item.conteudo}</Text> : null}
                  {item.data_lembrete && (
                    <Text style={s.tarefaDate}>📅 {formatDate(item.data_lembrete)}</Text>
                  )}
                  <Text style={s.tarefaBy}>{nomeMembro}</Text>
                </View>
                <TouchableOpacity style={s.tarefaTrash} onPress={() => handleExcluir(item)}><Trash2 size={14} color="#ccc" /></TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={s.emptyText}>
            {loading ? 'Carregando...' : filtro === 'tarefa' ? 'Nenhuma tarefa pendente' : 'Nada por aqui'}
          </Text>
        }
      />

      <TouchableOpacity style={s.fab} onPress={() => setShowModal(true)} activeOpacity={0.8}><Plus size={26} color={Colors.textInverse} /></TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHeader}><Text style={s.modalTitle}>Novo</Text><TouchableOpacity onPress={() => setShowModal(false)}><X size={22} color={Colors.textPrimary} /></TouchableOpacity></View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={s.tipoRow}>
                <TouchableOpacity style={[s.tipoBtn, tipo === 'tarefa' && s.tipoBtnSel]} onPress={() => setTipo('tarefa')}>
                  <ListTodo size={16} color={tipo === 'tarefa' ? Colors.primary : Colors.textMuted} /><Text style={[s.tipoText, tipo === 'tarefa' && s.tipoTextSel]}>Tarefa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.tipoBtn, tipo === 'nota' && s.tipoBtnSel]} onPress={() => setTipo('nota')}>
                  <StickyNote size={16} color={tipo === 'nota' ? Colors.primary : Colors.textMuted} /><Text style={[s.tipoText, tipo === 'nota' && s.tipoTextSel]}>Nota</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.label}>Título</Text>
              <TextInput style={s.input} placeholder="O que precisa ser feito?" placeholderTextColor={Colors.textMuted} value={titulo} onChangeText={setTitulo} />
              <Text style={s.label}>Conteúdo (opcional)</Text>
              <TextInput style={[s.input, s.inputMulti]} placeholder="Detalhes..." placeholderTextColor={Colors.textMuted} value={conteudo} onChangeText={setConteudo} multiline />

              {tipo === 'tarefa' && (
                <>
                  <Text style={s.label}>Data (opcional)</Text>
                  <View style={s.dateRow}>
                    <Calendar size={18} color={Colors.textMuted} />
                    <TextInput
                      style={[s.input, s.dateInput]}
                      placeholder="DD/MM/AAAA"
                      placeholderTextColor={Colors.textMuted}
                      value={dataLembrete}
                      onChangeText={(t) => {
                        const clean = t.replace(/\D/g, '');
                        let formatted = clean;
                        if (clean.length > 2) formatted = clean.slice(0, 2) + '/' + clean.slice(2);
                        if (clean.length > 4) formatted = clean.slice(0, 2) + '/' + clean.slice(2, 4) + '/' + clean.slice(4, 8);
                        setDataLembrete(formatted);
                      }}
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                  </View>
                </>
              )}

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
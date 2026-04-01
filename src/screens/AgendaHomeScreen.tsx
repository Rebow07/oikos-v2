import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, Modal, Switch, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, X, Clock, MapPin, ChevronLeft, ChevronRight, Calendar, CheckSquare, Square } from 'lucide-react-native';
import * as ExpoCalendar from 'expo-calendar';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabase';
import { MESES } from '../constants';
import type { Compromisso, Nota } from '../types';

// ── Helpers de integração com o calendário nativo ──────────────────────────
async function obterCalendarioPadrao(): Promise<string | null> {
  try {
    const { status } = await ExpoCalendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') return null;
    const cals = await ExpoCalendar.getCalendarsAsync(ExpoCalendar.EntityTypes.EVENT);
    const principal = cals.find((c) => c.isPrimary && c.allowsModifications)
      || cals.find((c) => c.allowsModifications)
      || cals[0];
    return principal?.id ?? null;
  } catch {
    return null;
  }
}

async function criarEventoCalendario(
  calId: string,
  titulo: string,
  dataInicio: Date,
  diaInteiro: boolean,
  local?: string | null,
  descricao?: string | null,
  lembrete?: number,
): Promise<string | null> {
  try {
    const dataFim = diaInteiro
      ? dataInicio
      : new Date(dataInicio.getTime() + 60 * 60 * 1000);
    const eventId = await ExpoCalendar.createEventAsync(calId, {
      title: titulo,
      startDate: dataInicio,
      endDate: dataFim,
      allDay: diaInteiro,
      location: local || undefined,
      notes: descricao || undefined,
      alarms: lembrete ? [{ relativeOffset: -lembrete }] : [],
    });
    return eventId;
  } catch {
    return null;
  }
}

async function excluirEventoCalendario(eventId: string): Promise<void> {
  try {
    await ExpoCalendar.deleteEventAsync(eventId);
  } catch {
    // ignora — evento pode já não existir
  }
}

const CORES_EVENTO = ['#2980B9', '#E74C3C', '#27AE60', '#8E44AD', '#E67E22', '#1ABC9C', '#c9a227'];

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: Spacing.md },
    headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary, flex: 1 },
    scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, marginBottom: Spacing.lg },
    monthText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary, minWidth: 160, textAlign: 'center' },
    weekRow: { flexDirection: 'row', marginBottom: 2 },
    dayHeader: { flex: 1, alignItems: 'center', paddingVertical: 6 },
    dayHeaderText: { fontSize: FontSize.xs, color: C.textMuted, fontWeight: FontWeight.bold },
    dayCell: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, margin: 1 },
    dayCellToday: { backgroundColor: C.primary + '20' },
    dayCellSelected: { backgroundColor: C.primary },
    dayText: { fontSize: FontSize.sm, color: C.textPrimary },
    dayTextMuted: { color: C.textMuted },
    dayTextSelected: { color: C.textInverse, fontWeight: FontWeight.bold },
    dayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
    dayDotsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary, marginBottom: Spacing.md, marginTop: Spacing.lg },
    eventCard: { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderLeftWidth: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    eventTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.textPrimary },
    eventMeta: { fontSize: FontSize.xs, color: C.textMuted, marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
    eventMetaText: { fontSize: FontSize.xs, color: C.textMuted },
    // Tarefa na agenda
    tarefaCard: { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderLeftWidth: 4, borderLeftColor: '#2196F3', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, flexDirection: 'row', alignItems: 'center' },
    tarefaContent: { flex: 1, marginLeft: Spacing.sm },
    tarefaTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: C.textPrimary },
    tarefaTitleDone: { textDecorationLine: 'line-through', color: C.textMuted },
    tarefaTag: { fontSize: 9, fontWeight: FontWeight.bold, color: '#2196F3', backgroundColor: '#2196F3' + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', alignSelf: 'flex-start', marginTop: 2 },
    emptyText: { fontSize: FontSize.sm, color: C.textMuted, textAlign: 'center', paddingVertical: Spacing.lg },
    fab: { position: 'absolute', right: Spacing.md, bottom: Spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 },
    modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: C.background, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingBottom: Spacing.xxl, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },
    modalScroll: { paddingHorizontal: Spacing.md },
    label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: C.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.lg },
    input: { backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md },
    rowLabel: { fontSize: FontSize.md, color: C.textPrimary },
    coresRow: { flexDirection: 'row', gap: Spacing.sm },
    corItem: { width: 28, height: 28, borderRadius: 14 },
    corItemSel: { borderWidth: 3, borderColor: C.textPrimary },
    dateRow: { flexDirection: 'row', gap: Spacing.sm },
    dateInput: { flex: 1, textAlign: 'center' },
    submitBtn: { backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.lg },
    submitBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textInverse },
  });
}

export default function AgendaHomeScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { usuario, grupoId } = useApp();

  const hoje = new Date();
  const [mesVis, setMesVis] = useState(hoje.getMonth());
  const [anoVis, setAnoVis] = useState(hoje.getFullYear());
  const [diaSel, setDiaSel] = useState(hoje.getDate());
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [tarefasAgenda, setTarefasAgenda] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [hora, setHora] = useState('09');
  const [minuto, setMinuto] = useState('00');
  const [local, setLocal] = useState('');
  const [diaInteiro, setDiaInteiro] = useState(false);
  const [cor, setCor] = useState(CORES_EVENTO[0]);

  const carregar = useCallback(async () => {
    const inicio = `${anoVis}-${String(mesVis + 1).padStart(2, '0')}-01T00:00:00`;
    const lastDay = new Date(anoVis, mesVis + 1, 0).getDate();
    const fim = `${anoVis}-${String(mesVis + 1).padStart(2, '0')}-${lastDay}T23:59:59`;

    // Buscar compromissos
    const { data: compData } = await supabase.from('compromissos').select('*').eq('grupo_id', grupoId)
      .gte('data_inicio', inicio).lte('data_inicio', fim).order('data_inicio');
    setCompromissos((compData as Compromisso[]) || []);

    // Buscar tarefas com data_lembrete neste mês
    const { data: tarefaData } = await supabase.from('notas').select('*').eq('grupo_id', grupoId)
      .eq('tipo', 'tarefa')
      .not('data_lembrete', 'is', null)
      .gte('data_lembrete', inicio)
      .lte('data_lembrete', fim)
      .order('data_lembrete');
    setTarefasAgenda((tarefaData as Nota[]) || []);

    setLoading(false);
  }, [grupoId, mesVis, anoVis]);

  useEffect(() => { if (grupoId) carregar(); }, [grupoId, carregar]);

  const primeiroDia = new Date(anoVis, mesVis, 1).getDay();
  const diasNoMes = new Date(anoVis, mesVis + 1, 0).getDate();

  // Dias com eventos (compromissos + tarefas)
  const diasComEvento = useMemo(() => {
    const set = new Set<number>();
    compromissos.forEach((c) => {
      const d = new Date(c.data_inicio);
      if (d.getMonth() === mesVis && d.getFullYear() === anoVis) set.add(d.getDate());
    });
    return set;
  }, [compromissos, mesVis, anoVis]);

  const diasComTarefa = useMemo(() => {
    const set = new Set<number>();
    tarefasAgenda.forEach((t) => {
      if (t.data_lembrete) {
        const d = new Date(t.data_lembrete);
        if (d.getMonth() === mesVis && d.getFullYear() === anoVis) set.add(d.getDate());
      }
    });
    return set;
  }, [tarefasAgenda, mesVis, anoVis]);

  const eventosDia = useMemo(() => {
    return compromissos.filter((c) => {
      const d = new Date(c.data_inicio);
      return d.getDate() === diaSel && d.getMonth() === mesVis && d.getFullYear() === anoVis;
    });
  }, [compromissos, diaSel, mesVis, anoVis]);

  const tarefasDia = useMemo(() => {
    return tarefasAgenda.filter((t) => {
      if (!t.data_lembrete) return false;
      const d = new Date(t.data_lembrete);
      return d.getDate() === diaSel && d.getMonth() === mesVis && d.getFullYear() === anoVis;
    });
  }, [tarefasAgenda, diaSel, mesVis, anoVis]);

  const totalDia = eventosDia.length + tarefasDia.length;

  const isHoje = (dia: number) => dia === hoje.getDate() && mesVis === hoje.getMonth() && anoVis === hoje.getFullYear();

  const mesAnterior = () => { if (mesVis === 0) { setMesVis(11); setAnoVis(anoVis - 1); } else setMesVis(mesVis - 1); };
  const mesProximo = () => { if (mesVis === 11) { setMesVis(0); setAnoVis(anoVis + 1); } else setMesVis(mesVis + 1); };

  const handleCriar = useCallback(async () => {
    if (!titulo.trim()) { Alert.alert('Erro', 'Título obrigatório.'); return; }
    const dataInicioStr = `${anoVis}-${String(mesVis + 1).padStart(2, '0')}-${String(diaSel).padStart(2, '0')}T${hora.padStart(2, '0')}:${minuto.padStart(2, '0')}:00`;
    const dataInicioDate = new Date(dataInicioStr);
    setSaving(true);
    try {
      // 1. Salvar no Supabase primeiro
      const { data: novoComp, error } = await supabase
        .from('compromissos')
        .insert({
          grupo_id: grupoId, criado_por: usuario.id, titulo: titulo.trim(),
          descricao: descricao.trim() || null, data_inicio: dataInicioStr, dia_inteiro: diaInteiro,
          local: local.trim() || null, cor, lembrete_minutos: 30,
        })
        .select()
        .single();
      if (error) throw error;

      // 2. Tentar sincronizar com o calendário nativo
      const calId = await obterCalendarioPadrao();
      if (calId && novoComp) {
        const eventId = await criarEventoCalendario(
          calId,
          titulo.trim(),
          dataInicioDate,
          diaInteiro,
          local.trim() || null,
          descricao.trim() || null,
          30,
        );
        if (eventId) {
          // Salvar o ID do evento no banco para poder excluir depois
          await supabase.from('compromissos').update({ google_event_id: eventId }).eq('id', novoComp.id);
        }
      }

      setShowModal(false); setTitulo(''); setDescricao(''); setLocal(''); carregar();
    } catch (err: any) { Alert.alert('Erro', err.message); } finally { setSaving(false); }
  }, [titulo, descricao, hora, minuto, local, diaInteiro, cor, anoVis, mesVis, diaSel, grupoId, usuario, carregar]);

  const handleExcluir = (c: Compromisso) => {
    Alert.alert('Excluir', `Remover "${c.titulo}"?`, [
      { text: 'Cancelar' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          // Remover do calendário nativo se existir vínculo
          if (c.google_event_id) {
            await excluirEventoCalendario(c.google_event_id);
          }
          await supabase.from('compromissos').delete().eq('id', c.id);
          carregar();
        },
      },
    ]);
  };

  const toggleTarefa = async (t: Nota) => {
    await supabase.from('notas').update({ concluida: !t.concluida }).eq('id', t.id);
    setTarefasAgenda((prev) => prev.map((i) => i.id === t.id ? { ...i, concluida: !i.concluida } : i));
  };

  // Calendar grid
  const renderCalendar = () => {
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const cells: (number | null)[] = [];
    for (let i = 0; i < primeiroDia; i++) cells.push(null);
    for (let d = 1; d <= diasNoMes; d++) cells.push(d);

    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

    return (
      <>
        <View style={s.weekRow}>
          {dias.map((d) => <View key={d} style={s.dayHeader}><Text style={s.dayHeaderText}>{d}</Text></View>)}
        </View>
        {rows.map((row, ri) => (
          <View key={ri} style={s.weekRow}>
            {row.map((dia, ci) => {
              const hasEvento = dia ? diasComEvento.has(dia) : false;
              const hasTarefa = dia ? diasComTarefa.has(dia) : false;
              return (
                <TouchableOpacity key={ci} style={[s.dayCell, isHoje(dia || 0) && s.dayCellToday, dia === diaSel && s.dayCellSelected]}
                  onPress={() => dia && setDiaSel(dia)} disabled={!dia}>
                  <Text style={[s.dayText, !dia && s.dayTextMuted, dia === diaSel && s.dayTextSelected]}>{dia || ''}</Text>
                  {dia && dia !== diaSel && (hasEvento || hasTarefa) && (
                    <View style={s.dayDotsRow}>
                      {hasEvento && <View style={[s.dayDot, { backgroundColor: Colors.primary }]} />}
                      {hasTarefa && <View style={[s.dayDot, { backgroundColor: '#2196F3' }]} />}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            {row.length < 7 && Array.from({ length: 7 - row.length }).map((_, i) => <View key={`e${i}`} style={s.dayCell} />)}
          </View>
        ))}
      </>
    );
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><ArrowLeft size={24} color={Colors.textPrimary} /></TouchableOpacity>
        <Text style={s.headerTitle}>Agenda</Text>
        <Calendar size={18} color={Colors.textMuted} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.monthNav}>
          <TouchableOpacity onPress={mesAnterior}><ChevronLeft size={24} color={Colors.textPrimary} /></TouchableOpacity>
          <Text style={s.monthText}>{MESES[mesVis]} {anoVis}</Text>
          <TouchableOpacity onPress={mesProximo}><ChevronRight size={24} color={Colors.textPrimary} /></TouchableOpacity>
        </View>

        {renderCalendar()}

        <Text style={s.sectionTitle}>
          {diaSel} de {MESES[mesVis]} — {totalDia} item{totalDia !== 1 ? 's' : ''}
        </Text>

        {/* Compromissos */}
        {eventosDia.map((c) => {
          const h = new Date(c.data_inicio);
          const horario = c.dia_inteiro ? 'Dia inteiro' : `${String(h.getHours()).padStart(2, '0')}:${String(h.getMinutes()).padStart(2, '0')}`;
          return (
            <TouchableOpacity key={c.id} style={[s.eventCard, { borderLeftColor: c.cor || Colors.primary }]}
              onLongPress={() => handleExcluir(c)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={s.eventTitle}>{c.titulo}</Text>
                {c.google_event_id && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Calendar size={12} color={Colors.primary} />
                    <Text style={{ fontSize: 10, color: Colors.primary, fontWeight: '700' }}>Cal</Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} color={Colors.textMuted} /><Text style={s.eventMetaText}>{horario}</Text>
                </View>
                {c.local && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} color={Colors.textMuted} /><Text style={s.eventMetaText}>{c.local}</Text>
                </View>}
              </View>
              {c.descricao && <Text style={[s.eventMetaText, { marginTop: 4 }]}>{c.descricao}</Text>}
            </TouchableOpacity>
          );
        })}

        {/* Tarefas do dia */}
        {tarefasDia.map((t) => (
          <View key={t.id} style={s.tarefaCard}>
            <TouchableOpacity onPress={() => toggleTarefa(t)}>
              {t.concluida ? <CheckSquare size={20} color="#4CAF50" /> : <Square size={20} color="#bbb" />}
            </TouchableOpacity>
            <View style={s.tarefaContent}>
              <Text style={[s.tarefaTitle, t.concluida && s.tarefaTitleDone]}>{t.titulo}</Text>
              <Text style={s.tarefaTag}>TAREFA</Text>
            </View>
          </View>
        ))}

        {totalDia === 0 && <Text style={s.emptyText}>Nenhum compromisso ou tarefa neste dia</Text>}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={() => setShowModal(true)} activeOpacity={0.8}>
        <Plus size={26} color={Colors.textInverse} />
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHeader}><Text style={s.modalTitle}>Novo Compromisso</Text><TouchableOpacity onPress={() => setShowModal(false)}><X size={22} color={Colors.textPrimary} /></TouchableOpacity></View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Título</Text>
              <TextInput style={s.input} placeholder="Ex: Reunião escola" placeholderTextColor={Colors.textMuted} value={titulo} onChangeText={setTitulo} />
              <Text style={s.label}>Descrição (opcional)</Text>
              <TextInput style={s.input} placeholder="Detalhes..." placeholderTextColor={Colors.textMuted} value={descricao} onChangeText={setDescricao} />
              <Text style={s.label}>Data: {diaSel}/{mesVis + 1}/{anoVis}</Text>
              <View style={s.row}>
                <Text style={s.rowLabel}>Dia inteiro</Text>
                <Switch value={diaInteiro} onValueChange={setDiaInteiro} trackColor={{ false: Colors.border, true: Colors.primary + '80' }} thumbColor={diaInteiro ? Colors.primary : Colors.textMuted} />
              </View>
              {!diaInteiro && <>
                <Text style={s.label}>Horário</Text>
                <View style={s.dateRow}>
                  <TextInput style={[s.input, s.dateInput]} value={hora} onChangeText={(t) => setHora(t.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" placeholder="HH" placeholderTextColor={Colors.textMuted} />
                  <Text style={{ color: Colors.textPrimary, fontSize: FontSize.xl }}>:</Text>
                  <TextInput style={[s.input, s.dateInput]} value={minuto} onChangeText={(t) => setMinuto(t.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" placeholder="MM" placeholderTextColor={Colors.textMuted} />
                </View>
              </>}
              <Text style={s.label}>Local (opcional)</Text>
              <TextInput style={s.input} placeholder="Onde?" placeholderTextColor={Colors.textMuted} value={local} onChangeText={setLocal} />
              <Text style={s.label}>Cor</Text>
              <View style={s.coresRow}>{CORES_EVENTO.map((c) => <TouchableOpacity key={c} style={[s.corItem, { backgroundColor: c }, cor === c && s.corItemSel]} onPress={() => setCor(c)} />)}</View>
              <TouchableOpacity style={[s.submitBtn, saving && { opacity: 0.5 }]} onPress={handleCriar} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.textInverse} /> : <Text style={s.submitBtnText}>Salvar</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

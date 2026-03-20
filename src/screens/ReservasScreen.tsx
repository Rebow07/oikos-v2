import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, X, PiggyBank, ArrowUpCircle, ArrowDownCircle, History } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { useCacheInvalidation, CACHE_KEYS } from '../context/CacheContext';
import { buscarReservas, criarReserva, registrarMovimento, buscarMovimentos } from '../services/reservas.service';
import { formatarMoeda } from '../utils';
import { toast } from '../utils/toast';
import type { Reserva, ReservaMovimento } from '../types';

const CORES = ['#27AE60', '#2980B9', '#8E44AD', '#F39C12', '#E74C3C', '#1ABC9C'];

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
    title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: C.textPrimary },
    list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    card: { backgroundColor: C.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: C.border },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
    iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    info: { flex: 1 },
    nome: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },
    objetivo: { fontSize: FontSize.xs, color: C.textMuted },
    valores: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: Spacing.sm },
    valorAtual: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary },
    progressoBg: { height: 8, backgroundColor: C.border, borderRadius: 4, marginTop: Spacing.md, overflow: 'hidden' },
    progressoFill: { height: '100%', borderRadius: 4 },
    btnMov: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
    btnAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1 },
    fab: { position: 'absolute', right: Spacing.md, bottom: Spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', elevation: 6 },
    modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: C.background, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingBottom: Spacing.xxl, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },
    modalScroll: { paddingHorizontal: Spacing.md },
    label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: C.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.lg },
    input: { backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    coresRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginTop: Spacing.sm },
    corItem: { width: 36, height: 36, borderRadius: 18 },
    corSel: { borderWidth: 3, borderColor: C.textPrimary },
    submitBtn: { backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xl },
    submitBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textInverse },
  });
}

export default function ReservasScreen() {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { usuario, grupoId } = useApp();
  const { invalidarPorPrefixo } = useCacheInvalidation();

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados para Criar
  const [showCriar, setShowCriar] = useState(false);
  const [nome, setNome] = useState('');
  const [desc, setDesc] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [cor, setCor] = useState(CORES[0]);

  // Estados para Movimento
  const [showMov, setShowMov] = useState(false);
  const [reservaSel, setReservaSel] = useState<Reserva | null>(null);
  const [movTipo, setMovTipo] = useState<'deposito' | 'saque'>('deposito');
  const [movValor, setMovValor] = useState('');
  const [movDesc, setMovDesc] = useState('');

  const carregar = useCallback(async () => {
    try {
      const data = await buscarReservas(grupoId);
      setReservas(data);
    } catch (err) {
      toast.erro('Erro ao carregar reservas.');
    } finally {
      setLoading(false);
    }
  }, [grupoId]);

  useEffect(() => { carregar(); }, [carregar]);

  const handleCriar = useCallback(async () => {
    const val = parseFloat(objetivo.replace(',', '.'));
    if (!nome.trim() || isNaN(val) || val <= 0) {
      toast.aviso('Preencha nome e objetivo válido.');
      return;
    }
    setSaving(true);
    try {
      await criarReserva({
        grupo_id: grupoId,
        criado_por: usuario.id,
        nome: nome.trim(),
        descricao: desc.trim() || null,
        valor_objetivo: val,
        cor,
        icone: 'PiggyBank',
        criado_em: new Date().toISOString()
      });
      toast.ok('Reserva criada!');
      setShowCriar(false);
      setNome(''); setDesc(''); setObjetivo('');
      carregar();
    } catch (err) {
      toast.erro('Erro ao criar reserva.');
    } finally { setSaving(false); }
  }, [nome, desc, objetivo, cor, grupoId, usuario, carregar]);

  const handleMov = useCallback(async () => {
    if (!reservaSel) return;
    const val = parseFloat(movValor.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      toast.aviso('Valor inválido.');
      return;
    }
    setSaving(true);
    try {
      await registrarMovimento({
        reserva_id: reservaSel.id,
        grupo_id: grupoId,
        criado_por: usuario.id,
        tipo: movTipo,
        valor: val,
        descricao: movDesc.trim() || null
      });
      toast.ok(movTipo === 'deposito' ? 'Depósito realizado!' : 'Saque realizado!');
      setShowMov(false);
      setMovValor(''); setMovDesc('');
      carregar();
    } catch (err) {
      toast.erro('Erro ao registrar movimento.');
    } finally { setSaving(false); }
  }, [reservaSel, movValor, movTipo, movDesc, grupoId, usuario, carregar]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}><Text style={s.title}>Reservas</Text></View>

      <FlatList
        data={reservas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => {
          const pct = Math.min((item.valor_atual / item.valor_objetivo) * 100, 100);
          return (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.iconContainer, { backgroundColor: item.cor + '20' }]}>
                  <PiggyBank color={item.cor} size={24} />
                </View>
                <View style={s.info}>
                  <Text style={s.nome}>{item.nome}</Text>
                  <Text style={s.objetivo}>Objetivo: {formatarMoeda(item.valor_objetivo)}</Text>
                </View>
              </View>

              <View style={s.valores}>
                <Text style={s.valorAtual}>{formatarMoeda(item.valor_atual)}</Text>
                <Text style={{ color: item.cor, fontWeight: 'bold' }}>{Math.round(pct)}%</Text>
              </View>

              <View style={s.progressoBg}>
                <View style={[s.progressoFill, { width: `${pct}%`, backgroundColor: item.cor }]} />
              </View>

              <View style={s.btnMov}>
                <TouchableOpacity 
                  style={[s.btnAction, { borderColor: Colors.renda }]} 
                  onPress={() => { setReservaSel(item); setMovTipo('deposito'); setShowMov(true); }}
                >
                  <ArrowUpCircle size={18} color={Colors.renda} />
                  <Text style={{ color: Colors.renda, fontWeight: 'bold' }}>Depositar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[s.btnAction, { borderColor: Colors.despesa }]} 
                  onPress={() => { setReservaSel(item); setMovTipo('saque'); setShowMov(true); }}
                >
                  <ArrowDownCircle size={18} color={Colors.despesa} />
                  <Text style={{ color: Colors.despesa, fontWeight: 'bold' }}>Resgatar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40, color: Colors.textMuted }}>Nenhuma reserva criada.</Text>}
      />

      <TouchableOpacity style={s.fab} onPress={() => setShowCriar(true)}>
        <Plus color={Colors.textInverse} size={28} />
      </TouchableOpacity>

      {/* Modal Criar */}
      <Modal visible={showCriar} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Nova Reserva</Text>
              <TouchableOpacity onPress={() => setShowCriar(false)}><X size={24} color={Colors.textPrimary} /></TouchableOpacity>
            </View>
            <ScrollView style={s.modalScroll}>
              <Text style={s.label}>Nome do Objetivo</Text>
              <TextInput style={s.input} placeholder="Ex: Viagem, Carro..." value={nome} onChangeText={setNome} />
              <Text style={s.label}>Descrição (Opcional)</Text>
              <TextInput style={s.input} placeholder="Para que serve?" value={desc} onChangeText={setDesc} />
              <Text style={s.label}>Valor Objetivo (R$)</Text>
              <TextInput style={s.input} placeholder="0,00" keyboardType="decimal-pad" value={objetivo} onChangeText={setObjetivo} />
              <Text style={s.label}>Cor</Text>
              <View style={s.coresRow}>
                {CORES.map(c => (
                  <TouchableOpacity key={c} style={[s.corItem, { backgroundColor: c }, cor === c && s.corSel]} onPress={() => setCor(c)} />
                ))}
              </View>
              <TouchableOpacity style={s.submitBtn} onPress={handleCriar} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.submitBtnText}>Criar Reserva</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Movimento */}
      <Modal visible={showMov} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{movTipo === 'deposito' ? 'Depositar' : 'Resgatar'}</Text>
              <TouchableOpacity onPress={() => setShowMov(false)}><X size={24} color={Colors.textPrimary} /></TouchableOpacity>
            </View>
            <ScrollView style={s.modalScroll}>
              <Text style={s.label}>Valor (R$)</Text>
              <TextInput style={s.input} autoFocus placeholder="0,00" keyboardType="decimal-pad" value={movValor} onChangeText={setMovValor} />
              <Text style={s.label}>Observação</Text>
              <TextInput style={s.input} placeholder="Opcional" value={movDesc} onChangeText={setMovDesc} />
              <TouchableOpacity 
                style={[s.submitBtn, { backgroundColor: movTipo === 'deposito' ? Colors.renda : Colors.despesa }]} 
                onPress={handleMov} 
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.submitBtnText}>Confirmar</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
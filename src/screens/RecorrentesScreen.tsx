import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, X, Pause, Play, Trash2, Pencil } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { useRecorrentes } from '../hooks/useRecorrentes';
import {
  criarRecorrente,
  atualizarRecorrente,
  excluirRecorrente,
  gerarRecorrentesAgora,
  gerarRecorrentesMes,
} from '../services/recorrentes.service';
import { formatarMoeda, dataHoje } from '../utils';
import { CATEGORIAS } from '../constants';
import CategoriaIcon from '../components/CategoriaIcon';
import type { Recorrente } from '../types';

type Periodicidade = 'mensal' | 'trimestral' | 'semestral' | 'anual';

const PERIODICIDADES: { id: Periodicidade; label: string }[] = [
  { id: 'mensal', label: 'Mensal' },
  { id: 'trimestral', label: 'Trimestral' },
  { id: 'semestral', label: 'Semestral' },
  { id: 'anual', label: 'Anual' },
];

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    title: {
      fontSize: FontSize.xxl,
      fontWeight: FontWeight.bold,
      color: C.textPrimary,
    },
    totalCard: {
      backgroundColor: C.despesa + '12',
      borderRadius: Radius.md,
      padding: Spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    totalLabel: { fontSize: FontSize.sm, color: C.textSecondary },
    totalValue: {
      fontSize: FontSize.xl,
      fontWeight: FontWeight.bold,
      color: C.despesa,
    },
    gerarBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.primary + '20',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.sm,
      gap: Spacing.xs,
    },
    gerarBtnText: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.bold,
      color: C.primary,
    },
    autoGenText: {
      fontSize: FontSize.xs,
      color: C.renda,
      textAlign: 'center',
      marginBottom: Spacing.sm,
    },
    list: { paddingHorizontal: Spacing.md, paddingBottom: 150 },
    card: {
      backgroundColor: C.surface,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.border,
    },
    cardInactive: { opacity: 0.45 },
    cardInfo: { flex: 1, marginLeft: Spacing.md },
    cardTitle: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.semibold,
      color: C.textPrimary,
    },
    cardSub: {
      fontSize: FontSize.xs,
      color: C.textMuted,
      marginTop: 2,
    },
    cardRight: { alignItems: 'flex-end', gap: Spacing.sm },
    cardValor: {
      fontSize: FontSize.md,
      fontWeight: FontWeight.bold,
      color: C.despesa,
    },
    cardActions: { flexDirection: 'row', gap: 25 },
    emptyText: {
      fontSize: FontSize.md,
      color: C.textMuted,
      textAlign: 'center',
      paddingVertical: Spacing.xxl,
    },
    fab: {
      position: 'absolute',
      right: Spacing.md,
      bottom: 40,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: C.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 6,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: C.overlay,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: C.background,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      paddingBottom: Spacing.xxl,
      maxHeight: '85%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: C.border,
    },
    modalTitle: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
      color: C.textPrimary,
    },
    modalScroll: { paddingHorizontal: Spacing.md },
    label: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.semibold,
      color: C.textSecondary,
      marginBottom: Spacing.xs,
      marginTop: Spacing.lg,
    },
    input: {
      backgroundColor: C.surface,
      borderRadius: Radius.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      fontSize: FontSize.md,
      color: C.textPrimary,
      borderWidth: 1,
      borderColor: C.border,
    },
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    catItem: {
      alignItems: 'center',
      width: 70,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.sm,
    },
    catItemSel: {
      backgroundColor: C.primary + '20',
      borderWidth: 1,
      borderColor: C.primary,
    },
    catLabel: {
      fontSize: 10,
      color: C.textMuted,
      marginTop: 4,
      textAlign: 'center',
    },
    catLabelSel: {
      color: C.primary,
      fontWeight: FontWeight.bold,
    },
    periodRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
    periodBtn: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: C.border,
    },
    periodBtnSel: {
      borderColor: C.primary,
      backgroundColor: C.primary + '15',
    },
    periodText: { fontSize: FontSize.sm, color: C.textSecondary },
    periodTextSel: {
      color: C.primary,
      fontWeight: FontWeight.bold,
    },
    submitBtn: {
      backgroundColor: C.primary,
      borderRadius: Radius.md,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      marginTop: Spacing.xl,
      marginBottom: Spacing.lg,
    },
    submitBtnText: {
      fontSize: FontSize.lg,
      fontWeight: FontWeight.bold,
      color: C.textInverse,
    },
    gerarModalBackdrop: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    gerarModalBox: {
      width: '85%',
      backgroundColor: C.surface,
      padding: 20,
      borderRadius: 12,
    },
    gerarActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    gerarCancelText: { color: C.textSecondary },
    gerarConfirmText: { color: C.primary, fontWeight: FontWeight.bold },
  });
}

export default function RecorrentesScreen() {
  const { Colors } = useTheme();
  const s = useMemo(() => makeStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { usuario, grupoId, nomeUsuario } = useApp();
  const { recorrentes, totalMensal, carregando, recarregar } = useRecorrentes();

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('contas');
  const [diaVencimento, setDiaVencimento] = useState('10');
  const [dataInicio, setDataInicio] = useState(dataHoje());
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>('mensal');
  const [saving, setSaving] = useState(false);
  const [autoGenMsg, setAutoGenMsg] = useState('');
  const [gerando, setGerando] = useState(false);

  const hoje = new Date();
  const [mesGeracao, setMesGeracao] = useState(hoje.getMonth() + 1);
  const [anoGeracao, setAnoGeracao] = useState(hoje.getFullYear());
  const [showModalGerar, setShowModalGerar] = useState(false);

  const autoGenDone = useRef(false);

  useEffect(() => {
    if (!grupoId || autoGenDone.current) return;
    autoGenDone.current = true;

    const runAutoGen = async () => {
      try {
        const qtd = await gerarRecorrentesAgora(grupoId);
        if (qtd > 0) {
          setAutoGenMsg(`${qtd} despesa(s) gerada(s) automaticamente.`);
          await recarregar();
          setTimeout(() => setAutoGenMsg(''), 5000);
        }
      } catch {
        console.log('Geração automática silenciosa ignorada.');
      }
    };

    runAutoGen();
  }, [grupoId, recarregar]);

  const handleGerarMes = useCallback(async () => {
    if (!grupoId) {
      Alert.alert('Aviso', 'Grupo não identificado.');
      return;
    }

    if (mesGeracao < 1 || mesGeracao > 12) {
      Alert.alert('Aviso', 'Informe um mês válido entre 1 e 12.');
      return;
    }

    if (anoGeracao < 2000 || anoGeracao > 2100) {
      Alert.alert('Aviso', 'Informe um ano válido.');
      return;
    }

    try {
      setGerando(true);

      const qtd = await gerarRecorrentesMes(grupoId, mesGeracao, anoGeracao);
      await recarregar();

      if (qtd > 0) {
        Alert.alert('Sucesso', `${qtd} gerada(s) para ${mesGeracao}/${anoGeracao}.`);
      } else {
        Alert.alert('Tudo em dia', 'Nada para gerar nesse mês.');
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Erro ao gerar.');
    } finally {
      setGerando(false);
    }
  }, [grupoId, mesGeracao, anoGeracao, recarregar]);

  const handleEditar = useCallback((r: Recorrente) => {
    setEditandoId(r.id);
    setTitulo(r.titulo);
    setValor(String(r.valor).replace('.', ','));
    setCategoria(r.categoria);
    setDiaVencimento(String(r.dia_vencimento));
    setPeriodicidade(r.periodicidade || 'mensal');
    setDataInicio(r.data_inicio || dataHoje());
    setShowModal(true);
  }, []);

  const handleExcluir = useCallback((r: Recorrente) => {
    Alert.alert('Excluir', `Remover "${r.titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await excluirRecorrente(r.id);
            await recarregar();
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir.');
          }
        },
      },
    ]);
  }, [recarregar]);

  const handleToggle = useCallback(async (r: Recorrente) => {
    try {
      await atualizarRecorrente(r.id, {
        ativo: !r.ativo,
      });

      await recarregar();
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar.');
    }
  }, [recarregar]);

  const abrirNovo = useCallback(() => {
    setEditandoId(null);
    setTitulo('');
    setValor('');
    setCategoria('contas');
    setDiaVencimento('10');
    setPeriodicidade('mensal');
    setDataInicio(dataHoje());
    setShowModal(true);
  }, []);

  const handleSalvar = useCallback(async () => {
    const valorNum = parseFloat(valor.replace(',', '.'));

    if (!titulo.trim() || isNaN(valorNum) || valorNum <= 0) {
      Alert.alert('Aviso', 'Preencha um título e valor válidos.');
      return;
    }

    if (!grupoId || !usuario?.id) {
      Alert.alert('Erro', 'Usuário ou grupo não identificado.');
      return;
    }

    setSaving(true);

    try {
      if (editandoId) {
        await atualizarRecorrente(editandoId, {
          titulo: titulo.trim(),
          valor: valorNum,
          categoria,
          dia_vencimento: parseInt(diaVencimento, 10) || 10,
          periodicidade,
          data_inicio: dataInicio,
        });
      } else {
        await criarRecorrente({
          grupo_id: grupoId,
          criado_por: usuario.id,
          criado_por_nome: nomeUsuario || null,
          titulo: titulo.trim(),
          valor: valorNum,
          categoria,
          cartao_id: null,
          dia_vencimento: parseInt(diaVencimento, 10) || 10,
          ativo: true,
          periodicidade,
          criado_em: new Date().toISOString(),
          data_inicio: dataInicio,
        });
      }

      setShowModal(false);
      setEditandoId(null);
      setTitulo('');
      setValor('');
      setCategoria('contas');
      setDiaVencimento('10');
      setPeriodicidade('mensal');
      setDataInicio(dataHoje());

      await recarregar();
    } catch (err: any) {
      Alert.alert('Erro ao salvar', err?.message || 'Falha ao salvar recorrente.');
    } finally {
      setSaving(false);
    }
  }, [
    titulo,
    valor,
    categoria,
    diaVencimento,
    periodicidade,
    dataInicio,
    grupoId,
    usuario,
    nomeUsuario,
    editandoId,
    recarregar,
  ]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <View style={s.titleRow}>
          <Text style={s.title}>Recorrentes</Text>
        </View>

        <View style={s.totalCard}>
          <View>
            <Text style={s.totalLabel}>Total mensal fixo</Text>
            <Text style={s.totalValue}>{formatarMoeda(totalMensal)}</Text>
          </View>

          <TouchableOpacity
            style={[s.gerarBtn, gerando && { opacity: 0.6 }]}
            onPress={() => setShowModalGerar(true)}
            disabled={gerando}
          >
            <Text style={s.gerarBtnText}>
              {gerando ? 'Gerando...' : 'Gerar agora'}
            </Text>
          </TouchableOpacity>
        </View>

        {!!autoGenMsg && <Text style={s.autoGenText}>{autoGenMsg}</Text>}
      </View>

      <FlatList
        data={recorrentes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[s.card, !item.ativo && s.cardInactive]}>
            <CategoriaIcon categoria={item.categoria} size={40} />

            <View style={s.cardInfo}>
              <Text style={s.cardTitle}>{item.titulo}</Text>
              <Text style={s.cardSub}>Vence dia {item.dia_vencimento}</Text>
            </View>

            <View style={s.cardRight}>
              <Text style={s.cardValor}>{formatarMoeda(item.valor)}</Text>

              <View style={s.cardActions}>
                <TouchableOpacity
                  onPress={() => handleEditar(item)}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                  <Pencil size={18} color={Colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleToggle(item)}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                  {item.ativo ? (
                    <Pause size={18} color={Colors.textMuted} />
                  ) : (
                    <Play size={18} color={Colors.renda} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleExcluir(item)}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                  <Trash2 size={18} color={Colors.despesa} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={carregando}
            onRefresh={recarregar}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <Text style={s.emptyText}>Nenhuma conta cadastrada.</Text>
        }
      />

      <TouchableOpacity style={s.fab} onPress={abrirNovo}>
        <Plus size={28} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={showModalGerar} transparent animationType="fade">
        <View style={s.gerarModalBackdrop}>
          <View style={s.gerarModalBox}>
            <Text style={s.modalTitle}>Gerar recorrentes</Text>

            <Text style={s.label}>Mês</Text>
            <TextInput
              value={String(mesGeracao)}
              onChangeText={(v) => setMesGeracao(Number(v))}
              keyboardType="numeric"
              style={s.input}
            />

            <Text style={s.label}>Ano</Text>
            <TextInput
              value={String(anoGeracao)}
              onChangeText={(v) => setAnoGeracao(Number(v))}
              keyboardType="numeric"
              style={s.input}
            />

            <View style={s.gerarActions}>
              <TouchableOpacity onPress={() => setShowModalGerar(false)}>
                <Text style={s.gerarCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  setShowModalGerar(false);
                  await handleGerarMes();
                }}
              >
                <Text style={s.gerarConfirmText}>Gerar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showModal} transparent animationType="slide">
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {editandoId ? 'Editar recorrente' : 'Novo recorrente'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={s.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={s.label}>Título</Text>
              <TextInput
                style={s.input}
                placeholder="Ex: Internet"
                value={titulo}
                onChangeText={setTitulo}
              />

              <Text style={s.label}>Valor (R$)</Text>
              <TextInput
                style={s.input}
                placeholder="0,00"
                value={valor}
                onChangeText={setValor}
                keyboardType="decimal-pad"
              />

              <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Dia Venc.</Text>
                  <TextInput
                    style={s.input}
                    value={diaVencimento}
                    onChangeText={setDiaVencimento}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Add desde:</Text>
                  <TextInput
                    style={s.input}
                    value={dataInicio}
                    onChangeText={setDataInicio}
                    placeholder="AAAA-MM-DD"
                  />
                </View>
              </View>

              <Text style={s.label}>Periodicidade</Text>
              <View style={s.periodRow}>
                {PERIODICIDADES.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      s.periodBtn,
                      periodicidade === p.id && s.periodBtnSel,
                    ]}
                    onPress={() => setPeriodicidade(p.id)}
                  >
                    <Text
                      style={[
                        s.periodText,
                        periodicidade === p.id && s.periodTextSel,
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Categoria</Text>
              <View style={s.catGrid}>
                {CATEGORIAS.slice(0, 8).map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      s.catItem,
                      categoria === cat.id && s.catItemSel,
                    ]}
                    onPress={() => setCategoria(cat.id)}
                  >
                    <CategoriaIcon categoria={cat.id} size={28} />
                    <Text
                      style={[
                        s.catLabel,
                        categoria === cat.id && s.catLabelSel,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[s.submitBtn, saving && { opacity: 0.5 }]}
                onPress={handleSalvar}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={s.submitBtnText}>
                    {editandoId ? 'Salvar alterações' : 'Criar recorrente'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
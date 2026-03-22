import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Plus, X, PiggyBank, ArrowUpCircle, ArrowDownCircle, ArrowLeft } from 'lucide-react-native';

import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { buscarReservas, criarReserva, registrarMovimento } from '../services/reservas.service';
import { formatarMoeda } from '../utils';
import { toast } from '../utils/toast';
import type { Reserva } from '../types';

type TipoMovimento = 'deposito' | 'saque';

export default function ReservasScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const { Colors } = useTheme();
  const { usuario, grupoId } = useApp();

  const s = useMemo(() => createStyles(Colors, insets), [Colors, insets]);

  const [loading, setLoading] = useState(true);
  const [reservas, setReservas] = useState<Reserva[]>([]);

  const [showCriar, setShowCriar] = useState(false);
  const [showMov, setShowMov] = useState(false);

  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');

  const [reservaSelecionada, setReservaSelecionada] = useState<Reserva | null>(null);
  const [tipoMov, setTipoMov] = useState<TipoMovimento>('deposito');

  const userId = usuario?.id;

  const carregar = async () => {
    if (!grupoId) return;

    try {
      setLoading(true);
      const data = await buscarReservas(grupoId);
      setReservas(data || []);
    } catch {
      toast.erro('Erro ao carregar reservas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

const criar = async () => {
  if (!grupoId || !userId) {
    toast.erro('Grupo ou usuário não identificado');
    return;
  }

  if (!nome.trim()) {
    toast.erro('Informe o nome da reserva');
    return;
  }

  try {
    await criarReserva({
      grupo_id: grupoId,
      criado_por: userId,
      nome: nome.trim(),
      descricao: null,
      valor_objetivo: 0,
      cor: '#FFD54F',
      icone: 'piggy',
      criado_em: new Date().toISOString(),
    });

    toast.ok('Reserva criada');
    setShowCriar(false);
    setNome('');
    carregar();
  } catch {
    toast.erro('Erro ao criar');
  }
};

  const movimentar = async () => {
    if (!reservaSelecionada) return;

    const valorNum = parseFloat(valor.replace(',', '.'));

    try {
      await registrarMovimento({
        reserva_id: reservaSelecionada.id,
        grupo_id: grupoId,
        criado_por: userId,
        tipo: tipoMov,
        valor: valorNum,
        descricao: null,
      });

      toast.ok('Movimento realizado');
      setShowMov(false);
      setValor('');
      carregar();
    } catch {
      toast.erro('Erro ao movimentar');
    }
  };

  const renderItem = ({ item }: { item: Reserva }) => (
    <View style={s.card}>
      <Text style={s.nome}>{item.nome}</Text>
      <Text style={s.valor}>{formatarMoeda(item.valor_atual)}</Text>

      <View style={s.row}>
        <TouchableOpacity
          onPress={() => {
            setReservaSelecionada(item);
            setTipoMov('deposito');
            setShowMov(true);
          }}
        >
          <ArrowUpCircle size={20} color={Colors.renda} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setReservaSelecionada(item);
            setTipoMov('saque');
            setShowMov(true);
          }}
        >
          <ArrowDownCircle size={20} color={Colors.despesa} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={Colors.textPrimary} />
        </TouchableOpacity>

        <Text style={s.title}>Reservas</Text>

        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : (
        <FlatList
          data={reservas}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
        />
      )}

      <TouchableOpacity style={s.fab} onPress={() => setShowCriar(true)}>
        <Plus size={28} color="#000" />
      </TouchableOpacity>

      {/* MODAL CRIAR */}
      <Modal visible={showCriar} transparent>
        <View style={s.modal}>
          <View style={s.box}>
            <View style={s.modalHeader}>
              <Text style={s.title}>Nova Reserva</Text>
              <TouchableOpacity onPress={() => setShowCriar(false)}>
                <X size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={s.input}
              placeholder="Nome"
              placeholderTextColor={Colors.textMuted}
              value={nome}
              onChangeText={setNome}
            />

            <TouchableOpacity style={s.btn} onPress={criar}>
              <Text style={s.btnText}>Criar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL MOVIMENTO */}
      <Modal visible={showMov} transparent>
        <View style={s.modal}>
          <View style={s.box}>
            <View style={s.modalHeader}>
              <Text style={s.title}>Movimento</Text>
              <TouchableOpacity onPress={() => setShowMov(false)}>
                <X size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={s.input}
              placeholder="Valor"
              keyboardType="numeric"
              placeholderTextColor={Colors.textMuted}
              value={valor}
              onChangeText={setValor}
            />

            <TouchableOpacity style={s.btn} onPress={movimentar}>
              <Text style={s.btnText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
function createStyles(colors: AppColors, insets: { top: number; bottom: number }) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: insets.top,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },

    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },

    card: {
      backgroundColor: colors.cardBg,
      padding: 16,
      margin: 10,
      borderRadius: 12,
    },

    nome: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '600',
    },

    valor: {
      color: colors.textSecondary,
      marginTop: 4,
    },

    row: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 10,
    },

    fab: {
      position: 'absolute',
      bottom: insets.bottom + 20,
      right: 20,
      backgroundColor: colors.primary,
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
    },

    modal: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      padding: 20,
    },

    box: {
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 12,
    },

    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },

    input: {
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      borderRadius: 8,
      color: colors.textPrimary,
      marginBottom: 10,
    },

    btn: {
      backgroundColor: colors.primary,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
    },

    btnText: {
      color: colors.textInverse,
      fontWeight: '700',
    },
  });
}

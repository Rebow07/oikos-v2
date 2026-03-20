import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Plus,
  ArrowUpCircle,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { useReceitas } from '../hooks/useReceitas';
import { useTransacoes } from '../hooks/useTransacoes';
import { excluirReceita, atualizarReceita } from '../services/receitas.service';
import { formatarMoeda } from '../utils';
import { CATEGORIAS_RECEITA, MESES } from '../constants';
import CategoriaIcon from '../components/CategoriaIcon';
import TransacaoItem from '../components/TransacaoItem';
import type { Receita, Transacao } from '../types';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: C.textPrimary },
    totalCard: { backgroundColor: C.renda + '15', borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.lg, alignItems: 'center' },
    totalLabel: { fontSize: FontSize.sm, color: C.renda, fontWeight: FontWeight.semibold, marginBottom: Spacing.xs },
    totalValue: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold, color: C.renda },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary, marginBottom: Spacing.md, marginTop: Spacing.sm },
    receitaCard: { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    receitaInfo: { flex: 1, marginLeft: Spacing.md },
    receitaNome: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: C.textPrimary },
    receitaCat: { fontSize: FontSize.xs, color: C.textMuted, marginTop: 2 },
    receitaValor: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.renda },
    receitaActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginLeft: Spacing.sm },
    emptyText: { fontSize: FontSize.md, color: C.textMuted, textAlign: 'center', paddingVertical: Spacing.xl },
    fab: { position: 'absolute', right: Spacing.md, bottom: Spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: C.renda, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4 },
    inactiveOverlay: { opacity: 0.4 },
  });
}

export default function ReceitasScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { mesSelecionado, anoSelecionado, getNomeMembro } = useApp();
  const { receitas, totalReceitas, carregando, recarregar } = useReceitas();
  const { transacoes: transacoesReceita, carregando: carregandoTrans, recarregar: recarregarTrans } = useTransacoes('renda');

  const handleToggleAtivo = useCallback(async (r: Receita) => {
    // Receitas don't have a toggle in this table structure — we use soft delete
    // For now just confirm delete
    Alert.alert(
      'Remover receita',
      `Deseja remover "${r.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            await excluirReceita(r.id);
            recarregar();
          },
        },
      ],
    );
  }, [recarregar]);

  const handleRefresh = useCallback(() => {
    recarregar();
    recarregarTrans();
  }, [recarregar, recarregarTrans]);

  const getCatLabel = (catId: string) => {
    const cat = CATEGORIAS_RECEITA.find((c) => c.id === catId);
    return cat?.label || catId;
  };

  const renderReceita = useCallback(({ item }: { item: Receita }) => (
    <View style={s.receitaCard}>
      <CategoriaIcon categoria={item.categoria || 'salario'} tipo="renda" size={40} />
      <View style={s.receitaInfo}>
        <Text style={s.receitaNome}>{item.nome}</Text>
        <Text style={s.receitaCat}>
          {getCatLabel(item.categoria)} {item.fixo ? '· Fixa' : '· Avulsa'}
        </Text>
      </View>
      <Text style={s.receitaValor}>{formatarMoeda(item.valor)}</Text>
      <View style={s.receitaActions}>
        <TouchableOpacity onPress={() => handleToggleAtivo(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Trash2 size={18} color={Colors.despesa} />
        </TouchableOpacity>
      </View>
    </View>
  ), [Colors, s, handleToggleAtivo]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <FlatList
        data={receitas}
        keyExtractor={(item) => item.id}
        renderItem={renderReceita}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={carregando} onRefresh={handleRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
        ListHeaderComponent={
          <>
            <View style={s.titleRow}>
              <Text style={s.title}>Receitas</Text>
            </View>
            <View style={s.totalCard}>
              <Text style={s.totalLabel}>Total de receitas fixas</Text>
              <Text style={s.totalValue}>{formatarMoeda(totalReceitas)}</Text>
            </View>
            <Text style={s.sectionTitle}>Fontes de receita</Text>
          </>
        }
        ListEmptyComponent={
          <Text style={s.emptyText}>
            {carregando ? 'Carregando...' : 'Nenhuma fonte de receita cadastrada'}
          </Text>
        }
        ListFooterComponent={
          transacoesReceita.length > 0 ? (
            <View>
              <Text style={[s.sectionTitle, { marginTop: Spacing.lg }]}>
                Lançamentos de {MESES[mesSelecionado - 1]}
              </Text>
              {transacoesReceita.map((t) => (
                <TransacaoItem
                  key={t.id}
                  transacao={t}
                  onPress={() => navigation.navigate('DetalheTransacao', { transacaoId: t.id })}
                  getNomeMembro={getNomeMembro}
                />
              ))}
            </View>
          ) : null
        }
      />
      <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('NovaReceita')} activeOpacity={0.8}>
        <Plus size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

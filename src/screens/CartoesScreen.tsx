<<<<<<< HEAD
import React, { useState, useCallback, useEffect, useRef } from 'react';
=======
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, TextInput, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
<<<<<<< HEAD
import { Plus, X, CreditCard, Trash2, Pencil } from 'lucide-react-native'; // Adicionado Pencil
=======
import { Plus, X, CreditCard, Trash2, Pencil } from 'lucide-react-native';
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { useCartoes } from '../hooks/useCartoes';
import { criarCartao, excluirCartao } from '../services/cartoes.service';
import { formatarMoeda } from '../utils';
import { supabase } from '../services/supabase';
import type { Cartao } from '../types';

const CORES_CARTAO = ['#8E44AD', '#2980B9', '#E74C3C', '#27AE60', '#E67E22', '#1ABC9C', '#D35400', '#2C3E50'];

// ✅ FIX: Movido para fora do componente para evitar recriação a cada render
function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
    title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: C.textPrimary, marginBottom: Spacing.md },
    totalCard: { backgroundColor: C.cardDark, borderRadius: Radius.lg, padding: Spacing.lg, marginHorizontal: Spacing.md, marginBottom: Spacing.md },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
    totalItem: { alignItems: 'center', flex: 1 },
    totalLabel: { fontSize: FontSize.xs, color: C.textOnCard, opacity: 0.6, marginBottom: 4 },
    totalValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textOnCard },
    totalBarBg: { height: 6, backgroundColor: C.textOnCard + '20', borderRadius: 3, marginTop: Spacing.md, overflow: 'hidden' },
    totalBarFill: { height: 6, borderRadius: 3 },
    totalPct: { fontSize: FontSize.xs, color: C.textOnCard, opacity: 0.6, marginTop: 4, textAlign: 'right' },
    list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    card: { borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
    cardName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#FFFFFF', marginBottom: Spacing.sm },
    cardIcon: { position: 'absolute', top: Spacing.md, right: Spacing.md },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
    cardLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' },
    cardValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#FFFFFF' },
    barBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: Spacing.md, overflow: 'hidden' },
    barFill: { height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
    barLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', marginTop: Spacing.xs },
    vencText: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', marginTop: Spacing.sm },
<<<<<<< HEAD
    actionsRow: { position: 'absolute', bottom: Spacing.md, right: Spacing.md, flexDirection: 'row', gap: 16 }, // Ajustado para dois ícones
=======
    actionsRow: { position: 'absolute', bottom: Spacing.md, right: Spacing.md, flexDirection: 'row', gap: 16 },
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
    emptyText: { fontSize: FontSize.md, color: C.textMuted, textAlign: 'center', paddingVertical: Spacing.xxl },
    fab: { position: 'absolute', right: Spacing.md, bottom: Spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4 },
    modalOverlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: C.background, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingBottom: Spacing.xxl, maxHeight: '70%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },
    modalScroll: { paddingHorizontal: Spacing.md },
    label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: C.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.lg },
    input: { backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    coresRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
    corItem: { width: 36, height: 36, borderRadius: 18 },
    corItemSel: { borderWidth: 3, borderColor: C.textPrimary },
    submitBtn: { backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.xl, marginBottom: Spacing.lg },
    submitBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textInverse },
  });
}

interface CardWithGasto extends Cartao { gastoMes: number; }

export default function CartoesScreen() {
  const { Colors } = useTheme();

  // ✅ FIX #1: useMemo para evitar recriar StyleSheet a cada render (principal causa do travamento)
  const s = useMemo(() => makeStyles(Colors), [Colors]);

  const insets = useSafeAreaInsets();
  const { usuario, grupoId } = useApp();
  const { cartoes, carregando, recarregar } = useCartoes();

  const [cartoesComGasto, setCartoesComGasto] = useState<CardWithGasto[]>([]);
  const [loadingGastos, setLoadingGastos] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editandoCartao, setEditandoCartao] = useState<Cartao | null>(null);

  // Estados do Form
  const [nome, setNome] = useState('');
  const [limite, setLimite] = useState('');
  const [vencimento, setVencimento] = useState('10');
  const [cor, setCor] = useState(CORES_CARTAO[0]);
  const [saving, setSaving] = useState(false);

  const cartoesIdsRef = useRef('');

<<<<<<< HEAD
  useEffect(() => {
    const idsKey = cartoes.map((c) => c.id).sort().join(',');
    if (idsKey === cartoesIdsRef.current && cartoesComGasto.length > 0) return;
    cartoesIdsRef.current = idsKey;

    if (cartoes.length === 0) {
=======
  // ✅ FIX #2: Usar string estável como dependência em vez do array `cartoes`
  // Isso evita o loop infinito causado pela referência nova do array a cada render
  const cartoesIdsKey = useMemo(
    () => cartoes.map((c) => c.id).sort().join(','),
    [cartoes],
  );

  useEffect(() => {
    if (cartoesIdsKey === cartoesIdsRef.current && cartoesComGasto.length > 0) return;
    cartoesIdsRef.current = cartoesIdsKey;

    if (!cartoesIdsKey) {
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
      setCartoesComGasto([]);
      return;
    }

    let cancelled = false;
    setLoadingGastos(true);

    Promise.all(
      cartoes.map(async (c) => {
<<<<<<< HEAD
        const { data: gastoTotal, error } = await supabase.rpc('limite_disponivel_cartao', { p_cartao_id: c.id });
        const usadoTotal = error ? 0 : Math.max(Number(c.limite) - Number(gastoTotal), 0);
        return { ...c, gastoMes: usadoTotal };
=======
        try {
          const { data: gastoTotal, error } = await supabase.rpc('limite_disponivel_cartao', { p_cartao_id: c.id });
          const usadoTotal = error ? 0 : Math.max(Number(c.limite) - Number(gastoTotal), 0);
          return { ...c, gastoMes: usadoTotal };
        } catch {
          return { ...c, gastoMes: 0 };
        }
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
      })
    ).then((result) => {
      if (!cancelled) {
        setCartoesComGasto(result);
        setLoadingGastos(false);
      }
    }).catch(() => {
      if (!cancelled) setLoadingGastos(false);
    });

    return () => { cancelled = true; };
<<<<<<< HEAD
  }, [cartoes]);
=======
  // ✅ FIX #2 cont.: depende da string estável, não do array
  }, [cartoesIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)

  const totalLimite = cartoesComGasto.reduce((a, c) => a + Number(c.limite), 0);
  const totalUsado = cartoesComGasto.reduce((a, c) => a + c.gastoMes, 0);
  const totalDisponivel = Math.max(totalLimite - totalUsado, 0);
  const totalPct = totalLimite > 0 ? (totalUsado / totalLimite) * 100 : 0;

<<<<<<< HEAD
  // Função para abrir modal de edição
  const handleEditar = (c: Cartao) => {
=======
  // ✅ FIX #3: handleEditar agora está em useCallback para ser estável como referência
  const handleEditar = useCallback((c: Cartao) => {
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
    setEditandoCartao(c);
    setNome(c.nome);
    setLimite(c.limite.toString().replace('.', ','));
    setVencimento(c.vencimento.toString());
    setCor(c.cor);
    setShowModal(true);
<<<<<<< HEAD
  };
=======
  }, []);
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)

  const handleExcluir = useCallback((c: Cartao) => {
    Alert.alert('Excluir cartão', `Remover "${c.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
<<<<<<< HEAD
        await excluirCartao(c.id);
        cartoesIdsRef.current = ''; 
=======
        try {
          await excluirCartao(c.id);
        } catch (err: any) {
          Alert.alert('Erro ao excluir', err.message);
          return;
        }
        cartoesIdsRef.current = '';
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
        recarregar();
      }},
    ]);
  }, [recarregar]);

  const handleSalvar = useCallback(async () => {
    const limiteNum = parseFloat(limite.replace(',', '.'));
<<<<<<< HEAD
    if (!nome.trim() || isNaN(limiteNum) || limiteNum <= 0) { 
      Alert.alert('Erro', 'Preencha nome e limite.'); 
      return; 
=======
    if (!nome.trim() || isNaN(limiteNum) || limiteNum <= 0) {
      Alert.alert('Erro', 'Preencha nome e limite.');
      return;
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
    }
    setSaving(true);
    try {
      if (editandoCartao) {
<<<<<<< HEAD
        // Lógica de UPDATE
=======
        // Lógica de UPDATE via service (consistente com o resto do código)
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
        const { error } = await supabase
          .from('cartoes')
          .update({
            nome: nome.trim(),
            limite: limiteNum,
            vencimento: parseInt(vencimento, 10) || 10,
<<<<<<< HEAD
            cor
          })
          .eq('id', editandoCartao.id);

        if (error) throw error;
      } else {
        // Lógica de INSERT
        await criarCartao({ 
          grupo_id: grupoId, 
          criado_por: usuario.id, 
          nome: nome.trim(), 
          limite: limiteNum, 
          vencimento: parseInt(vencimento, 10) || 10, 
          cor,
          criado_em: new Date().toISOString() 
        });
      }

      setShowModal(false);
      setNome('');
      setLimite('');
      setEditandoCartao(null);
      cartoesIdsRef.current = ''; 
      recarregar();
    } catch (err: any) { 
      Alert.alert('Erro', err.message); 
    } finally { 
      setSaving(false); 
    }
  }, [nome, limite, vencimento, cor, grupoId, usuario, editandoCartao, recarregar]);
=======
            cor,
          })
          .eq('id', editandoCartao.id);
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)

        if (error) throw error;
      } else {
        // Lógica de INSERT
        await criarCartao({
          grupo_id: grupoId,
          criado_por: usuario?.id,
          nome: nome.trim(),
          limite: limiteNum,
          vencimento: parseInt(vencimento, 10) || 10,
          cor,
          criado_em: new Date().toISOString(),
        });
      }

      setShowModal(false);
      setNome('');
      setLimite('');
      // ✅ FIX #4: Resetar vencimento e cor ao fechar modal
      setVencimento('10');
      setCor(CORES_CARTAO[0]);
      setEditandoCartao(null);
      cartoesIdsRef.current = '';
      recarregar();
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setSaving(false);
    }
  }, [nome, limite, vencimento, cor, grupoId, usuario, editandoCartao, recarregar]);

  // ✅ FIX #5: fechar modal também reseta form completamente
  const handleFecharModal = useCallback(() => {
    setShowModal(false);
    setNome('');
    setLimite('');
    setVencimento('10');
    setCor(CORES_CARTAO[0]);
    setEditandoCartao(null);
  }, []);

  // ✅ FIX #3 cont.: handleEditar incluído nas deps do renderCard
  const renderCard = useCallback(({ item }: { item: CardWithGasto }) => {
    const usado = item.gastoMes;
    const disponivel = Math.max(Number(item.limite) - usado, 0);
    const pct = Number(item.limite) > 0 ? Math.min((usado / Number(item.limite)) * 100, 100) : 0;
    return (
      <View style={[s.card, { backgroundColor: item.cor }]}>
        <View style={s.cardIcon}><CreditCard size={24} color="rgba(255,255,255,0.3)" /></View>
        <Text style={s.cardName}>{item.nome}</Text>
        <View style={s.cardRow}>
          <View><Text style={s.cardLabel}>Usado Total</Text><Text style={s.cardValue}>{formatarMoeda(usado)}</Text></View>
          <View><Text style={s.cardLabel}>Disponível</Text><Text style={s.cardValue}>{formatarMoeda(disponivel)}</Text></View>
          <View><Text style={s.cardLabel}>Limite</Text><Text style={s.cardValue}>{formatarMoeda(Number(item.limite))}</Text></View>
        </View>
        <View style={s.barBg}><View style={[s.barFill, { width: `${pct}%`, backgroundColor: pct > 80 ? '#ff6b6b' : '#FFFFFF' }]} /></View>
        <Text style={s.barLabel}>{Math.round(pct)}% do limite comprometido</Text>
        <Text style={s.vencText}>Vencimento: dia {item.vencimento}</Text>
<<<<<<< HEAD
        
        <View style={s.actionsRow}>
          <TouchableOpacity onPress={() => handleEditar(item)}>
            <Pencil size={18} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleExcluir(item)}>
=======

        <View style={s.actionsRow}>
          <TouchableOpacity onPress={() => handleEditar(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Pencil size={18} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleExcluir(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
            <Trash2 size={18} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [s, handleEditar, handleExcluir]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}><Text style={s.title}>Cartões</Text></View>

<<<<<<< HEAD
      <FlatList data={cartoesComGasto} keyExtractor={(item) => item.id} renderItem={renderCard}
        contentContainerStyle={s.list} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={() => { cartoesIdsRef.current = ''; recarregar(); }} tintColor={Colors.primary} colors={[Colors.primary]} />}
=======
      <FlatList
        data={cartoesComGasto}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={carregando}
            onRefresh={() => { cartoesIdsRef.current = ''; recarregar(); }}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
        ListHeaderComponent={
          cartoesComGasto.length > 0 ? (
            <View style={s.totalCard}>
              <View style={s.totalRow}>
                <View style={s.totalItem}><Text style={s.totalLabel}>Total Comprometido</Text><Text style={[s.totalValue, { color: Colors.despesa }]}>{formatarMoeda(totalUsado)}</Text></View>
                <View style={s.totalItem}><Text style={s.totalLabel}>Livre</Text><Text style={[s.totalValue, { color: Colors.renda }]}>{formatarMoeda(totalDisponivel)}</Text></View>
                <View style={s.totalItem}><Text style={s.totalLabel}>Limite total</Text><Text style={s.totalValue}>{formatarMoeda(totalLimite)}</Text></View>
              </View>
              <View style={s.totalBarBg}><View style={[s.totalBarFill, { width: `${Math.min(totalPct, 100)}%`, backgroundColor: totalPct > 80 ? Colors.despesa : Colors.renda }]} /></View>
              <Text style={s.totalPct}>{Math.round(totalPct)}% ocupado</Text>
            </View>
          ) : null
        }
<<<<<<< HEAD
        ListEmptyComponent={<Text style={s.emptyText}>{carregando || loadingGastos ? 'Carregando...' : 'Nenhum cartão cadastrado'}</Text>}
      />

      <TouchableOpacity style={s.fab} onPress={() => { setEditandoCartao(null); setNome(''); setLimite(''); setShowModal(true); }} activeOpacity={0.8}>
=======
        ListEmptyComponent={
          <Text style={s.emptyText}>
            {carregando || loadingGastos ? 'Carregando...' : 'Nenhum cartão cadastrado'}
          </Text>
        }
      />

      {/* ✅ FIX #4: FAB reseta todos os campos do form ao abrir */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => {
          setEditandoCartao(null);
          setNome('');
          setLimite('');
          setVencimento('10');
          setCor(CORES_CARTAO[0]);
          setShowModal(true);
        }}
        activeOpacity={0.8}
      >
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
        <Plus size={26} color={Colors.textInverse} />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide">
        {/* ✅ FIX #5: usa handleFecharModal para garantir reset do form */}
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={handleFecharModal}>
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editandoCartao ? 'Editar Cartão' : 'Novo Cartão'}</Text>
<<<<<<< HEAD
              <TouchableOpacity onPress={() => setShowModal(false)}><X size={22} color={Colors.textPrimary} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Nome</Text>
              <TextInput style={s.input} placeholder="Ex: Nubank" placeholderTextColor={Colors.textMuted} value={nome} onChangeText={setNome} />
              
              <Text style={s.label}>Limite (R$)</Text>
              <TextInput style={s.input} placeholder="0,00" placeholderTextColor={Colors.textMuted} value={limite} onChangeText={setLimite} keyboardType="decimal-pad" />
              
              <Text style={s.label}>Dia de vencimento</Text>
              <TextInput style={[s.input, { width: 80 }]} value={vencimento} onChangeText={(t) => setVencimento(t.replace(/\D/g, '').slice(0, 2))} keyboardType="number-pad" maxLength={2} />
              
              <Text style={s.label}>Cor</Text>
              <View style={s.coresRow}>{CORES_CARTAO.map((c) => <TouchableOpacity key={c} style={[s.corItem, { backgroundColor: c }, cor === c && s.corItemSel]} onPress={() => setCor(c)} />)}</View>
              
              <TouchableOpacity style={[s.submitBtn, saving && { opacity: 0.5 }]} onPress={handleSalvar} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.textInverse} /> : <Text style={s.submitBtnText}>{editandoCartao ? 'Atualizar' : 'Salvar'}</Text>}
=======
              <TouchableOpacity onPress={handleFecharModal}><X size={22} color={Colors.textPrimary} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Nome</Text>
              <TextInput
                style={s.input}
                placeholder="Ex: Nubank"
                placeholderTextColor={Colors.textMuted}
                value={nome}
                onChangeText={setNome}
              />

              <Text style={s.label}>Limite (R$)</Text>
              <TextInput
                style={s.input}
                placeholder="0,00"
                placeholderTextColor={Colors.textMuted}
                value={limite}
                onChangeText={setLimite}
                keyboardType="decimal-pad"
              />

              <Text style={s.label}>Dia de vencimento</Text>
              <TextInput
                style={[s.input, { width: 80 }]}
                value={vencimento}
                onChangeText={(t) => setVencimento(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
              />

              <Text style={s.label}>Cor</Text>
              <View style={s.coresRow}>
                {CORES_CARTAO.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[s.corItem, { backgroundColor: c }, cor === c && s.corItemSel]}
                    onPress={() => setCor(c)}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[s.submitBtn, saving && { opacity: 0.5 }]}
                onPress={handleSalvar}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color={Colors.textInverse} />
                  : <Text style={s.submitBtnText}>{editandoCartao ? 'Atualizar' : 'Salvar'}</Text>
                }
>>>>>>> 68d4f0e (fix: toast integration, type fixes and rpc support)
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
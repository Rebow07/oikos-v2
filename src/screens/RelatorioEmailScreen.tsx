import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Send, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { useTransacoes } from '../hooks/useTransacoes';
import { useReceitas } from '../hooks/useReceitas';
import { formatarMoeda } from '../utils';
import { MESES } from '../constants';
import { supabase } from '../services/supabase';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
    headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary },
    scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    desc: { fontSize: FontSize.md, color: C.textSecondary, marginBottom: Spacing.lg, lineHeight: 22 },
    label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: C.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.lg },
    input: { backgroundColor: C.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    // Seletor de período
    periodNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, backgroundColor: C.surface, borderRadius: Radius.md, paddingVertical: Spacing.md, marginTop: Spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    periodText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.textPrimary, minWidth: 140, textAlign: 'center' },
    // Preview
    previewCard: { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.lg, marginTop: Spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    previewTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary, marginBottom: Spacing.md },
    previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    previewLabel: { fontSize: FontSize.md, color: C.textSecondary },
    previewValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.textPrimary },
    sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: C.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, marginTop: Spacing.xl },
    sendBtnDisabled: { opacity: 0.5 },
    sendBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textInverse },
    hint: { fontSize: FontSize.xs, color: C.textMuted, marginTop: Spacing.sm, textAlign: 'center' },
    successBox: { backgroundColor: C.renda + '15', borderRadius: Radius.md, padding: Spacing.lg, marginTop: Spacing.lg, alignItems: 'center' },
    successText: { fontSize: FontSize.md, color: C.renda, fontWeight: FontWeight.bold, marginTop: Spacing.sm },
    errorHint: { fontSize: FontSize.xs, color: C.despesa, marginTop: Spacing.sm, textAlign: 'center' },
  });
}

export default function RelatorioEmailScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { grupo, mesSelecionado, setMesSelecionado, anoSelecionado, setAnoSelecionado } = useApp();
  const { totalDespesas, totalReceitas, totalPago, totalAPagar, porCategoria } = useTransacoes();
  const { totalReceitas: totalReceitasFixas } = useReceitas();

  const [email, setEmail] = useState(grupo?.email_relatorio || '');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erroMsg, setErroMsg] = useState('');

  const receitaTotal = totalReceitas + totalReceitasFixas;
  const saldo = receitaTotal - totalDespesas;

  // Navegação de período
  const mesAnterior = () => {
    if (mesSelecionado === 1) {
      setMesSelecionado(12);
      setAnoSelecionado(anoSelecionado - 1);
    } else {
      setMesSelecionado(mesSelecionado - 1);
    }
    // Reset enviado ao trocar mês
    setEnviado(false);
    setErroMsg('');
  };

  const mesProximo = () => {
    if (mesSelecionado === 12) {
      setMesSelecionado(1);
      setAnoSelecionado(anoSelecionado + 1);
    } else {
      setMesSelecionado(mesSelecionado + 1);
    }
    setEnviado(false);
    setErroMsg('');
  };

  const handleEnviar = useCallback(async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Erro', 'Informe um email válido.');
      return;
    }

    setEnviando(true);
    setErroMsg('');
    try {
      // Salvar email no grupo
      await supabase.from('grupos').update({ email_relatorio: email.trim() }).eq('id', grupo?.id);

      // Preparar categorias
      const categoriasPayload = porCategoria.slice(0, 10).map((c) => ({
        categoria: c.categoria,
        valor: c.valor,
      }));

      // Chamar edge function
      const { data, error } = await supabase.functions.invoke('enviar-relatorio', {
        body: {
          email: email.trim(),
          mes: MESES[mesSelecionado - 1],
          ano: anoSelecionado,
          despesas: totalDespesas,
          receitas: receitaTotal,
          saldo: saldo,
          pago: totalPago,
          apagar: totalAPagar,
          categorias: categoriasPayload,
        },
      });

      if (error) {
        const errorDetail = error.message || 'Erro desconhecido';
        if (errorDetail.includes('non-2xx') || errorDetail.includes('Edge Function')) {
          throw new Error('Erro no servidor de email. Verifique se a chave RESEND_API_KEY está válida nas configurações do Supabase Edge Functions.');
        }
        throw error;
      }
      if (data?.error) throw new Error(data.error);

      setEnviado(true);
    } catch (err: any) {
      const msg = err.message || 'Tente novamente mais tarde.';
      setErroMsg(msg);
      Alert.alert('Erro ao enviar', msg);
    } finally {
      setEnviando(false);
    }
  }, [email, grupo, mesSelecionado, anoSelecionado, totalDespesas, receitaTotal, saldo, totalPago, totalAPagar, porCategoria]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>Relatório por Email</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><X size={24} color={Colors.textPrimary} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.desc}>Envie um resumo financeiro mensal por email.</Text>

        <Text style={s.label}>Email de destino</Text>
        <TextInput style={s.input} placeholder="email@exemplo.com" placeholderTextColor={Colors.textMuted}
          value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

        {/* Seletor de período */}
        <Text style={s.label}>Período do relatório</Text>
        <View style={s.periodNav}>
          <TouchableOpacity onPress={mesAnterior} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ChevronLeft size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.periodText}>{MESES[mesSelecionado - 1]} {anoSelecionado}</Text>
          <TouchableOpacity onPress={mesProximo} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ChevronRight size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Preview */}
        <View style={s.previewCard}>
          <Text style={s.previewTitle}>Resumo de {MESES[mesSelecionado - 1]} {anoSelecionado}</Text>
          <View style={s.previewRow}><Text style={s.previewLabel}>Receitas</Text><Text style={[s.previewValue, { color: Colors.renda }]}>{formatarMoeda(receitaTotal)}</Text></View>
          <View style={s.previewRow}><Text style={s.previewLabel}>Despesas</Text><Text style={[s.previewValue, { color: Colors.despesa }]}>{formatarMoeda(totalDespesas)}</Text></View>
          <View style={s.previewRow}><Text style={s.previewLabel}>Saldo</Text><Text style={[s.previewValue, { color: saldo >= 0 ? Colors.renda : Colors.despesa }]}>{formatarMoeda(saldo)}</Text></View>
          <View style={s.previewRow}><Text style={s.previewLabel}>Pago</Text><Text style={s.previewValue}>{formatarMoeda(totalPago)}</Text></View>
          <View style={[s.previewRow, { borderBottomWidth: 0 }]}><Text style={s.previewLabel}>A pagar</Text><Text style={[s.previewValue, { color: Colors.despesa }]}>{formatarMoeda(totalAPagar)}</Text></View>
        </View>

        {enviado ? (
          <View style={s.successBox}>
            <CheckCircle size={32} color={Colors.renda} />
            <Text style={s.successText}>Email enviado com sucesso!</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity style={[s.sendBtn, enviando && s.sendBtnDisabled]} onPress={handleEnviar} disabled={enviando} activeOpacity={0.8}>
              {enviando ? <ActivityIndicator color={Colors.textInverse} /> : (<><Send size={20} color={Colors.textInverse} /><Text style={s.sendBtnText}>Enviar Relatório</Text></>)}
            </TouchableOpacity>
            <Text style={s.hint}>O email será enviado via Resend (onboarding@resend.dev)</Text>
            {!!erroMsg && <Text style={s.errorHint}>{erroMsg}</Text>}
          </>
        )}
      </ScrollView>
    </View>
  );
}

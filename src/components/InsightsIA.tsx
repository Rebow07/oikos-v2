import React, { memo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Sparkles, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { supabase } from '../services/supabase';
import { formatarMoeda } from '../utils';

interface Props {
  totalDespesas: number;
  totalReceitas: number;
  porCategoria: { categoria: string; valor: number }[];
  mes: number;
  ano: number;
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: C.primaryLight,
      borderRadius: Radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.primary + '30',
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    headerTitle: {
      fontSize: FontSize.sm,
      fontWeight: FontWeight.bold,
      color: C.primary,
      marginLeft: Spacing.sm,
    },
    content: {
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
    },
    insightText: {
      fontSize: FontSize.sm,
      color: C.textPrimary,
      lineHeight: 20,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    loadingContainer: {
      paddingVertical: Spacing.md,
      alignItems: 'center',
    },
    errorText: {
      fontSize: FontSize.sm,
      color: C.despesa,
    },
  });
}

function InsightsIA({ totalDespesas, totalReceitas, porCategoria, mes, ano }: Props) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);

  const [expandido, setExpandido] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const gerarInsight = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const top3 = porCategoria.slice(0, 3);
      const categoriasTexto = top3
        .map((c) => `${c.categoria}: ${formatarMoeda(c.valor)}`)
        .join(', ');

      const prompt = `Você é um consultor financeiro brasileiro. Analise brevemente os gastos do mês ${mes}/${ano}:
- Total despesas: ${formatarMoeda(totalDespesas)}
- Total receitas: ${formatarMoeda(totalReceitas)}
- Saldo: ${formatarMoeda(totalReceitas - totalDespesas)}
- Top categorias: ${categoriasTexto}

Dê um insight curto (máx 3 frases) com uma dica prática. Seja direto e amigável. Não use emojis.`;

      const { data, error } = await supabase.functions.invoke('ia-proxy', {
        body: { prompt, maxTokens: 200 },
      });

      if (error) throw error;
      setInsight(data?.text || 'Não foi possível gerar o insight.');
    } catch (err: any) {
      setErro('Não foi possível conectar à IA.');
    } finally {
      setCarregando(false);
    }
  }, [totalDespesas, totalReceitas, porCategoria, mes, ano]);

  const handleToggle = useCallback(() => {
    const novoEstado = !expandido;
    setExpandido(novoEstado);

    if (novoEstado && !insight && !carregando) {
      gerarInsight();
    }
  }, [expandido, insight, carregando, gerarInsight]);

  return (
    <View style={s.container}>
      <TouchableOpacity
        style={s.header}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <View style={s.headerLeft}>
          <Sparkles size={16} color={Colors.primary} />
          <Text style={s.headerTitle}>Insights IA</Text>
        </View>

        <View style={s.actions}>
          {expandido && insight && (
            <TouchableOpacity
              onPress={gerarInsight}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <RefreshCw size={14} color={Colors.primary} />
            </TouchableOpacity>
          )}
          {expandido ? (
            <ChevronUp size={18} color={Colors.primary} />
          ) : (
            <ChevronDown size={18} color={Colors.primary} />
          )}
        </View>
      </TouchableOpacity>

      {expandido && (
        <View style={s.content}>
          {carregando ? (
            <View style={s.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : erro ? (
            <Text style={s.errorText}>{erro}</Text>
          ) : insight ? (
            <Text style={s.insightText}>{insight}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

export default memo(InsightsIA);

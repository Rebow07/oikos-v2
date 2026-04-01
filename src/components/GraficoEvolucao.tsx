// src/components/GraficoEvolucao.tsx
// Gráfico de barras comparando receita vs despesa nos últimos 6 meses
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme, Spacing, FontSize, FontWeight } from '../theme';
import { supabase } from '../services/supabase';
import { formatarMoedaAbrev } from '../utils';
import { MESES } from '../constants';

interface Props {
  grupoId: string;
  mesAtual: number;
  anoAtual: number;
}

interface DadoMes {
  mes: number;
  ano: number;
  despesas: number;
  receitas: number;
}

function mesLabel(mes: number): string {
  return MESES[mes - 1].substring(0, 3);
}

function mesesAnteriores(mes: number, ano: number, quantidade: number): { mes: number; ano: number }[] {
  const result = [];
  for (let i = quantidade - 1; i >= 0; i--) {
    let m = mes - i;
    let a = ano;
    while (m < 1) { m += 12; a -= 1; }
    result.push({ mes: m, ano: a });
  }
  return result;
}

export default function GraficoEvolucao({ grupoId, mesAtual, anoAtual }: Props) {
  const { Colors } = useTheme();
  const [dados, setDados] = useState<DadoMes[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!grupoId) return;
    setCarregando(true);
    const periodos = mesesAnteriores(mesAtual, anoAtual, 6);

    const inicio = `${periodos[0].ano}-${String(periodos[0].mes).padStart(2, '0')}-01`;
    const ultimo = periodos[periodos.length - 1];
    const ultimoDia = new Date(ultimo.ano, ultimo.mes, 0).getDate();
    const fim = `${ultimo.ano}-${String(ultimo.mes).padStart(2, '0')}-${ultimoDia}`;

    supabase
      .from('transacoes')
      .select('valor, tipo, data')
      .eq('grupo_id', grupoId)
      .gte('data', inicio)
      .lte('data', fim)
      .then(({ data }) => {
        const map: Record<string, DadoMes> = {};
        periodos.forEach((p) => {
          const k = `${p.ano}-${p.mes}`;
          map[k] = { ...p, despesas: 0, receitas: 0 };
        });
        (data || []).forEach((t: any) => {
          const d = new Date(t.data);
          const k = `${d.getFullYear()}-${d.getMonth() + 1}`;
          if (map[k]) {
            if (t.tipo === 'despesa') map[k].despesas += Number(t.valor);
            else map[k].receitas += Number(t.valor);
          }
        });
        setDados(Object.values(map));
        setCarregando(false);
      });
  }, [grupoId, mesAtual, anoAtual]);

  const maxVal = useMemo(() => {
    return Math.max(...dados.map((d) => Math.max(d.despesas, d.receitas)), 1);
  }, [dados]);

  const BAR_H = 100;

  if (carregando) {
    return (
      <View style={{ height: BAR_H + 60, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <View>
      {/* Legenda */}
      <View style={{ flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md, justifyContent: 'flex-end' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.despesa }} />
          <Text style={{ fontSize: FontSize.xs, color: Colors.textMuted }}>Despesas</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.renda }} />
          <Text style={{ fontSize: FontSize.xs, color: Colors.textMuted }}>Receitas</Text>
        </View>
      </View>

      {/* Barras */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: BAR_H + 30 }}>
        {dados.map((d) => {
          const hDespesa = Math.max((d.despesas / maxVal) * BAR_H, d.despesas > 0 ? 4 : 0);
          const hReceita = Math.max((d.receitas / maxVal) * BAR_H, d.receitas > 0 ? 4 : 0);
          const isAtual = d.mes === mesAtual && d.ano === anoAtual;
          return (
            <View key={`${d.ano}-${d.mes}`} style={{ alignItems: 'center', flex: 1, gap: 4 }}>
              {/* Valor máximo da coluna */}
              <Text style={{ fontSize: 8, color: Colors.textMuted, textAlign: 'center' }}>
                {formatarMoedaAbrev(Math.max(d.despesas, d.receitas))}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: BAR_H }}>
                <View style={{
                  width: 10, height: hDespesa, borderRadius: 3,
                  backgroundColor: isAtual ? Colors.despesa : Colors.despesa + '80',
                }} />
                <View style={{
                  width: 10, height: hReceita, borderRadius: 3,
                  backgroundColor: isAtual ? Colors.renda : Colors.renda + '80',
                }} />
              </View>
              <Text style={{
                fontSize: 9, color: isAtual ? Colors.primary : Colors.textMuted,
                fontWeight: isAtual ? FontWeight.bold : FontWeight.regular,
              }}>
                {mesLabel(d.mes)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

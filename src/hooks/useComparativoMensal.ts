// src/hooks/useComparativoMensal.ts
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { inicioDoMes, fimDoMes } from '../utils';

interface ComparativoMensal {
  carregando: boolean;
  variacaoPctTotal: number;        // positivo = gastou mais
  despesasMesAtual: number;
  despesasMesAnterior: number;
  maiorAltaCategoria: string | null;
  maiorAltaPct: number;
}

function mesAnteriorDe(mes: number, ano: number): { mes: number; ano: number } {
  if (mes === 1) return { mes: 12, ano: ano - 1 };
  return { mes: mes - 1, ano };
}

export function useComparativoMensal(
  grupoId: string,
  mesSelecionado: number,
  anoSelecionado: number,
  despesasMesAtual: number,
  porCategoria: { categoria: string; valor: number }[],
): ComparativoMensal {
  const [carregando, setCarregando] = useState(true);
  const [despesasMesAnterior, setDespesasMesAnterior] = useState(0);
  const [porCatAnterior, setPorCatAnterior] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!grupoId) return;
    const { mes: mA, ano: aA } = mesAnteriorDe(mesSelecionado, anoSelecionado);
    const inicio = inicioDoMes(mA, aA);
    const fim    = fimDoMes(mA, aA);

    setCarregando(true);
    supabase
      .from('transacoes')
      .select('valor, categoria')
      .eq('grupo_id', grupoId)
      .eq('tipo', 'despesa')
      .gte('data', inicio)
      .lte('data', fim)
      .then(({ data }) => {
        if (!data) { setCarregando(false); return; }
        const total = data.reduce((s, t) => s + Number(t.valor), 0);
        setDespesasMesAnterior(total);
        const map: Record<string, number> = {};
        data.forEach((t) => { map[t.categoria] = (map[t.categoria] || 0) + Number(t.valor); });
        setPorCatAnterior(map);
        setCarregando(false);
      });
  }, [grupoId, mesSelecionado, anoSelecionado]);

  // Variação total
  const variacaoPctTotal = despesasMesAnterior > 0
    ? ((despesasMesAtual - despesasMesAnterior) / despesasMesAnterior) * 100
    : 0;

  // Categoria com maior alta
  let maiorAltaCategoria: string | null = null;
  let maiorAltaPct = 0;
  porCategoria.forEach(({ categoria, valor }) => {
    const ant = porCatAnterior[categoria] || 0;
    if (ant > 0) {
      const pct = ((valor - ant) / ant) * 100;
      if (pct > maiorAltaPct) { maiorAltaPct = pct; maiorAltaCategoria = categoria; }
    }
  });

  return { carregando, variacaoPctTotal, despesasMesAtual, despesasMesAnterior, maiorAltaCategoria, maiorAltaPct };
}

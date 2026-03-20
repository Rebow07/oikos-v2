import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check, Clock } from 'lucide-react-native';
import CategoriaIcon from './CategoriaIcon';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { CATEGORIAS } from '../constants';
import { formatarMoeda, formatarDataCurta } from '../utils';
import type { Transacao } from '../types';

interface Props {
  transacao: Transacao;
  onPress?: (t: Transacao) => void;
  onTogglePago?: (t: Transacao) => void;
  selecionado?: boolean;
  getNomeMembro?: (userId: string) => string;
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    containerSel: { borderColor: C.primary, borderWidth: 1.5 },
    iconArea: { marginRight: Spacing.md },
    content: { flex: 1, marginRight: Spacing.sm },
    titulo: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: C.textPrimary },
    subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 2 },
    categoria: { fontSize: FontSize.xs, color: C.textMuted },
    data: { fontSize: FontSize.xs, color: C.textMuted },
    parcelado: { fontSize: FontSize.xs, color: C.primary, fontWeight: FontWeight.semibold },
    badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full, alignSelf: 'flex-start', marginTop: 4 },
    badgeText: { fontSize: 10, fontWeight: FontWeight.bold },
    rightArea: { alignItems: 'flex-end' },
    valor: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    statusText: { fontSize: FontSize.xs, marginLeft: 3 },
    pago: { color: C.renda },
    pendente: { color: C.textMuted },
  });
}

function TransacaoItem({ transacao, onPress, onTogglePago, selecionado = false, getNomeMembro }: Props) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);

  const cat = CATEGORIAS.find((c) => c.id === transacao.categoria);
  const isDespesa = transacao.tipo === 'despesa';

  // SEMPRE usa getNomeMembro para pegar o nome da PESSOA (não do grupo)
  const nomeCriador = getNomeMembro ? getNomeMembro(transacao.criado_por) : null;

  return (
    <TouchableOpacity style={[s.container, selecionado && s.containerSel]} onPress={() => onPress?.(transacao)} activeOpacity={0.7}>
      <View style={s.iconArea}><CategoriaIcon categoria={transacao.categoria} tipo={transacao.tipo} size={40} /></View>
      <View style={s.content}>
        <Text style={s.titulo} numberOfLines={1}>{transacao.titulo}</Text>
        <View style={s.subtitleRow}>
          <Text style={s.categoria}>{cat?.label || transacao.categoria}</Text>
          <Text style={s.data}>{formatarDataCurta(transacao.data)}</Text>
          {transacao.parcelado && transacao.parcela_index != null && <Text style={s.parcelado}>{transacao.parcela_index}x</Text>}
        </View>
        {nomeCriador && nomeCriador !== 'Desconhecido' ? (
          <View style={[s.badge, { backgroundColor: Colors.primary + '20' }]}>
            <Text style={[s.badgeText, { color: Colors.primary }]}>{nomeCriador}</Text>
          </View>
        ) : null}
      </View>
      <View style={s.rightArea}>
        <Text style={[s.valor, { color: isDespesa ? Colors.despesa : Colors.renda }]}>
          {isDespesa ? '- ' : '+ '}{formatarMoeda(Number(transacao.valor))}
        </Text>
        {isDespesa && (
          <TouchableOpacity style={s.statusRow} onPress={() => onTogglePago?.(transacao)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            {transacao.pago ? (<><Check size={12} color={Colors.renda} /><Text style={[s.statusText, s.pago]}>Pago</Text></>) :
              (<><Clock size={12} color={Colors.textMuted} /><Text style={[s.statusText, s.pendente]}>Pendente</Text></>)}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default memo(TransacaoItem);

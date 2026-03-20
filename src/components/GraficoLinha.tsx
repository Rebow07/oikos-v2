import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useTheme, AppColors, FontSize, Spacing } from '../theme';

interface DataPoint {
  label: string;
  valor: number;
}

interface Props {
  dados: DataPoint[];
  width?: number;
  height?: number;
  cor?: string;
}

function GraficoLinha({ dados, width = 320, height = 160, cor }: Props) {
  const { Colors } = useTheme();
  const lineColor = cor || Colors.primary;

  if (dados.length < 2) return null;

  const padding = { top: 10, right: 10, bottom: 28, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const valores = dados.map((d) => d.valor);
  const minV = Math.min(...valores) * 0.9;
  const maxV = Math.max(...valores) * 1.1 || 1;
  const rangeV = maxV - minV || 1;

  const points = dados.map((d, i) => {
    const x = padding.left + (i / (dados.length - 1)) * chartW;
    const y = padding.top + chartH - ((d.valor - minV) / rangeV) * chartH;
    return { x, y };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        <Line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartH} stroke={Colors.border} strokeWidth={0.5} />
        <Line x1={padding.left} y1={padding.top + chartH} x2={padding.left + chartW} y2={padding.top + chartH} stroke={Colors.border} strokeWidth={0.5} />

        {/* Line */}
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={lineColor}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots + labels */}
        {points.map((p, i) => (
          <React.Fragment key={i}>
            <Circle cx={p.x} cy={p.y} r={3.5} fill={lineColor} />
            <SvgText
              x={p.x}
              y={padding.top + chartH + 16}
              fontSize={9}
              fill={Colors.textMuted}
              textAnchor="middle"
            >
              {dados[i].label}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

export default memo(GraficoLinha);

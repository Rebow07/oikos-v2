import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme, AppColors, FontSize, FontWeight, Spacing } from '../theme';

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: Segment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
}

function makeStyles(C: AppColors, size: number) {
  return StyleSheet.create({
    container: { alignItems: 'center' },
    svgContainer: { width: size, height: size, position: 'relative' },
    center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
    centerLabel: { fontSize: FontSize.xs, color: C.textMuted },
    centerValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },
    legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.md },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: FontSize.xs, color: C.textSecondary },
  });
}

function GraficoRosca({ data, size = 180, strokeWidth = 24, centerLabel, centerValue }: Props) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors, size);

  const total = data.reduce((acc, d) => acc + d.value, 0);
  if (total === 0) return null;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <View style={s.container}>
      <View style={s.svgContainer}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={Colors.border} strokeWidth={strokeWidth} fill="none" />
          {data.map((seg, i) => {
            const segLength = (seg.value / total) * circumference;
            const offset = circumference - segLength;
            const rotation = (accumulatedOffset / circumference) * 360 - 90;
            accumulatedOffset += segLength;
            return (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={seg.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${segLength} ${circumference - segLength}`}
                strokeDashoffset={0}
                transform={`rotate(${rotation}, ${size / 2}, ${size / 2})`}
                strokeLinecap="butt"
              />
            );
          })}
        </Svg>
        <View style={s.center}>
          {centerLabel && <Text style={s.centerLabel}>{centerLabel}</Text>}
          {centerValue && <Text style={s.centerValue}>{centerValue}</Text>}
        </View>
      </View>
      <View style={s.legend}>
        {data.slice(0, 6).map((seg, i) => (
          <View key={i} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: seg.color }]} />
            <Text style={s.legendText}>{seg.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default memo(GraficoRosca);

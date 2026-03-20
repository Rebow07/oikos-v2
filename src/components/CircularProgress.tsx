import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme, AppColors, FontSize, FontWeight } from '../theme';

interface Props {
  percent: number; // 0-100+
  size?: number;
  strokeWidth?: number;
  label?: string;
  color?: string;
}

function makeStyles(C: AppColors, size: number) {
  return StyleSheet.create({
    container: {
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center',
    },
    svgWrapper: {
      position: 'absolute',
    },
    labelContainer: {
      alignItems: 'center',
    },
    percent: {
      fontSize: FontSize.xl,
      fontWeight: FontWeight.bold,
      color: C.textPrimary,
    },
    label: {
      fontSize: FontSize.xs,
      color: C.textMuted,
      marginTop: 2,
    },
  });
}

function CircularProgress({
  percent,
  size = 100,
  strokeWidth = 8,
  label,
  color,
}: Props) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors, size);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(Math.max(percent, 0), 100);
  const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

  const progressColor = color
    || (percent > 100 ? Colors.despesa : percent > 80 ? '#F39C12' : Colors.renda);

  return (
    <View style={s.container}>
      <View style={s.svgWrapper}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={Colors.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90, ${size / 2}, ${size / 2})`}
          />
        </Svg>
      </View>
      <View style={s.labelContainer}>
        <Text style={s.percent}>{Math.round(percent)}%</Text>
        {label && <Text style={s.label}>{label}</Text>}
      </View>
    </View>
  );
}

export default memo(CircularProgress);

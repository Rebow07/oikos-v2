import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Icons from 'lucide-react-native';
import { CATEGORIAS, CATEGORIAS_RECEITA } from '../constants';

interface Props {
  categoria: string;
  size?: number;
  tipo?: 'despesa' | 'renda';
  corCustom?: string;
}

const ICON_MAP: Record<string, any> = {
  ShoppingBag: Icons.ShoppingBag,
  Utensils: Icons.Utensils,
  ShoppingCart: Icons.ShoppingCart,
  Car: Icons.Car,
  Fuel: Icons.Fuel,
  Home: Icons.Home,
  Heart: Icons.Heart,
  Gamepad2: Icons.Gamepad2,
  FileText: Icons.FileText,
  BookOpen: Icons.BookOpen,
  Plane: Icons.Plane,
  Sparkles: Icons.Sparkles,
  Smartphone: Icons.Smartphone,
  PawPrint: Icons.PawPrint,
  Gift: Icons.Gift,
  UtensilsCrossed: Icons.UtensilsCrossed,
  Dumbbell: Icons.Dumbbell,
  Tv: Icons.Tv,
  MoreHorizontal: Icons.MoreHorizontal,
  Briefcase: Icons.Briefcase,
  Laptop: Icons.Laptop,
  Building2: Icons.Building2,
  TrendingUp: Icons.TrendingUp,
  Users: Icons.Users,
  Plus: Icons.Plus,
};

function CategoriaIcon({ categoria, size = 36, tipo = 'despesa', corCustom }: Props) {
  const lista = tipo === 'renda' ? CATEGORIAS_RECEITA : CATEGORIAS;
  const cat = lista.find((c) => c.id === categoria);

  const iconName = cat?.icon || 'Tag';
  const cor = corCustom || cat?.cor || '#95A5A6';
  // Include Tag in icon map dynamically if not there
  const IconComponent = ICON_MAP[iconName] || Icons.Tag || Icons.MoreHorizontal;

  const iconSize = size * 0.5;

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: cor + '20',
        },
      ]}
    >
      <IconComponent size={iconSize} color={cor} strokeWidth={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default memo(CategoriaIcon);

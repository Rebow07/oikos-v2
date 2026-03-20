// src/constants/index.ts — Rebow Finance v2

export const APP_CONFIG = {
  DEFAULT_GRUPO_ID: process.env.EXPO_PUBLIC_DEFAULT_GRUPO_ID || '',
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
} as const;

export interface CategoriaItem {
  id: string;
  label: string;
  icon: string;
  cor: string;
}

export const CATEGORIAS: CategoriaItem[] = [
  { id: 'compras', label: 'Compras', icon: 'ShoppingBag', cor: '#8E44AD' },
  { id: 'comida', label: 'Comida', icon: 'Utensils', cor: '#E67E22' },
  { id: 'mercado', label: 'Mercado', icon: 'ShoppingCart', cor: '#27AE60' },
  { id: 'transporte', label: 'Transporte', icon: 'Car', cor: '#2980B9' },
  { id: 'combustivel', label: 'Combustível', icon: 'Fuel', cor: '#D35400' },
  { id: 'casa', label: 'Casa', icon: 'Home', cor: '#16A085' },
  { id: 'saude', label: 'Saúde', icon: 'Heart', cor: '#E74C3C' },
  { id: 'lazer', label: 'Lazer', icon: 'Gamepad2', cor: '#9B59B6' },
  { id: 'contas', label: 'Contas', icon: 'FileText', cor: '#2C3E50' },
  { id: 'educacao', label: 'Educação', icon: 'BookOpen', cor: '#1ABC9C' },
  { id: 'viagem', label: 'Viagem', icon: 'Plane', cor: '#3498DB' },
  { id: 'beleza', label: 'Beleza', icon: 'Sparkles', cor: '#E91E63' },
  { id: 'eletronicos', label: 'Eletrônicos', icon: 'Smartphone', cor: '#607D8B' },
  { id: 'pet', label: 'Pet', icon: 'PawPrint', cor: '#795548' },
  { id: 'presente', label: 'Presente', icon: 'Gift', cor: '#FF5722' },
  { id: 'restaurante', label: 'Restaurante', icon: 'UtensilsCrossed', cor: '#FF7043' },
  { id: 'academia', label: 'Academia', icon: 'Dumbbell', cor: '#26A69A' },
  { id: 'streaming', label: 'Streaming', icon: 'Tv', cor: '#7B1FA2' },
  { id: 'outros', label: 'Outros', icon: 'MoreHorizontal', cor: '#95A5A6' },
];

export const CATEGORIAS_RECEITA: CategoriaItem[] = [
  { id: 'salario', label: 'Salário', icon: 'Briefcase', cor: '#27AE60' },
  { id: 'freelance', label: 'Freelance', icon: 'Laptop', cor: '#2980B9' },
  { id: 'aluguel', label: 'Aluguel', icon: 'Building2', cor: '#8E44AD' },
  { id: 'investimento', label: 'Investimento', icon: 'TrendingUp', cor: '#F39C12' },
  { id: 'pensao', label: 'Pensão', icon: 'Users', cor: '#16A085' },
  { id: 'presente', label: 'Presente', icon: 'Gift', cor: '#E74C3C' },
  { id: 'outros', label: 'Outros', icon: 'Plus', cor: '#95A5A6' },
];

export const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

export const BANCOS = [
  { id: 'nubank', label: 'Nubank', cor: '#820AD1' },
  { id: 'inter', label: 'Inter', cor: '#FF7A00' },
  { id: 'itau', label: 'Itaú', cor: '#003399' },
  { id: 'bradesco', label: 'Bradesco', cor: '#CC092F' },
  { id: 'bb', label: 'Banco do Brasil', cor: '#FFEF00' },
  { id: 'caixa', label: 'Caixa', cor: '#005CA9' },
  { id: 'santander', label: 'Santander', cor: '#EC0000' },
  { id: 'c6', label: 'C6 Bank', cor: '#2A2A2A' },
  { id: 'picpay', label: 'PicPay', cor: '#21C25E' },
  { id: 'outro', label: 'Outro', cor: '#95A5A6' },
] as const;

// Cores de avatar para membros do grupo
export const AVATAR_COLORS = [
  '#c9a227',
  '#2980B9',
  '#E74C3C',
  '#27AE60',
  '#8E44AD',
  '#E67E22',
  '#1ABC9C',
  '#D35400',
] as const;

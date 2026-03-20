import { useThemeContext } from '../context/ThemeContext';

// ─── Color Tokens ────────────────────────────────────────────

export interface AppColors {
  // Brand
  primary: string;
  primaryDark: string;
  primaryLight: string;

  // Backgrounds
  background: string;
  surface: string;
  cardBg: string;
  cardDark: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  textOnCard: string;

  // Semantic
  despesa: string;
  despesaLight: string;
  renda: string;
  rendaLight: string;

  // Borders & Shadows
  border: string;
  borderStrong: string;
  divider: string;
  shadow: string;
  shadowMedium: string;
  overlay: string;

  // Category colors
  cat_compras: string;
  cat_comida: string;
  cat_mercado: string;
  cat_transporte: string;
  cat_combustivel: string;
  cat_casa: string;
  cat_saude: string;
  cat_lazer: string;
  cat_contas: string;
  cat_educacao: string;
  cat_viagem: string;
  cat_beleza: string;
  cat_eletronicos: string;
  cat_pet: string;
  cat_presente: string;
  cat_restaurante: string;
  cat_academia: string;
  cat_streaming: string;
  cat_outros: string;
}

export const LightColors: AppColors = {
  primary: '#FFD54F',
  primaryDark: '#FFC107',
  primaryLight: '#FFF8E1',

  background: '#FFFFFF',
  surface: '#FAFAFA',
  cardBg: '#F5F5F5',
  cardDark: '#1A1A1A',

  textPrimary: '#1A1A1A',
  textSecondary: '#555555',
  textMuted: '#999999',
  textInverse: '#FFFFFF',
  textOnCard: '#FFFFFF',

  despesa: '#E74C3C',
  despesaLight: '#FDEDEC',
  renda: '#27AE60',
  rendaLight: '#E8F8F0',

  border: '#EFEFEF',
  borderStrong: '#DDDDDD',
  divider: '#F0F0F0',
  shadow: 'rgba(0,0,0,0.06)',
  shadowMedium: 'rgba(0,0,0,0.12)',
  overlay: 'rgba(0,0,0,0.5)',

  cat_compras: '#8E44AD',
  cat_comida: '#E67E22',
  cat_mercado: '#27AE60',
  cat_transporte: '#2980B9',
  cat_combustivel: '#D35400',
  cat_casa: '#16A085',
  cat_saude: '#E74C3C',
  cat_lazer: '#9B59B6',
  cat_contas: '#2C3E50',
  cat_educacao: '#1ABC9C',
  cat_viagem: '#3498DB',
  cat_beleza: '#E91E63',
  cat_eletronicos: '#607D8B',
  cat_pet: '#795548',
  cat_presente: '#FF5722',
  cat_restaurante: '#FF7043',
  cat_academia: '#26A69A',
  cat_streaming: '#7B1FA2',
  cat_outros: '#95A5A6',
};

export const DarkColors: AppColors = {
  primary: '#c9a227',
  primaryDark: '#a8841a',
  primaryLight: '#2a2410',

  background: '#0f0f0d',
  surface: '#1a1a16',
  cardBg: '#1f1f1a',
  cardDark: '#252520',

  textPrimary: '#f0edd8',
  textSecondary: '#b0ad9a',
  textMuted: '#6b6960',
  textInverse: '#0f0f0d',
  textOnCard: '#f0edd8',

  despesa: '#e05c4a',
  despesaLight: '#2a1a17',
  renda: '#4caf7a',
  rendaLight: '#172a1e',

  border: '#2a2a24',
  borderStrong: '#3a3a32',
  divider: '#222220',
  shadow: 'rgba(0,0,0,0.3)',
  shadowMedium: 'rgba(0,0,0,0.5)',
  overlay: 'rgba(0,0,0,0.7)',

  cat_compras: '#A569BD',
  cat_comida: '#EB984E',
  cat_mercado: '#58D68D',
  cat_transporte: '#5DADE2',
  cat_combustivel: '#E67E22',
  cat_casa: '#48C9B0',
  cat_saude: '#EC7063',
  cat_lazer: '#BB8FCE',
  cat_contas: '#85929E',
  cat_educacao: '#76D7C4',
  cat_viagem: '#7FB3D8',
  cat_beleza: '#F06292',
  cat_eletronicos: '#90A4AE',
  cat_pet: '#A1887F',
  cat_presente: '#FF8A65',
  cat_restaurante: '#FF8A65',
  cat_academia: '#80CBC4',
  cat_streaming: '#CE93D8',
  cat_outros: '#B0BEC5',
};

// ─── Spacing ─────────────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ─── Font Sizes ──────────────────────────────────────────────

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 32,
} as const;

// ─── Font Weights (as string literals for RN) ───────────────

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

// ─── Border Radius ───────────────────────────────────────────

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

// ─── useTheme Hook ───────────────────────────────────────────

export function useTheme() {
  const { isDark, toggleTheme } = useThemeContext();
  const Colors = isDark ? DarkColors : LightColors;
  return { Colors, isDark, toggleTheme };
}

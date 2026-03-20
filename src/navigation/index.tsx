import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  LayoutDashboard, ArrowDownCircle, ArrowUpCircle, CreditCard, Building2, Repeat,
} from 'lucide-react-native';
import { useTheme, FontSize } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import AuthScreen from '../screens/AuthScreen';
import SplashScreen from '../screens/SplashScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DespesasScreen from '../screens/DespesasScreen';
import ReceitasScreen from '../screens/ReceitasScreen';
import RecorrentesScreen from '../screens/RecorrentesScreen';
import CartoesScreen from '../screens/CartoesScreen';
import BancosHomeScreen from '../screens/BancosHomeScreen';
import ConfiguracoesScreen from '../screens/ConfiguracoesScreen';

import NovaTransacaoScreen from '../screens/NovaTransacaoScreen';
import NovaReceitaScreen from '../screens/NovaReceitaScreen';
import DetalheTransacaoScreen from '../screens/DetalheTransacaoScreen';
import MetasScreen from '../screens/MetasScreen';
import ReservasScreen from '../screens/ReservasScreen';
import BalancoScreen from '../screens/BalancoScreen';
import RelatoriosScreen from '../screens/RelatoriosScreen';
import ImportarExtratoScreen from '../screens/ImportarExtratoScreen';
import MultiploGruposScreen from '../screens/MultiploGruposScreen';
import RelatorioEmailScreen from '../screens/RelatorioEmailScreen';
import BancoDetalheScreen from '../screens/BancoDetalheScreen';
import ComprasHomeScreen from '../screens/ComprasHomeScreen';
import TarefasHomeScreen from '../screens/TarefasHomeScreen';
import AgendaHomeScreen from '../screens/AgendaHomeScreen';

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Home: undefined;
  FinancasTab: undefined;
  ConfigTab: undefined;
  TarefasHome: undefined;
  AgendaHome: undefined;
  BancoDetalhe: { contaId: string; contaNome: string };
  ComprasHome: undefined;
  NovaDespesa: undefined;
  NovaReceita: undefined;
  DetalheTransacao: { transacaoId: string };
  Metas: undefined;
  Reservas: undefined;
  Balanco: undefined;
  Relatorios: undefined;
  ImportarExtrato: undefined;
  MultiploGrupos: undefined;
  RelatorioEmail: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function FinancasTabNavigator() {
  const { Colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 9, fontWeight: '600' },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen}
        options={{ tabBarLabel: 'Início', tabBarIcon: ({ color, size }) => <LayoutDashboard size={size - 2} color={color} /> }} />
      <Tab.Screen name="Despesas" component={DespesasScreen}
        options={{ tabBarIcon: ({ color, size }) => <ArrowDownCircle size={size - 2} color={color} /> }} />
      <Tab.Screen name="Receitas" component={ReceitasScreen}
        options={{ tabBarIcon: ({ color, size }) => <ArrowUpCircle size={size - 2} color={color} /> }} />
      <Tab.Screen name="Recorrentes" component={RecorrentesScreen}
        options={{ tabBarIcon: ({ color, size }) => <Repeat size={size - 2} color={color} /> }} />
      <Tab.Screen name="Cartoes" component={CartoesScreen}
        options={{ tabBarLabel: 'Cartões', tabBarIcon: ({ color, size }) => <CreditCard size={size - 2} color={color} /> }} />
      <Tab.Screen name="Bancos" component={BancosHomeScreen}
        options={{ tabBarIcon: ({ color, size }) => <Building2 size={size - 2} color={color} /> }} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { Colors } = useTheme();
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background }, animation: 'slide_from_right' }}>
        <Stack.Screen name="Splash" component={SplashScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Auth" component={AuthScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="FinancasTab" component={FinancasTabNavigator} />
        <Stack.Screen name="ConfigTab" component={ConfiguracoesScreen} />
        <Stack.Screen name="TarefasHome" component={TarefasHomeScreen} />
        <Stack.Screen name="AgendaHome" component={AgendaHomeScreen} />
        <Stack.Screen name="BancoDetalhe" component={BancoDetalheScreen} />
        <Stack.Screen name="ComprasHome" component={ComprasHomeScreen} />
        <Stack.Group screenOptions={{ presentation: 'modal', animation: 'slide_from_bottom' }}>
          <Stack.Screen name="NovaDespesa" component={NovaTransacaoScreen} />
          <Stack.Screen name="NovaReceita" component={NovaReceitaScreen} />
          <Stack.Screen name="DetalheTransacao" component={DetalheTransacaoScreen} />
          <Stack.Screen name="Metas" component={MetasScreen} />
          <Stack.Screen name="Reservas" component={ReservasScreen} />
          <Stack.Screen name="Balanco" component={BalancoScreen} />
          <Stack.Screen name="Relatorios" component={RelatoriosScreen} />
          <Stack.Screen name="ImportarExtrato" component={ImportarExtratoScreen} />
          <Stack.Screen name="MultiploGrupos" component={MultiploGruposScreen} />
          <Stack.Screen name="RelatorioEmail" component={RelatorioEmailScreen} />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

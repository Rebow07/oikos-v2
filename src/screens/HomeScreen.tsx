import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wallet, ListTodo, CalendarDays, Settings, Users, ChevronRight } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    header: { paddingTop: Spacing.md, paddingBottom: Spacing.lg },
    greeting: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: C.textPrimary },
    subtitle: { fontSize: FontSize.md, color: C.textSecondary, marginTop: 4 },
    membrosChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary + '15', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, alignSelf: 'flex-start', marginTop: Spacing.md },
    membrosText: { fontSize: FontSize.sm, color: C.primary, fontWeight: FontWeight.bold },
    sectionTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: Spacing.md, marginTop: Spacing.lg },
    moduleCard: { backgroundColor: C.surface, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    moduleIconBg: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    moduleInfo: { flex: 1 },
    moduleTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: C.textPrimary },
    moduleDesc: { fontSize: FontSize.sm, color: C.textMuted, marginTop: 2 },
  });
}

export default function HomeScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { nomeUsuario, qtdMembros, grupo } = useApp();

  const modules = [
    { title: 'Finanças', desc: 'Despesas, receitas, cartões, bancos, compras', icon: Wallet, color: '#c9a227', route: 'FinancasTab' },
    { title: 'Tarefas e Notas', desc: 'Lista compartilhada com o grupo', icon: ListTodo, color: '#8E44AD', route: 'TarefasHome' },
    { title: 'Agenda', desc: 'Compromissos familiares', icon: CalendarDays, color: '#E74C3C', route: 'AgendaHome' },
  ];

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.greeting}>Olá, {nomeUsuario || 'Usuário'}</Text>
          <Text style={s.subtitle}>{grupo?.nome || 'Minha Família'}</Text>
          <View style={s.membrosChip}>
            <Users size={14} color={Colors.primary} />
            <Text style={s.membrosText}>{qtdMembros} membro{qtdMembros !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>Módulos</Text>
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <TouchableOpacity key={mod.route} style={s.moduleCard} onPress={() => navigation.navigate(mod.route)} activeOpacity={0.7}>
              <View style={[s.moduleIconBg, { backgroundColor: mod.color + '18' }]}><Icon size={26} color={mod.color} /></View>
              <View style={s.moduleInfo}><Text style={s.moduleTitle}>{mod.title}</Text><Text style={s.moduleDesc}>{mod.desc}</Text></View>
              <ChevronRight size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          );
        })}

        <Text style={s.sectionTitle}>Configurações</Text>
        <TouchableOpacity style={s.moduleCard} onPress={() => navigation.navigate('ConfigTab')} activeOpacity={0.7}>
          <View style={[s.moduleIconBg, { backgroundColor: Colors.textMuted + '18' }]}><Settings size={26} color={Colors.textMuted} /></View>
          <View style={s.moduleInfo}><Text style={s.moduleTitle}>Configurações</Text><Text style={s.moduleDesc}>Perfil, grupo, tema</Text></View>
          <ChevronRight size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

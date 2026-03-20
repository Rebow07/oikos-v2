import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Switch,
  Alert,
  Clipboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  Users,
  Copy,
  Moon,
  Sun,
  LogOut,
  DollarSign,
  Mail,
  Bell,
  ChevronRight,
  Layers,
} from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabase';
import { corAvatar, iniciais } from '../utils';
import type { Membro } from '../types';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: C.textPrimary, marginBottom: Spacing.lg },
    section: { marginBottom: Spacing.lg },
    sectionTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm },
    card: { backgroundColor: C.surface, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    rowLast: { borderBottomWidth: 0 },
    rowIcon: { width: 32, alignItems: 'center', marginRight: Spacing.md },
    rowContent: { flex: 1 },
    rowLabel: { fontSize: FontSize.md, color: C.textPrimary },
    rowSub: { fontSize: FontSize.xs, color: C.textMuted, marginTop: 2 },
    rowRight: { marginLeft: Spacing.sm },
    rowValue: { fontSize: FontSize.md, color: C.textSecondary },
    // Members
    memberRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    memberAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    memberInitials: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#FFFFFF' },
    memberName: { fontSize: FontSize.md, color: C.textPrimary, flex: 1 },
    memberEmail: { fontSize: FontSize.xs, color: C.textMuted },
    // Budget input
    budgetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    budgetInput: { flex: 1, backgroundColor: C.background, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    budgetBtn: { backgroundColor: C.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm },
    budgetBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: C.textInverse },
    // Name input
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
    nameInput: { flex: 1, backgroundColor: C.background, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    // Logout
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: C.despesa + '12', borderRadius: Radius.md, paddingVertical: Spacing.md, marginTop: Spacing.lg },
    logoutText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.despesa },
    version: { fontSize: FontSize.xs, color: C.textMuted, textAlign: 'center', marginTop: Spacing.lg },
  });
}

export default function ConfiguracoesScreen({ navigation }: any) {
  const { Colors, isDark, toggleTheme } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const {
    usuario,
    grupo,
    membros,
    nomeUsuario,
    setNomeUsuario,
    orcamentoMensal,
    setOrcamentoMensal,
    sair,
    grupoId,
  } = useApp();

  const [nomeEdit, setNomeEdit] = useState(nomeUsuario);
  const [orcEdit, setOrcEdit] = useState(String(orcamentoMensal || ''));
  const [salvandoNome, setSalvandoNome] = useState(false);

  const handleSalvarNome = useCallback(async () => {
    if (!nomeEdit.trim()) return;
    setSalvandoNome(true);
    try {
      await supabase.rpc('atualizar_nome_membro', {
        p_user_id: usuario.id,
        p_grupo_id: grupoId,
        p_nome: nomeEdit.trim(),
      });
      setNomeUsuario(nomeEdit.trim());
      Alert.alert('Pronto', 'Nome atualizado.');
    } catch {
      Alert.alert('Erro', 'Falha ao atualizar nome.');
    } finally {
      setSalvandoNome(false);
    }
  }, [nomeEdit, usuario, grupoId, setNomeUsuario]);

  const handleSalvarOrcamento = useCallback(() => {
    const val = parseFloat(orcEdit.replace(',', '.'));
    if (isNaN(val) || val < 0) { Alert.alert('Erro', 'Valor inválido.'); return; }
    setOrcamentoMensal(val);
    Alert.alert('Pronto', 'Orçamento atualizado.');
  }, [orcEdit, setOrcamentoMensal]);

  const handleCopiarCodigo = useCallback(() => {
    if (grupo?.codigo_convite) {
      Clipboard.setString(grupo.codigo_convite);
      Alert.alert('Copiado!', 'Código de convite copiado para a área de transferência.');
    }
  }, [grupo]);

  const handleLogout = useCallback(() => {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => {
        await sair();
        navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
      }},
    ]);
  }, [sair, navigation]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: Spacing.md }}>
            <Text style={{ fontSize: FontSize.md, color: Colors.primary, fontWeight: FontWeight.bold }}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={[s.title, { marginBottom: 0 }]}>Configurações</Text>
        </View>

        {/* Perfil */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Perfil</Text>
          <View style={s.card}>
            <View style={s.row}>
              <View style={s.rowIcon}><User size={18} color={Colors.textMuted} /></View>
              <View style={s.rowContent}>
                <Text style={s.rowLabel}>Email</Text>
                <Text style={s.rowSub}>{usuario?.email || '—'}</Text>
              </View>
            </View>
            <View style={s.nameRow}>
              <View style={s.rowIcon}><User size={18} color={Colors.primary} /></View>
              <TextInput
                style={s.nameInput}
                value={nomeEdit}
                onChangeText={setNomeEdit}
                placeholder="Seu nome no grupo"
                placeholderTextColor={Colors.textMuted}
              />
              <TouchableOpacity style={s.budgetBtn} onPress={handleSalvarNome} disabled={salvandoNome}>
                <Text style={s.budgetBtnText}>{salvandoNome ? '...' : 'Salvar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Grupo */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Grupo</Text>
          <View style={s.card}>
            <View style={s.row}>
              <View style={s.rowIcon}><Users size={18} color={Colors.textMuted} /></View>
              <View style={s.rowContent}>
                <Text style={s.rowLabel}>{grupo?.nome || 'Meu Grupo'}</Text>
                <Text style={s.rowSub}>{membros.length} membro(s)</Text>
              </View>
            </View>

            {/* Membros */}
            {membros.map((m: Membro, idx: number) => (
              <View key={m.user_id} style={[s.memberRow, idx === membros.length - 1 && s.rowLast]}>
                <View style={[s.memberAvatar, { backgroundColor: corAvatar(idx) }]}>
                  <Text style={s.memberInitials}>{iniciais(m.nome)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.memberName}>{m.nome}</Text>
                  {m.email && <Text style={s.memberEmail}>{m.email}</Text>}
                </View>
              </View>
            ))}

            {/* Código convite */}
            <TouchableOpacity style={[s.row, s.rowLast]} onPress={handleCopiarCodigo}>
              <View style={s.rowIcon}><Copy size={18} color={Colors.primary} /></View>
              <View style={s.rowContent}>
                <Text style={s.rowLabel}>Código de convite</Text>
                <Text style={s.rowSub}>{grupo?.codigo_convite || '—'}</Text>
              </View>
              <Copy size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Orçamento */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Orçamento mensal</Text>
          <View style={s.card}>
            <View style={[s.row, s.rowLast]}>
              <View style={s.rowIcon}><DollarSign size={18} color={Colors.primary} /></View>
              <View style={[s.budgetRow, { flex: 1 }]}>
                <TextInput
                  style={s.budgetInput}
                  value={orcEdit}
                  onChangeText={setOrcEdit}
                  placeholder="0,00"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity style={s.budgetBtn} onPress={handleSalvarOrcamento}>
                  <Text style={s.budgetBtnText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Aparência */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Aparência</Text>
          <View style={s.card}>
            <View style={[s.row, s.rowLast]}>
              <View style={s.rowIcon}>
                {isDark ? <Moon size={18} color={Colors.primary} /> : <Sun size={18} color={Colors.primary} />}
              </View>
              <View style={s.rowContent}>
                <Text style={s.rowLabel}>Tema escuro</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
                thumbColor={isDark ? Colors.primary : Colors.textMuted}
              />
            </View>
          </View>
        </View>

        {/* Atalhos */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Mais</Text>
          <View style={s.card}>
            <TouchableOpacity style={s.row} onPress={() => navigation.navigate('MultiploGrupos')}>
              <View style={s.rowIcon}><Layers size={18} color={Colors.textMuted} /></View>
              <View style={s.rowContent}><Text style={s.rowLabel}>Múltiplos grupos</Text></View>
              <ChevronRight size={18} color={Colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={s.row} onPress={() => navigation.navigate('RelatorioEmail')}>
              <View style={s.rowIcon}><Mail size={18} color={Colors.textMuted} /></View>
              <View style={s.rowContent}><Text style={s.rowLabel}>Relatório por email</Text></View>
              <ChevronRight size={18} color={Colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.row, s.rowLast]} onPress={() => Alert.alert('Notificações', 'As notificações push e captura de notificações bancárias serão ativadas no build de produção (eas build). No Expo Go essa funcionalidade não está disponível.')}>
              <View style={s.rowIcon}><Bell size={18} color={Colors.textMuted} /></View>
              <View style={s.rowContent}>
                <Text style={s.rowLabel}>Notificações</Text>
                <Text style={s.rowSub}>Disponível no build de produção</Text>
              </View>
              <ChevronRight size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color={Colors.despesa} />
          <Text style={s.logoutText}>Sair da conta</Text>
        </TouchableOpacity>

        <Text style={s.version}>Rebow Finance v2.0.0</Text>
      </ScrollView>
    </View>
  );
}

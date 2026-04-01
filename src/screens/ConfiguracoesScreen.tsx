import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Switch, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User, Copy, Moon, Sun, LogOut, DollarSign, Mail, Bell, ChevronRight,
  Layers, Upload, BarChart3, Cloud, CloudOff, Tag, GitFork,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { useSyncStatus } from '../database/sync/SyncContext';
import { corAvatar, iniciais } from '../utils';
import { toast } from '../utils/toast';
import * as ExpoClipboard from 'expo-clipboard';

function makeStylesConfig(C: AppColors) {
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
    memberRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    memberAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
    memberInitials: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#FFFFFF' },
    memberName: { fontSize: FontSize.md, color: C.textPrimary, flex: 1 },
    memberYou: { fontSize: FontSize.xs, color: C.primary, fontWeight: FontWeight.bold },
    budgetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    budgetInput: { flex: 1, backgroundColor: C.background, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    budgetBtn: { backgroundColor: C.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.sm },
    budgetBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: C.textInverse },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
    nameInput: { flex: 1, backgroundColor: C.background, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.md, color: C.textPrimary, borderWidth: 1, borderColor: C.border },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: C.despesa + '12', borderRadius: Radius.md, paddingVertical: Spacing.md, marginTop: Spacing.lg },
    logoutText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.despesa },
    version: { fontSize: FontSize.xs, color: C.textMuted, textAlign: 'center', marginTop: Spacing.lg },
    // Sync indicator
    syncCard: { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, marginBottom: Spacing.lg },
    syncDot: { width: 10, height: 10, borderRadius: 5, marginRight: Spacing.sm },
    syncInfo: { flex: 1 },
    syncTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
    syncSub: { fontSize: FontSize.xs, color: C.textMuted, marginTop: 1 },
    syncBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
    badge: { backgroundColor: C.despesa, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, marginLeft: Spacing.sm },
    badgeText: { fontSize: 10, fontWeight: FontWeight.bold, color: '#FFFFFF' },
  });
}

const NOTIF_KEY = '@rebow_notificacoes_ativas';

export default function ConfiguracoesScreen({ navigation }: any) {
  const { Colors, isDark, toggleTheme } = useTheme();
  const s = useMemo(() => makeStylesConfig(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { usuario, grupo, membros, nomeUsuario, setNomeUsuario, orcamentoMensal, setOrcamentoMensal, sair } = useApp();
  const { isOnline, isSyncing, pendingCount, lastSyncAt, syncNow } = useSyncStatus();

  const [nomeEdit, setNomeEdit] = useState(nomeUsuario);
  const [orcEdit, setOrcEdit]   = useState(String(orcamentoMensal || ''));
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [notifAtivas, setNotifAtivas] = useState(false);

  // Carregar estado salvo de notificações
  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then((v) => { if (v === 'true') setNotifAtivas(true); });
  }, []);

  const handleToggleNotif = useCallback(async (valor: boolean) => {
    if (valor) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão negada',
          'Para receber notificações, habilite nas Configurações do dispositivo.',
          [{ text: 'OK' }],
        );
        return;
      }
      setNotifAtivas(true);
      await AsyncStorage.setItem(NOTIF_KEY, 'true');
      toast.ok('Notificações ativadas!');
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      setNotifAtivas(false);
      await AsyncStorage.setItem(NOTIF_KEY, 'false');
      toast.ok('Notificações desativadas.');
    }
  }, []);

  const handleSalvarNome = useCallback(async () => {
    if (!nomeEdit.trim()) return;
    setSalvandoNome(true);
    try {
      await setNomeUsuario(nomeEdit.trim());
      toast.ok('Nome atualizado!');
    } catch (err: any) {
      toast.erro('Falha ao atualizar nome.');
    } finally { setSalvandoNome(false); }
  }, [nomeEdit, setNomeUsuario]);

  const handleSalvarOrcamento = useCallback(() => {
    const val = parseFloat(orcEdit.replace(',', '.'));
    if (isNaN(val) || val < 0) { toast.aviso('Valor inválido.'); return; }
    setOrcamentoMensal(val);
    toast.ok('Orçamento atualizado!');
  }, [orcEdit, setOrcamentoMensal]);

  const handleCopiarCodigo = useCallback(() => {
    if (grupo?.codigo_convite) {
      ExpoClipboard.setStringAsync(grupo.codigo_convite);
      toast.ok('Código copiado!');
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

  const formatLastSync = (iso: string | null) => {
    if (!iso) return 'Nunca';
    const d = new Date(iso);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return 'Agora mesmo';
    if (diffMin < 60) return `${diffMin} min atrás`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h atrás`;
    return d.toLocaleDateString('pt-BR');
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: Spacing.md }}>
            <Text style={{ fontSize: FontSize.md, color: Colors.primary, fontWeight: FontWeight.bold }}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={[s.title, { marginBottom: 0 }]}>Configurações</Text>
        </View>

        {/* ── Sync Status ──────────────────────────────────────── */}
        <TouchableOpacity style={s.syncCard} onPress={syncNow} activeOpacity={0.7}>
          <View style={[s.syncDot, { backgroundColor: isOnline ? '#2ECC71' : Colors.despesa }]} />
          <View style={s.syncInfo}>
            <Text style={[s.syncTitle, { color: isOnline ? '#2ECC71' : Colors.despesa }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Text style={s.syncSub}>
              {isSyncing ? 'Sincronizando...' : `Último sync: ${formatLastSync(lastSyncAt)}`}
            </Text>
          </View>
          {pendingCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{pendingCount}</Text>
            </View>
          )}
          {isSyncing ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: Spacing.sm }} />
          ) : (
            <View style={s.syncBtn}>
              {isOnline ? <Cloud size={18} color={Colors.primary} /> : <CloudOff size={18} color={Colors.textMuted} />}
            </View>
          )}
        </TouchableOpacity>

        {/* ── Perfil ───────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Perfil</Text>
          <View style={s.card}>
            <View style={s.row}>
              <View style={s.rowIcon}><User size={18} color={Colors.textMuted} /></View>
              <View style={s.rowContent}><Text style={s.rowLabel}>Email</Text><Text style={s.rowSub}>{usuario?.email || '—'}</Text></View>
            </View>
            <View style={s.nameRow}>
              <View style={s.rowIcon}><User size={18} color={Colors.primary} /></View>
              <TextInput style={s.nameInput} value={nomeEdit} onChangeText={setNomeEdit} placeholder="Seu nome" placeholderTextColor={Colors.textMuted} />
              <TouchableOpacity style={s.budgetBtn} onPress={handleSalvarNome} disabled={salvandoNome}>
                <Text style={s.budgetBtnText}>{salvandoNome ? '...' : 'Salvar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Grupo + Membros ──────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Grupo</Text>
          <View style={s.card}>
            <TouchableOpacity style={s.row} onPress={() => navigation.navigate('MultiploGrupos')}>
              <View style={s.rowIcon}><Layers size={18} color={Colors.primary} /></View>
              <View style={s.rowContent}>
                <Text style={s.rowLabel}>{grupo?.nome || 'Meu Grupo'}</Text>
                <Text style={s.rowSub}>Trocar grupo</Text>
              </View>
              <ChevronRight size={16} color={Colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={s.row} onPress={handleCopiarCodigo}>
              <View style={s.rowIcon}><Copy size={18} color={Colors.primary} /></View>
              <View style={s.rowContent}><Text style={s.rowLabel}>Código de convite</Text><Text style={s.rowSub}>{grupo?.codigo_convite || '—'}</Text></View>
              <Copy size={16} color={Colors.textMuted} />
            </TouchableOpacity>
            {/* Lista de membros */}
            {membros.map((m, idx) => (
              <View key={m.id} style={[s.memberRow, idx === membros.length - 1 && s.rowLast]}>
                <View style={[s.memberAvatar, { backgroundColor: corAvatar(idx) }]}>
                  <Text style={s.memberInitials}>{iniciais(m.nome)}</Text>
                </View>
                <Text style={s.memberName}>{m.nome}</Text>
                {m.user_id === usuario?.id && <Text style={s.memberYou}>Você</Text>}
              </View>
            ))}
          </View>
        </View>

        {/* ── Orçamento mensal ─────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Orçamento mensal</Text>
          <View style={s.card}>
            <View style={[s.row, s.rowLast]}>
              <View style={s.rowIcon}><DollarSign size={18} color={Colors.primary} /></View>
              <View style={[s.budgetRow, { flex: 1 }]}>
                <TextInput style={s.budgetInput} value={orcEdit} onChangeText={setOrcEdit} placeholder="0,00" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
                <TouchableOpacity style={s.budgetBtn} onPress={handleSalvarOrcamento}><Text style={s.budgetBtnText}>Salvar</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* ── Ferramentas ──────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Ferramentas</Text>
          <View style={s.card}>
            <TouchableOpacity style={s.row} onPress={() => navigation.navigate('RelatorioEmail')}>
              <View style={s.rowIcon}><Mail size={18} color={Colors.primary} /></View>
              <View style={s.rowContent}><Text style={s.rowLabel}>Relatório por Email</Text><Text style={s.rowSub}>Enviar resumo mensal</Text></View>
              <ChevronRight size={16} color={Colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={s.row} onPress={() => navigation.navigate('Relatorios')}>
              <View style={s.rowIcon}><BarChart3 size={18} color={Colors.primary} /></View>
              <View style={s.rowContent}><Text style={s.rowLabel}>Relatórios</Text><Text style={s.rowSub}>Gráficos e análises</Text></View>
              <ChevronRight size={16} color={Colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.row, s.rowLast]} onPress={() => navigation.navigate('ImportarExtrato')}>
              <View style={s.rowIcon}><Upload size={18} color={Colors.primary} /></View>
              <View style={s.rowContent}><Text style={s.rowLabel}>Importar Extrato</Text><Text style={s.rowSub}>CSV com categorização IA</Text></View>
              <ChevronRight size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Personalização ───────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Personalização</Text>
          <View style={s.card}>
            <TouchableOpacity style={s.row} onPress={() => navigation.navigate('CategoriasCustom')}>
              <View style={s.rowIcon}><Tag size={18} color={Colors.primary} /></View>
              <View style={s.rowContent}><Text style={s.rowLabel}>Categorias Custom</Text><Text style={s.rowSub}>Criar suas próprias categorias</Text></View>
              <ChevronRight size={16} color={Colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.row, s.rowLast]} onPress={() => navigation.navigate('SplitDespesa')}>
              <View style={s.rowIcon}><GitFork size={18} color={Colors.primary} /></View>
              <View style={s.rowContent}><Text style={s.rowLabel}>Split de Despesa</Text><Text style={s.rowSub}>Dividir despesa entre membros</Text></View>
              <ChevronRight size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Aparência & Notificações ─────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Aparência & Notificações</Text>
          <View style={s.card}>
            <View style={s.row}>
              <View style={s.rowIcon}>{isDark ? <Moon size={18} color={Colors.primary} /> : <Sun size={18} color={Colors.primary} />}</View>
              <View style={s.rowContent}><Text style={s.rowLabel}>Tema escuro</Text></View>
              <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: Colors.border, true: Colors.primary + '80' }} thumbColor={isDark ? Colors.primary : Colors.textMuted} />
            </View>
            <View style={[s.row, s.rowLast]}>
              <View style={s.rowIcon}><Bell size={18} color={notifAtivas ? Colors.primary : Colors.textMuted} /></View>
              <View style={s.rowContent}>
                <Text style={s.rowLabel}>Notificações push</Text>
                <Text style={s.rowSub}>{notifAtivas ? 'Ativas — lembretes e alertas' : 'Desativadas'}</Text>
              </View>
              <Switch
                value={notifAtivas}
                onValueChange={handleToggleNotif}
                trackColor={{ false: Colors.border, true: Colors.primary + '80' }}
                thumbColor={notifAtivas ? Colors.primary : Colors.textMuted}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color={Colors.despesa} />
          <Text style={s.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
        <Text style={s.version}>Oikos Family v2.9.0</Text>
      </ScrollView>
    </View>
  );
}
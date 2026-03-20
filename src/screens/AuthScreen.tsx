import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, Hash, Eye, EyeOff, ArrowRight, Users, Plus } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabase';

function makeStyles(C: AppColors, isDark: boolean) {
  const bg = isDark ? '#000000' : '#FFFFFF';
  const text = isDark ? '#FFFFFF' : '#000000';
  const textSub = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
  const cardBg = isDark ? '#111111' : '#F5F5F5';
  const inputBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const inputBorder = isDark ? '#2A2A2A' : '#E0E0E0';
  const accent = isDark ? '#FFFFFF' : '#000000';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: bg },
    scroll: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
    logoContainer: { alignItems: 'center', paddingTop: Spacing.xxl, paddingBottom: Spacing.xl },
    logoName: { fontSize: 48, fontWeight: '800', color: text, letterSpacing: 14 },
    logoSub: { fontSize: 13, fontWeight: '300', color: textSub, letterSpacing: 8, marginTop: 6 },
    logoLine: { width: 40, height: 1.5, backgroundColor: textSub, marginTop: 16, borderRadius: 1 },
    card: { backgroundColor: cardBg, borderRadius: Radius.xl, padding: Spacing.lg },
    tabRow: { flexDirection: 'row', marginBottom: Spacing.xl, backgroundColor: isDark ? '#0A0A0A' : '#E8E8E8', borderRadius: Radius.full, overflow: 'hidden' },
    tab: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.full },
    tabActive: { backgroundColor: accent },
    tabText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: textSub },
    tabTextActive: { color: isDark ? '#000000' : '#FFFFFF' },
    label: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: textSub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.xs, marginTop: Spacing.lg },
    inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: inputBg, borderRadius: Radius.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: inputBorder },
    inputRowFocused: { borderColor: accent },
    inputIcon: { marginRight: Spacing.sm },
    input: { flex: 1, paddingVertical: Spacing.md, fontSize: FontSize.md, color: text },
    eyeBtn: { padding: Spacing.xs },
    groupLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: textSub, textTransform: 'uppercase', letterSpacing: 1, marginTop: Spacing.xl, marginBottom: Spacing.sm },
    groupTabRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    groupTab: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center', borderRadius: Radius.md, borderWidth: 1, borderColor: inputBorder },
    groupTabActive: { backgroundColor: accent + '12', borderColor: accent },
    groupTabText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: textSub },
    groupTabTextActive: { color: text },
    hintBox: { backgroundColor: accent + '08', borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md, flexDirection: 'row', gap: Spacing.sm },
    hintText: { fontSize: FontSize.sm, color: textSub, flex: 1 },
    hintBold: { fontWeight: FontWeight.bold, color: text },
    submitBtn: { backgroundColor: accent, borderRadius: Radius.lg, paddingVertical: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.xl },
    submitBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: isDark ? '#000000' : '#FFFFFF' },
    errorText: { fontSize: FontSize.sm, color: '#E74C3C', textAlign: 'center', marginTop: Spacing.md },
  });
}

type Modo = 'login' | 'cadastro';
type GrupoModo = 'entrar' | 'criar';

export default function AuthScreen({ navigation }: any) {
  const { Colors, isDark } = useTheme();
  const s = makeStyles(Colors, isDark);
  const insets = useSafeAreaInsets();
  const { usuario, carregandoAuth } = useApp();

  const [modo, setModo] = useState<Modo>('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [nome, setNome] = useState('');
  const [grupoModo, setGrupoModo] = useState<GrupoModo>('entrar');
  const [codigoGrupo, setCodigoGrupo] = useState('');
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [focusField, setFocusField] = useState('');

  const logoFade = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoFade, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!carregandoAuth && usuario) {
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    }
  }, [carregandoAuth, usuario, navigation]);

  if (carregandoAuth) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={isDark ? '#FFF' : '#000'} />
      </View>
    );
  }

  const iconColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)';

  const handleAuth = async () => {
    setErro('');
    if (!email.trim() || !senha.trim()) { setErro('Preencha email e senha.'); return; }
    if (modo === 'cadastro') {
      if (!nome.trim()) { setErro('Informe seu nome.'); return; }
      if (senha.length < 6) { setErro('Senha: mínimo 6 caracteres.'); return; }
      if (senha !== confirmarSenha) { setErro('As senhas não conferem.'); return; }
      if (grupoModo === 'entrar' && !codigoGrupo.trim()) { setErro('Informe o código do grupo.'); return; }
      if (grupoModo === 'criar' && !nomeGrupo.trim()) { setErro('Informe o nome do grupo.'); return; }
    }
    setLoading(true);
    try {
      if (modo === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
        if (error) throw error;
      } else {
        // 1. Criar conta
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: { data: { nome: nome.trim() } },
        });
        if (signUpError) throw signUpError;
        const userId = signUpData.user?.id;
        if (!userId) throw new Error('Erro ao criar conta.');

        let targetGrupoId: string;

        if (grupoModo === 'entrar') {
          // 2a. Validar grupo + limite de membros via RPC
          const { data: validacao, error: valErr } = await supabase
            .rpc('validar_entrada_grupo', { p_codigo: codigoGrupo.trim() });
          if (valErr) throw new Error('Erro ao validar grupo.');
          if (!validacao?.ok) throw new Error(validacao?.erro || 'Código de grupo inválido.');
          targetGrupoId = validacao.grupo_id;
        } else {
          // 2b. Criar novo grupo
          const { data: novoGrupo, error: grupoErr } = await supabase
            .from('grupos')
            .insert({ nome: nomeGrupo.trim() })
            .select()
            .single();
          if (grupoErr || !novoGrupo) throw new Error('Erro ao criar grupo.');
          targetGrupoId = novoGrupo.id;
        }

        // 3. Inserir membro via RPC (SECURITY DEFINER - bypassa RLS)
        const { error: membroErr } = await supabase
          .rpc('criar_membro_cadastro', {
            p_user_id: userId,
            p_grupo_id: targetGrupoId,
            p_nome: nome.trim(),
          });
        if (membroErr) {
          console.error('Erro ao vincular membro:', membroErr);
          throw new Error('Conta criada, mas erro ao entrar no grupo. Faça login e tente novamente.');
        }
      }
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (err: any) {
      const msg = err.message?.includes('Invalid login')
        ? 'Email ou senha incorretos.'
        : err.message?.includes('already registered')
        ? 'Email já cadastrado.'
        : err.message || 'Erro desconhecido.';
      setErro(msg);
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingTop: insets.top }]} keyboardShouldPersistTaps="handled">
        <Animated.View style={[s.logoContainer, { opacity: logoFade, transform: [{ scale: logoScale }] }]}>
          <Text style={s.logoName}>OIKOS</Text>
          <Text style={s.logoSub}>FAMILY</Text>
          <View style={s.logoLine} />
        </Animated.View>

        <View style={s.card}>
          <View style={s.tabRow}>
            <TouchableOpacity style={[s.tab, modo === 'login' && s.tabActive]} onPress={() => { setModo('login'); setErro(''); }}>
              <Text style={[s.tabText, modo === 'login' && s.tabTextActive]}>Entrar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.tab, modo === 'cadastro' && s.tabActive]} onPress={() => { setModo('cadastro'); setErro(''); }}>
              <Text style={[s.tabText, modo === 'cadastro' && s.tabTextActive]}>Criar conta</Text>
            </TouchableOpacity>
          </View>

          {modo === 'cadastro' && (
            <><Text style={s.label}>Nome</Text>
            <View style={[s.inputRow, focusField === 'nome' && s.inputRowFocused]}>
              <Users size={18} color={iconColor} style={s.inputIcon} />
              <TextInput style={s.input} placeholder="Seu nome" placeholderTextColor={iconColor} value={nome} onChangeText={setNome} autoCapitalize="words" onFocus={() => setFocusField('nome')} onBlur={() => setFocusField('')} />
            </View></>
          )}

          <Text style={s.label}>Email</Text>
          <View style={[s.inputRow, focusField === 'email' && s.inputRowFocused]}>
            <Mail size={18} color={iconColor} style={s.inputIcon} />
            <TextInput style={s.input} placeholder="seu@email.com" placeholderTextColor={iconColor} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} onFocus={() => setFocusField('email')} onBlur={() => setFocusField('')} />
          </View>

          <Text style={s.label}>Senha</Text>
          <View style={[s.inputRow, focusField === 'senha' && s.inputRowFocused]}>
            <Lock size={18} color={iconColor} style={s.inputIcon} />
            <TextInput style={s.input} placeholder={modo === 'cadastro' ? 'Mínimo 6 caracteres' : '••••••••'} placeholderTextColor={iconColor} value={senha} onChangeText={setSenha} secureTextEntry={!showSenha} onFocus={() => setFocusField('senha')} onBlur={() => setFocusField('')} />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowSenha(!showSenha)}>
              {showSenha ? <EyeOff size={18} color={iconColor} /> : <Eye size={18} color={iconColor} />}
            </TouchableOpacity>
          </View>

          {modo === 'cadastro' && (
            <>
              <Text style={s.label}>Confirmar senha</Text>
              <View style={[s.inputRow, focusField === 'confirmar' && s.inputRowFocused]}>
                <Lock size={18} color={iconColor} style={s.inputIcon} />
                <TextInput style={s.input} placeholder="Repita a senha" placeholderTextColor={iconColor} value={confirmarSenha} onChangeText={setConfirmarSenha} secureTextEntry={!showSenha} onFocus={() => setFocusField('confirmar')} onBlur={() => setFocusField('')} />
              </View>

              <Text style={s.groupLabel}>Grupo familiar</Text>
              <View style={s.groupTabRow}>
                <TouchableOpacity style={[s.groupTab, grupoModo === 'entrar' && s.groupTabActive]} onPress={() => setGrupoModo('entrar')}>
                  <Text style={[s.groupTabText, grupoModo === 'entrar' && s.groupTabTextActive]}>Entrar em grupo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.groupTab, grupoModo === 'criar' && s.groupTabActive]} onPress={() => setGrupoModo('criar')}>
                  <Text style={[s.groupTabText, grupoModo === 'criar' && s.groupTabTextActive]}>Criar novo grupo</Text>
                </TouchableOpacity>
              </View>

              {grupoModo === 'entrar' ? (
                <>
                  <Text style={s.label}>Código do grupo</Text>
                  <View style={[s.inputRow, focusField === 'codigo' && s.inputRowFocused]}>
                    <Hash size={18} color={iconColor} style={s.inputIcon} />
                    <TextInput style={s.input} placeholder="Ex: AC031B" placeholderTextColor={iconColor} value={codigoGrupo} onChangeText={setCodigoGrupo} autoCapitalize="characters" onFocus={() => setFocusField('codigo')} onBlur={() => setFocusField('')} />
                  </View>
                  <View style={s.hintBox}>
                    <Text style={s.hintText}>💡 O código está em <Text style={s.hintBold}>Configurações → Código de Convite</Text></Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={s.label}>Nome do grupo</Text>
                  <View style={[s.inputRow, focusField === 'nomeGrupo' && s.inputRowFocused]}>
                    <Plus size={18} color={iconColor} style={s.inputIcon} />
                    <TextInput style={s.input} placeholder="Ex: Família Silva" placeholderTextColor={iconColor} value={nomeGrupo} onChangeText={setNomeGrupo} onFocus={() => setFocusField('nomeGrupo')} onBlur={() => setFocusField('')} />
                  </View>
                </>
              )}
            </>
          )}

          {!!erro && <Text style={s.errorText}>{erro}</Text>}

          <TouchableOpacity style={[s.submitBtn, loading && { opacity: 0.5 }]} onPress={handleAuth} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color={isDark ? '#000' : '#FFF'} /> : (
              <><Text style={s.submitBtnText}>{modo === 'login' ? 'Entrar' : 'Criar conta'}</Text><ArrowRight size={20} color={isDark ? '#000' : '#FFF'} /></>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

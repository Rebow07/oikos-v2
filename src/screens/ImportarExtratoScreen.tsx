import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Upload, Check, Square, CheckSquare } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';
import { criarTransacoesBatch } from '../services/transacoes.service';
import { categorizarCSV } from '../services/ia.service';
import { formatarMoeda, dataHoje } from '../utils';
import CategoriaIcon from '../components/CategoriaIcon';

interface ParsedItem {
  titulo: string;
  valor: number;
  categoria: string;
  selecionado: boolean;
}

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
    headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary },
    scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
    uploadArea: { backgroundColor: C.surface, borderRadius: Radius.lg, borderWidth: 2, borderColor: C.border, borderStyle: 'dashed', padding: Spacing.xxl, alignItems: 'center', marginVertical: Spacing.lg },
    uploadText: { fontSize: FontSize.md, color: C.textSecondary, marginTop: Spacing.md },
    uploadHint: { fontSize: FontSize.xs, color: C.textMuted, marginTop: Spacing.xs },
    statusText: { fontSize: FontSize.md, color: C.primary, textAlign: 'center', marginVertical: Spacing.md, fontWeight: FontWeight.semibold },
    itemCard: { backgroundColor: C.surface, borderRadius: Radius.sm, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    itemInfo: { flex: 1, marginLeft: Spacing.md },
    itemTitle: { fontSize: FontSize.md, color: C.textPrimary },
    itemCat: { fontSize: FontSize.xs, color: C.textMuted },
    itemValor: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: C.despesa },
    actionsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
    btn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md, alignItems: 'center' },
    btnPrimary: { backgroundColor: C.primary },
    btnSecondary: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
    btnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
    countText: { fontSize: FontSize.sm, color: C.textSecondary, textAlign: 'center', marginTop: Spacing.md },
  });
}

export default function ImportarExtratoScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { usuario, grupoId, nomeUsuario } = useApp();

  const [items, setItems] = useState<ParsedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [importando, setImportando] = useState(false);
  const [step, setStep] = useState<'upload' | 'review'>('upload');

  const handlePick = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'application/csv'] });
      if (result.canceled) return;

      setLoading(true);
      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri);
      const lines = content.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

      if (lines.length < 2) { Alert.alert('Erro', 'Arquivo vazio ou inválido.'); setLoading(false); return; }

      // Remove header
      const dataLines = lines.slice(1).slice(0, 50); // max 50 linhas

      const categorized = await categorizarCSV(dataLines);
      setItems(categorized.map((c) => ({ ...c, selecionado: true })));
      setStep('review');
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao processar arquivo.');
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleItem = useCallback((idx: number) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, selecionado: !item.selecionado } : item));
  }, []);

  const handleImportar = useCallback(async () => {
    const selecionados = items.filter((i) => i.selecionado);
    if (selecionados.length === 0) { Alert.alert('Nenhum item selecionado.'); return; }

    setImportando(true);
    try {
      const transacoes = selecionados.map((item) => ({
        grupo_id: grupoId,
        criado_por: usuario.id,
        criado_por_nome: nomeUsuario || null,
        titulo: item.titulo,
        valor: item.valor,
        categoria: item.categoria,
        tipo: 'despesa' as const,
        data: dataHoje(),
        fixo: false,
        parcelado: false,
      }));
      await criarTransacoesBatch(transacoes);
      Alert.alert('Pronto!', `${selecionados.length} transação(ões) importada(s).`);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setImportando(false);
    }
  }, [items, grupoId, usuario, nomeUsuario, navigation]);

  const selecionadosCount = items.filter((i) => i.selecionado).length;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>Importar Extrato</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><X size={24} color={Colors.textPrimary} /></TouchableOpacity>
      </View>

      {step === 'upload' ? (
        <ScrollView contentContainerStyle={s.scroll}>
          <TouchableOpacity style={s.uploadArea} onPress={handlePick} disabled={loading}>
            {loading ? <ActivityIndicator size="large" color={Colors.primary} /> : (
              <>
                <Upload size={40} color={Colors.primary} />
                <Text style={s.uploadText}>Selecionar arquivo CSV</Text>
                <Text style={s.uploadHint}>Extrato do banco em formato CSV</Text>
              </>
            )}
          </TouchableOpacity>
          {loading && <Text style={s.statusText}>Categorizando com IA...</Text>}
        </ScrollView>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={s.scroll}
          ListHeaderComponent={<Text style={s.countText}>{selecionadosCount} de {items.length} selecionado(s)</Text>}
          renderItem={({ item, index }) => (
            <TouchableOpacity style={s.itemCard} onPress={() => toggleItem(index)}>
              {item.selecionado ? <CheckSquare size={20} color={Colors.renda} /> : <Square size={20} color={Colors.textMuted} />}
              <View style={s.itemInfo}>
                <Text style={s.itemTitle}>{item.titulo}</Text>
                <Text style={s.itemCat}>{item.categoria}</Text>
              </View>
              <Text style={s.itemValor}>{formatarMoeda(item.valor)}</Text>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            <View style={s.actionsRow}>
              <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={() => setStep('upload')}>
                <Text style={[s.btnText, { color: Colors.textSecondary }]}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.btnPrimary, importando && { opacity: 0.5 }]} onPress={handleImportar} disabled={importando}>
                {importando ? <ActivityIndicator color={Colors.textInverse} /> : <Text style={[s.btnText, { color: Colors.textInverse }]}>Importar ({selecionadosCount})</Text>}
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

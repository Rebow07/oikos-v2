import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check, Users } from 'lucide-react-native';
import { useTheme, AppColors, Spacing, FontSize, FontWeight, Radius } from '../theme';
import { useApp } from '../context/AppContext';

function makeStyles(C: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
    headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: C.textPrimary },
    list: { paddingHorizontal: Spacing.md },
    card: { backgroundColor: C.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
    cardActive: { borderColor: C.primary, borderWidth: 1.5 },
    cardIcon: { marginRight: Spacing.md },
    cardName: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: C.textPrimary },
    emptyText: { fontSize: FontSize.md, color: C.textMuted, textAlign: 'center', paddingVertical: Spacing.xxl },
  });
}

export default function MultiploGruposScreen({ navigation }: any) {
  const { Colors } = useTheme();
  const s = makeStyles(Colors);
  const insets = useSafeAreaInsets();
  const { todosOsGrupos, grupoId, trocarGrupo } = useApp();

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>Meus Grupos</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><X size={24} color={Colors.textPrimary} /></TouchableOpacity>
      </View>
      <FlatList
        data={todosOsGrupos.filter((g, i, arr) => g.id && arr.findIndex((x) => x.id === g.id) === i)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => {
          const ativo = item.id === grupoId;
          return (
            <TouchableOpacity style={[s.card, ativo && s.cardActive]} onPress={() => { trocarGrupo(item.id, item.nome); navigation.goBack(); }}>
              <Users size={20} color={ativo ? Colors.primary : Colors.textMuted} style={{ marginRight: Spacing.md }} />
              <Text style={s.cardName}>{item.nome}</Text>
              {ativo && <Check size={20} color={Colors.primary} />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={s.emptyText}>Nenhum grupo encontrado</Text>}
      />
    </View>
  );
}

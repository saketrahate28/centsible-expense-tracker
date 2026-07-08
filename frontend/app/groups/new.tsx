import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X, Plus, User, Trash2 } from "lucide-react-native";

import { theme } from "@/src/lib/theme";
import { api } from "@/src/lib/api";
import { Button } from "@/src/components/ui";

export default function GroupNew() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [name, setName] = useState("");
  const [member, setMember] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMember = () => {
    const m = member.trim();
    if (!m || members.includes(m)) return;
    setMembers([...members, m]);
    setMember("");
  };
  const removeMember = (m: string) => setMembers(members.filter(x => x !== m));

  const canSave = name.trim().length >= 2 && members.length >= 1;

  const handleCreate = async () => {
    setError(null); setSaving(true);
    try {
      const r = await api.createGroup(name.trim(), members);
      router.replace({ pathname: "/groups/[id]", params: { id: r.group.id } });
    } catch (e: any) {
      setError(e.message || "Couldn't create");
    } finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity testID="gnew-close-btn" onPress={() => router.back()} style={styles.close}>
          <X color={theme.colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.title}>New group</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>GROUP NAME</Text>
        <TextInput
          testID="gnew-name-input"
          placeholder="Goa trip 2026"
          placeholderTextColor={theme.colors.textDisabled}
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <Text style={styles.label}>MEMBERS</Text>
        <View style={styles.memberInputRow}>
          <TextInput
            testID="gnew-member-input"
            placeholder="Add a friend's name"
            placeholderTextColor={theme.colors.textDisabled}
            value={member}
            onChangeText={setMember}
            onSubmitEditing={addMember}
            style={[styles.input, { flex: 1 }]}
          />
          <TouchableOpacity testID="gnew-member-add" onPress={addMember} style={styles.addBtn}>
            <Plus color="#fff" size={18} />
          </TouchableOpacity>
        </View>
        {members.length > 0 && (
          <View style={styles.membersList}>
            {members.map(m => (
              <View key={m} style={styles.memberChip} testID={`gnew-member-${m}`}>
                <User color={theme.colors.primary} size={14} />
                <Text style={styles.memberChipText}>{m}</Text>
                <TouchableOpacity onPress={() => removeMember(m)}>
                  <Trash2 color={theme.colors.danger} size={14} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Button label="Create group" onPress={handleCreate} disabled={!canSave} loading={saving} testID="gnew-create-btn" style={{ marginTop: 12 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surface, alignItems: "center", justifyContent: "center" },
  title: { color: theme.colors.text, fontSize: 17, fontWeight: "700" },
  label: { color: theme.colors.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  input: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderSubtle, borderRadius: theme.radius.md, padding: 14, color: theme.colors.text, fontSize: 15 },
  memberInputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  addBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  membersList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  memberChip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderSubtle, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 },
  memberChipText: { color: theme.colors.text, fontSize: 13, fontWeight: "600" },
  errorText: { color: theme.colors.danger, fontSize: 13 },
});

// Country code picker — Indian defaults, covers top ~40 markets.
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList } from "react-native";
import { Search, X, ChevronDown } from "lucide-react-native";
import { theme } from "@/src/lib/theme";

export type Country = { name: string; code: string; dial: string; flag: string };

export const COUNTRIES: Country[] = [
  { name: "India", code: "IN", dial: "+91", flag: "🇮🇳" },
  { name: "United States", code: "US", dial: "+1", flag: "🇺🇸" },
  { name: "United Kingdom", code: "GB", dial: "+44", flag: "🇬🇧" },
  { name: "United Arab Emirates", code: "AE", dial: "+971", flag: "🇦🇪" },
  { name: "Singapore", code: "SG", dial: "+65", flag: "🇸🇬" },
  { name: "Canada", code: "CA", dial: "+1", flag: "🇨🇦" },
  { name: "Australia", code: "AU", dial: "+61", flag: "🇦🇺" },
  { name: "Germany", code: "DE", dial: "+49", flag: "🇩🇪" },
  { name: "France", code: "FR", dial: "+33", flag: "🇫🇷" },
  { name: "Netherlands", code: "NL", dial: "+31", flag: "🇳🇱" },
  { name: "Spain", code: "ES", dial: "+34", flag: "🇪🇸" },
  { name: "Italy", code: "IT", dial: "+39", flag: "🇮🇹" },
  { name: "Japan", code: "JP", dial: "+81", flag: "🇯🇵" },
  { name: "China", code: "CN", dial: "+86", flag: "🇨🇳" },
  { name: "Hong Kong", code: "HK", dial: "+852", flag: "🇭🇰" },
  { name: "Malaysia", code: "MY", dial: "+60", flag: "🇲🇾" },
  { name: "Indonesia", code: "ID", dial: "+62", flag: "🇮🇩" },
  { name: "Thailand", code: "TH", dial: "+66", flag: "🇹🇭" },
  { name: "Vietnam", code: "VN", dial: "+84", flag: "🇻🇳" },
  { name: "Philippines", code: "PH", dial: "+63", flag: "🇵🇭" },
  { name: "South Korea", code: "KR", dial: "+82", flag: "🇰🇷" },
  { name: "Nepal", code: "NP", dial: "+977", flag: "🇳🇵" },
  { name: "Sri Lanka", code: "LK", dial: "+94", flag: "🇱🇰" },
  { name: "Bangladesh", code: "BD", dial: "+880", flag: "🇧🇩" },
  { name: "Pakistan", code: "PK", dial: "+92", flag: "🇵🇰" },
  { name: "Saudi Arabia", code: "SA", dial: "+966", flag: "🇸🇦" },
  { name: "Qatar", code: "QA", dial: "+974", flag: "🇶🇦" },
  { name: "Kuwait", code: "KW", dial: "+965", flag: "🇰🇼" },
  { name: "Oman", code: "OM", dial: "+968", flag: "🇴🇲" },
  { name: "Bahrain", code: "BH", dial: "+973", flag: "🇧🇭" },
  { name: "Ireland", code: "IE", dial: "+353", flag: "🇮🇪" },
  { name: "Switzerland", code: "CH", dial: "+41", flag: "🇨🇭" },
  { name: "Sweden", code: "SE", dial: "+46", flag: "🇸🇪" },
  { name: "Norway", code: "NO", dial: "+47", flag: "🇳🇴" },
  { name: "Denmark", code: "DK", dial: "+45", flag: "🇩🇰" },
  { name: "New Zealand", code: "NZ", dial: "+64", flag: "🇳🇿" },
  { name: "South Africa", code: "ZA", dial: "+27", flag: "🇿🇦" },
  { name: "Brazil", code: "BR", dial: "+55", flag: "🇧🇷" },
  { name: "Mexico", code: "MX", dial: "+52", flag: "🇲🇽" },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // India

type Props = {
  value: Country;
  onChange: (c: Country) => void;
  testID?: string;
};

export function CountryPicker({ value, onChange, testID }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <>
      <TouchableOpacity
        testID={testID || "country-picker-btn"}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
        style={styles.trigger}
      >
        <Text style={styles.flag}>{value.flag}</Text>
        <Text style={styles.dial}>{value.dial}</Text>
        <ChevronDown color={theme.colors.textSecondary} size={14} />
      </TouchableOpacity>

      <Modal transparent animationType="slide" visible={open} onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select country</Text>
              <TouchableOpacity onPress={() => setOpen(false)} testID="country-picker-close">
                <X color={theme.colors.textSecondary} size={20} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchRow}>
              <Search color={theme.colors.textSecondary} size={16} />
              <TextInput
                testID="country-search-input"
                style={styles.searchInput}
                placeholder="Search country or code..."
                placeholderTextColor={theme.colors.textDisabled}
                value={query}
                onChangeText={setQuery}
                autoFocus
              />
            </View>
            <FlatList
              testID="country-list"
              data={filtered}
              keyExtractor={(c) => c.code}
              style={{ maxHeight: 380 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  testID={`country-${item.code}`}
                  onPress={() => { onChange(item); setOpen(false); setQuery(""); }}
                  style={[styles.row, value.code === item.code && styles.rowActive]}
                >
                  <Text style={styles.rowFlag}>{item.flag}</Text>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowDial}>{item.dial}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.md,
    borderBottomLeftRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRightWidth: 0,
  },
  flag: { fontSize: 18 },
  dial: { color: theme.colors.text, fontSize: 15, fontWeight: "700" },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "80%" },
  sheetHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: theme.colors.borderStrong, alignSelf: "center", marginBottom: 16 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sheetTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "700" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.colors.bg, borderRadius: theme.radius.md, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.colors.borderSubtle, marginBottom: 12 },
  searchInput: { flex: 1, color: theme.colors.text, fontSize: 14, paddingVertical: 12 },

  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderRadius: theme.radius.sm },
  rowActive: { backgroundColor: theme.colors.primarySoft },
  rowFlag: { fontSize: 22 },
  rowName: { color: theme.colors.text, fontSize: 14, fontWeight: "600", flex: 1 },
  rowDial: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "700" },
});

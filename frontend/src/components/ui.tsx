// Small, reusable primitives used across screens.
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from "react-native";
import { theme } from "@/src/lib/theme";

export function Card({ children, style, testID }: { children: React.ReactNode; style?: ViewStyle; testID?: string }) {
  return <View testID={testID} style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label, onPress, variant = "primary", disabled, loading, testID, icon, style,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "outline" | "ai";
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
}) {
  const bg = variant === "primary" ? theme.colors.primary
    : variant === "ai" ? theme.colors.ai
    : variant === "secondary" ? theme.colors.surfaceElevated
    : "transparent";
  const border = variant === "outline" ? theme.colors.borderStrong : "transparent";
  const shadow = variant === "primary" ? styles.glowPrimary : variant === "ai" ? styles.glowAi : null;
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.button,
        { backgroundColor: bg, borderColor: border, borderWidth: variant === "outline" ? 1.5 : 0, opacity: disabled ? 0.5 : 1 },
        shadow,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={theme.colors.text} /> : (
        <View style={styles.buttonInner}>
          {icon}
          <Text style={styles.buttonText}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function Chip({
  label, active, onPress, testID, style,
}: { label: string; active?: boolean; onPress?: () => void; testID?: string; style?: ViewStyle }) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.chip, active && styles.chipActive, style]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SectionTitle({ children, right, testID }: { children: React.ReactNode; right?: React.ReactNode; testID?: string }) {
  return (
    <View testID={testID} style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

export function EmptyState({ title, subtitle, testID }: { title: string; subtitle?: string; testID?: string }) {
  return (
    <View testID={testID} style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export const t: { small: TextStyle; body: TextStyle; label: TextStyle; h1: TextStyle; h2: TextStyle; h3: TextStyle; balance: TextStyle } = {
  small: { color: theme.colors.textSecondary, fontSize: 13 },
  body: { color: theme.colors.text, fontSize: 15 },
  label: { color: theme.colors.textSecondary, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: "700" },
  h1: { color: theme.colors.text, fontSize: 34, fontWeight: "800", letterSpacing: -0.5 },
  h2: { color: theme.colors.text, fontSize: 26, fontWeight: "700", letterSpacing: -0.3 },
  h3: { color: theme.colors.text, fontSize: 20, fontWeight: "700" },
  balance: { color: theme.colors.text, fontSize: 44, fontWeight: "800", letterSpacing: -1 },
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.space.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  button: {
    borderRadius: theme.radius.pill,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  buttonInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  glowPrimary: { shadowColor: theme.colors.primary, shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  glowAi: { shadowColor: theme.colors.ai, shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: "transparent",
    flexShrink: 0,
    minHeight: 36,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    borderColor: theme.colors.primary,
  },
  chipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: theme.colors.primary },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "700" },
  empty: { padding: theme.space.xl, alignItems: "center" },
  emptyTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "700" },
  emptySubtitle: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 6, textAlign: "center" },
});

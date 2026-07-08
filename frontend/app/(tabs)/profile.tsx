import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Image, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LogOut, Users, Download, Sparkles, ChevronRight, User, Bell, Fingerprint } from "lucide-react-native";

import { theme } from "@/src/lib/theme";
import { useAuth } from "@/src/context/AuthContext";
import { Card, t } from "@/src/components/ui";
import { api, getToken } from "@/src/lib/api";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [smsAuto, setSmsAuto] = useState(true);
  const [biometric, setBiometric] = useState(false);
  const [notifs, setNotifs] = useState(true);

  const handleLogout = () => {
    if (Platform.OS === "web") {
      // eslint-disable-next-line no-alert
      if (window.confirm("Sign out of Centsible?")) { signOut().then(() => router.replace("/landing")); }
    } else {
      Alert.alert("Sign out?", "You can sign back in anytime.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: async () => { await signOut(); router.replace("/landing"); } },
      ]);
    }
  };

  const handleExport = async () => {
    const token = await getToken();
    if (Platform.OS === "web") {
      const res = await fetch(api.exportUrl(), { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "centsible-transactions.csv";
      a.click();
    } else {
      Alert.alert("Export", "CSV export is available on the web. On mobile, it will be downloadable once you deploy.");
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 80, gap: 16 }}>
      <Text style={styles.title}>Profile</Text>

      {/* User card */}
      <Card testID="profile-user-card">
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={{ width: 56, height: 56, borderRadius: 28 }} />
            ) : (
              <Text style={styles.avatarText}>{(user?.name || "?").slice(0, 1).toUpperCase()}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.name || "Add your name"}</Text>
            <Text style={styles.userSub}>{user?.email || user?.phone}</Text>
            {user?.city ? <Text style={styles.userMeta}>{user.city}</Text> : null}
          </View>
        </View>
      </Card>

      {/* Pro banner */}
      <TouchableOpacity testID="profile-pro-btn" style={[styles.proCard, user?.is_pro && styles.proCardActive]} activeOpacity={0.85} onPress={() => router.push("/pro")}>
        <View style={styles.proIcon}>
          <Sparkles color={user?.is_pro ? theme.colors.gold : theme.colors.ai} size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.proTitle}>{user?.is_pro ? "Cent Pro · Active" : "Upgrade to Cent Pro"}</Text>
          <Text style={styles.proSub}>{user?.is_pro ? `${user?.pro_plan || "subscribed"} plan` : "Unlimited AI · PDF export · Advanced analytics"}</Text>
        </View>
        <ChevronRight color={user?.is_pro ? theme.colors.gold : theme.colors.ai} size={20} />
      </TouchableOpacity>

      {/* Actions */}
      <Card>
        <Row
          testID="row-groups"
          icon={<Users color={theme.colors.primary} size={18} />}
          label="Shared budgets"
          hint="Split expenses with friends"
          onPress={() => router.push("/groups")}
        />
        <Row
          testID="row-export"
          icon={<Download color={theme.colors.success} size={18} />}
          label="Export data"
          hint="Download as CSV"
          onPress={handleExport}
        />
      </Card>

      {/* Toggles */}
      <Card>
        <ToggleRow testID="toggle-sms" icon={<Bell color={theme.colors.textSecondary} size={18} />} label="Auto-sync SMS" hint="Read new bank SMS in background" value={smsAuto} onChange={setSmsAuto} />
        <ToggleRow testID="toggle-biom" icon={<Fingerprint color={theme.colors.textSecondary} size={18} />} label="Biometric lock" hint="Requires build (not Expo Go)" value={biometric} onChange={setBiometric} />
        <ToggleRow testID="toggle-notifs" icon={<Bell color={theme.colors.textSecondary} size={18} />} label="Budget alerts" hint="Nudge when close to your limit" value={notifs} onChange={setNotifs} />
      </Card>

      <TouchableOpacity testID="profile-logout-btn" onPress={handleLogout} style={styles.logout} activeOpacity={0.85}>
        <LogOut color={theme.colors.danger} size={16} />
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Centsible · Made in India · v1.0</Text>
    </ScrollView>
  );
}

function Row({ icon, label, hint, onPress, testID }: any) {
  return (
    <TouchableOpacity testID={testID} onPress={onPress} style={styles.row} activeOpacity={0.8}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <ChevronRight color={theme.colors.textDisabled} size={18} />
    </TouchableOpacity>
  );
}

function ToggleRow({ icon, label, hint, value, onChange, testID }: any) {
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.colors.surfaceElevated, true: theme.colors.primary }}
        thumbColor={"#fff"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: theme.colors.text, fontSize: 28, fontWeight: "800" },
  userRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  userName: { color: theme.colors.text, fontSize: 17, fontWeight: "700" },
  userSub: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
  userMeta: { color: theme.colors.textDisabled, fontSize: 11, marginTop: 2 },

  proCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: theme.radius.lg, backgroundColor: "rgba(139,92,246,0.08)", borderWidth: 1, borderColor: "rgba(139,92,246,0.25)" },
  proCardActive: { backgroundColor: theme.colors.goldSoft, borderColor: theme.colors.goldBorder },
  proIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(139,92,246,0.15)", alignItems: "center", justifyContent: "center" },
  proTitle: { color: theme.colors.text, fontSize: 15, fontWeight: "700" },
  proSub: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },

  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.bg, alignItems: "center", justifyContent: "center" },
  rowLabel: { color: theme.colors.text, fontSize: 14, fontWeight: "600" },
  rowHint: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 },

  logout: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 14, borderRadius: theme.radius.md, borderWidth: 1, borderColor: "rgba(244,63,94,0.3)", backgroundColor: "rgba(244,63,94,0.06)" },
  logoutText: { color: theme.colors.danger, fontWeight: "700", fontSize: 14 },
  version: { color: theme.colors.textDisabled, fontSize: 11, textAlign: "center", marginTop: 12 },
});

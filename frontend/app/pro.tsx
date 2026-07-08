import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { ArrowLeft, Sparkles, Check, Crown, Zap, BarChart3, MessageSquare, FileDown, Star } from "lucide-react-native";

import { theme } from "@/src/lib/theme";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/context/AuthContext";
import { Button } from "@/src/components/ui";

type Plan = { id: string; name: string; amount: number; currency: string; interval: string; highlight: string };

const FEATURES = [
  { icon: MessageSquare, text: "Unlimited AI chats with Cent" },
  { icon: BarChart3, text: "Advanced analytics & trends" },
  { icon: FileDown, text: "PDF + CSV export" },
  { icon: Star, text: "Custom categories & tags" },
  { icon: Zap, text: "Priority AI insights" },
  { icon: Crown, text: "Pro badge on your profile" },
];

export default function CentPro() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refresh } = useAuth();
  const params = useLocalSearchParams<{ checkout?: string; session_id?: string }>();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<"monthly" | "yearly">("yearly");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.billingPlans();
      setPlans(r.plans);
    } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  // Handle redirect back from Stripe
  useEffect(() => {
    if (params.checkout === "success" && params.session_id) {
      (async () => {
        setBusy(true);
        try {
          const r = await api.billingStatus(String(params.session_id));
          if (r.paid) {
            setStatus("🎉 Welcome to Cent Pro!");
            await refresh();
          } else {
            setStatus("Payment not confirmed yet — try again if this persists.");
          }
        } catch (e: any) {
          setStatus(e.message || "Couldn't verify payment");
        } finally { setBusy(false); }
      })();
    } else if (params.checkout === "cancel") {
      setStatus("Checkout cancelled.");
    }
  }, [params, refresh]);

  const handleSubscribe = async () => {
    setBusy(true); setStatus(null);
    try {
      const returnUrl = Platform.OS === "web"
        ? (typeof window !== "undefined" ? window.location.origin + "/pro" : "")
        : Linking.createURL("pro");
      const r = await api.billingCheckout(selected, returnUrl);
      if (Platform.OS === "web") {
        window.location.href = r.url;
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(r.url, returnUrl);
      if (result.type === "success" && result.url) {
        const url = new URL(result.url);
        const sid = url.searchParams.get("session_id");
        if (sid) {
          const st = await api.billingStatus(sid);
          if (st.paid) { setStatus("🎉 Welcome to Cent Pro!"); await refresh(); }
        }
      }
    } catch (e: any) {
      setStatus(e.message || "Couldn't start checkout");
    } finally { setBusy(false); }
  };

  const handleTestActivate = async () => {
    setBusy(true); setStatus(null);
    try {
      await api.billingMockActivate(selected);
      await refresh();
      setStatus("🎉 Welcome to Cent Pro! (test mode)");
    } catch (e: any) {
      setStatus(e.message);
    } finally { setBusy(false); }
  };

  const isPro = user?.is_pro;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity testID="pro-back-btn" onPress={() => router.back()} style={styles.back}>
          <ArrowLeft color={theme.colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cent Pro</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100, gap: 16 }}>
        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient
            colors={["rgba(251,191,36,0.20)", "rgba(6,182,212,0.12)", "transparent"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.crown}>
            <Crown color={theme.colors.gold} size={28} />
          </View>
          <Text style={styles.heroTitle}>Level up your money game</Text>
          <Text style={styles.heroSub}>Unlock the full AI-powered Centsible experience. Built for the ones who take money seriously.</Text>
          {isPro && (
            <View style={styles.proBadge} testID="pro-active-badge">
              <Sparkles color={theme.colors.gold} size={14} />
              <Text style={styles.proBadgeText}>You&apos;re Pro · {user?.pro_plan || "active"}</Text>
            </View>
          )}
        </View>

        {/* Features */}
        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow} testID={`pro-feature-${i}`}>
              <View style={styles.featureIcon}>
                <f.icon color={theme.colors.gold} size={16} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
              <Check color={theme.colors.success} size={16} />
            </View>
          ))}
        </View>

        {/* Plans */}
        {!isPro && (
          <View style={styles.plans}>
            {plans.map(p => (
              <TouchableOpacity
                key={p.id}
                testID={`pro-plan-${p.id}`}
                onPress={() => setSelected(p.id as "monthly" | "yearly")}
                activeOpacity={0.85}
                style={[styles.plan, selected === p.id && styles.planSelected]}
              >
                {p.id === "yearly" && (
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText}>BEST VALUE</Text>
                  </View>
                )}
                <View style={styles.planRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planName}>{p.name.replace("Cent Pro ", "")}</Text>
                    <Text style={styles.planHint}>{p.highlight}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceCurrency}>₹</Text>
                      <Text style={styles.priceAmount}>{p.amount}</Text>
                    </View>
                    <Text style={styles.priceInterval}>per {p.interval}</Text>
                  </View>
                </View>
                <View style={[styles.radio, selected === p.id && styles.radioSelected]}>
                  {selected === p.id ? <View style={styles.radioDot} /> : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {status ? <Text style={styles.status} testID="pro-status">{status}</Text> : null}
      </ScrollView>

      {/* CTA */}
      {!isPro && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Button
            label={busy ? "Please wait..." : `Upgrade for ₹${plans.find(p => p.id === selected)?.amount || 99}`}
            onPress={handleSubscribe}
            loading={busy}
            testID="pro-subscribe-btn"
            variant="primary"
            icon={<Crown color="#fff" size={18} />}
          />
          <TouchableOpacity onPress={handleTestActivate} disabled={busy} style={{ marginTop: 10 }} testID="pro-test-activate-btn">
            <Text style={styles.testActivate}>
              Skip payment (test mode) — activate {selected} Pro
            </Text>
          </TouchableOpacity>
          <Text style={styles.terms}>Cancel anytime. Payment secured by Stripe.</Text>
        </View>
      )}
      {isPro && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Button label="You're all set — enjoy Pro 🎉" onPress={() => router.back()} testID="pro-close-btn" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surface, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "700" },

  hero: { borderRadius: theme.radius.lg, padding: 24, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.goldBorder, overflow: "hidden", alignItems: "flex-start" },
  crown: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.goldSoft, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  heroTitle: { color: theme.colors.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  heroSub: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 8 },
  proBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.colors.goldSoft, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, marginTop: 14, borderWidth: 1, borderColor: theme.colors.goldBorder },
  proBadgeText: { color: theme.colors.gold, fontSize: 12, fontWeight: "700", textTransform: "capitalize" },

  features: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.borderSubtle, padding: 8 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  featureIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.goldSoft, alignItems: "center", justifyContent: "center" },
  featureText: { color: theme.colors.text, fontSize: 14, fontWeight: "500", flex: 1 },

  plans: { gap: 12 },
  plan: { position: "relative", backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: 16, paddingRight: 44, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  planSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
  saveBadge: { position: "absolute", top: -8, right: 16, backgroundColor: theme.colors.gold, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, zIndex: 1 },
  saveBadgeText: { color: theme.colors.inverse, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  planRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  planName: { color: theme.colors.text, fontSize: 16, fontWeight: "700", textTransform: "capitalize" },
  planHint: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 },
  priceRow: { flexDirection: "row", alignItems: "flex-end" },
  priceCurrency: { color: theme.colors.text, fontSize: 16, fontWeight: "700", marginBottom: 4 },
  priceAmount: { color: theme.colors.text, fontSize: 32, fontWeight: "800", letterSpacing: -1 },
  priceInterval: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 2, textTransform: "capitalize" },
  radio: { position: "absolute", top: "50%", right: 14, width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.colors.borderStrong, marginTop: -11, alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: theme.colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary },

  status: { color: theme.colors.text, fontSize: 13, textAlign: "center", marginTop: 12, padding: 12, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.borderSubtle },

  footer: { padding: 20, borderTopWidth: 1, borderTopColor: theme.colors.borderSubtle, backgroundColor: theme.colors.bg },
  testActivate: { color: theme.colors.textSecondary, fontSize: 11, textAlign: "center", textDecorationLine: "underline" },
  terms: { color: theme.colors.textDisabled, fontSize: 11, textAlign: "center", marginTop: 8 },
});

import { View, Text, StyleSheet, Image, ScrollView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, t } from "@/src/components/ui";
import { theme } from "@/src/lib/theme";
import { Sparkles, TrendingUp, ShieldCheck } from "lucide-react-native";

export default function Landing() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      testID="landing-scroll"
      style={styles.root}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.badgeRow}>
        <View style={styles.badge} testID="brand-badge">
          <Sparkles color={theme.colors.primary} size={14} />
          <Text style={styles.badgeText}>Centsible · AI Finance for GenZ</Text>
        </View>
      </View>

      <View style={styles.heroImageWrap}>
        <LinearGradient
          colors={["rgba(139,92,246,0.35)", "rgba(236,72,153,0.35)", "transparent"]}
          style={styles.heroGlow}
        />
        <Image
          source={{ uri: "https://images.pexels.com/photos/7947959/pexels-photo-7947959.jpeg?auto=compress&cs=tinysrgb&w=800" }}
          style={styles.heroImage}
          resizeMode="cover"
        />
      </View>

      <Text style={[t.h1, styles.title]} testID="landing-title">
        Track less.{"\n"}
        <Text style={{ color: theme.colors.primary }}>Learn more.</Text>
      </Text>
      <Text style={styles.subtitle}>
        Your money, on autopilot. Centsible parses your SMS, categorizes spending, and teaches you finance in bite-sized moments — powered by AI.
      </Text>

      <View style={styles.features}>
        <Feature icon={<TrendingUp color={theme.colors.primary} size={18} />} text="Auto-track spends from bank SMS" />
        <Feature icon={<Sparkles color={theme.colors.ai} size={18} />} text="Daily AI insights & finance terms" />
        <Feature icon={<ShieldCheck color={theme.colors.success} size={18} />} text="Bank-grade security. You own your data." />
      </View>

      <View style={styles.ctas}>
        <Button
          label="Get started"
          onPress={() => router.push("/signin")}
          testID="landing-get-started-btn"
        />
        <Text style={styles.footnote}>By continuing you agree to our Terms & Privacy.</Text>
      </View>
    </ScrollView>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>{icon}</View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  container: { paddingHorizontal: 24, gap: 20 },
  badgeRow: { alignItems: "flex-start" },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  badgeText: { color: theme.colors.text, fontSize: 12, fontWeight: "600" },
  heroImageWrap: { borderRadius: theme.radius.xl, overflow: "hidden", height: 260, marginTop: 12, backgroundColor: theme.colors.surface },
  heroGlow: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  heroImage: { width: "100%", height: "100%", opacity: 0.7 },
  title: { fontSize: 40, lineHeight: 44, marginTop: 20 },
  subtitle: { color: theme.colors.textSecondary, fontSize: 15, lineHeight: 22 },
  features: { gap: 12, marginTop: 8 },
  feature: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: 14, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  featureIcon: { width: 36, height: 36, borderRadius: 999, backgroundColor: theme.colors.bg, alignItems: "center", justifyContent: "center" },
  featureText: { color: theme.colors.text, fontSize: 14, fontWeight: "500", flex: 1 },
  ctas: { marginTop: 12, gap: 12 },
  footnote: { color: theme.colors.textDisabled, fontSize: 11, textAlign: "center" },
});

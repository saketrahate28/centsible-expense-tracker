// Root redirector: routes user based on auth + onboarding state.
import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { theme } from "@/src/lib/theme";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/landing");
    else if (!user.is_onboarded) router.replace("/onboarding");
    else router.replace("/(tabs)");
  }, [user, loading, router]);

  return (
    <View style={styles.wrap} testID="root-splash">
      <ActivityIndicator color={theme.colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg },
});

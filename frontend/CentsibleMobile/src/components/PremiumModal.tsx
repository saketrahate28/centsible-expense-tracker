import React, { useEffect, useState } from "react";
import {
    Modal, View, Text, StyleSheet, TouchableOpacity,
    Dimensions, ActivityIndicator, Alert, Linking
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import {
    getBillingPlans, createBillingOrder, verifyBillingPayment, mockActivatePro,
    BillingPlan,
} from "../services/api";
import { getStoredUser, setStoredUser } from "../services/authService";

const { width } = Dimensions.get("window");

type Props = {
    isVisible: boolean;
    onClose: () => void;
    onProActivated?: () => void;
};

const FEATURES = [
    { icon: "sparkles", title: "Advanced AI Insights", desc: "Predictive analytics, smart savings tips & deeper spend breakdowns." },
    { icon: "people",   title: "Unlimited Shared Groups", desc: "Split bills with flatmates, family, or trip groups — no cap." },
    { icon: "bar-chart",title: "Trend Charts & Heatmap", desc: "Full spending history with weekly/monthly bar charts." },
    { icon: "download", title: "CSV & PDF Export", desc: "Export your transactions to Excel or share PDF summaries." },
];

export default function PremiumModal({ isVisible, onClose, onProActivated }: Props) {
    const [plans, setPlans]           = useState<BillingPlan[]>([]);
    const [selected, setSelected]     = useState<"monthly" | "yearly">("monthly");
    const [rzpEnabled, setRzpEnabled] = useState(false);
    const [rzpKeyId, setRzpKeyId]     = useState<string | null>(null);
    const [loading, setLoading]       = useState(false);
    const [status, setStatus]         = useState("");

    useEffect(() => {
        if (!isVisible) return;
        getBillingPlans()
            .then((res) => {
                setPlans(res.plans || []);
                setRzpEnabled(res.razorpayEnabled);
                setRzpKeyId(res.keyId ?? null);
            })
            .catch(() => {
                // Fallback static plans if API unreachable
                setPlans([
                    { id: "monthly", name: "Centsible Pro Monthly", amount: 99,  currency: "INR", interval: "month", highlight: "Cancel anytime" },
                    { id: "yearly",  name: "Centsible Pro Yearly",  amount: 899, currency: "INR", interval: "year",  highlight: "Save 24% - 2 months free" },
                ]);
            });
    }, [isVisible]);

    const activePlan = plans.find((p) => p.id === selected);

    const handleSubscribe = async () => {
        if (!rzpEnabled || !rzpKeyId) {
            Alert.alert(
                "Payment Not Configured",
                "Razorpay keys are set but checkout is not available in Expo Go builds.\n\nUse the Test Activate button to test the Pro flow.",
                [{ text: "OK" }]
            );
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);
        setStatus("Creating order...");

        try {
            const order = await createBillingOrder(selected);

            // Build the Razorpay hosted checkout URL (works without a native SDK)
            // The user pays on Razorpay web page and we confirm via deeplink
            const checkoutUrl =
                `https://api.razorpay.com/v1/checkout/embedded?` +
                `key_id=${encodeURIComponent(order.keyId)}` +
                `&order_id=${encodeURIComponent(order.orderId)}` +
                `&name=Centsible` +
                `&description=${encodeURIComponent(order.planName)}` +
                `&prefill.name=${encodeURIComponent(order.userName ?? "")}` +
                `&prefill.email=${encodeURIComponent(order.userEmail ?? "")}` +
                `&prefill.contact=${encodeURIComponent(order.userPhone ?? "")}` +
                `&amount=${order.amount}` +
                `&currency=${order.currency}` +
                `&theme.color=%2322d3ee`;

            setStatus("Opening Razorpay checkout...");
            const result = await WebBrowser.openBrowserAsync(checkoutUrl);

            if (result.type === "cancel" || result.type === "dismiss") {
                setStatus("Payment was cancelled.");
                setLoading(false);
                return;
            }

            // For Expo Go / WebBrowser, we cannot get the callback — use mock activate
            // In a native build with react-native-razorpay, use the native SDK for callback
            Alert.alert(
                "Did the payment succeed?",
                "If you completed the payment, tap Confirm. Otherwise tap Cancel.",
                [
                    { text: "Cancel", style: "cancel", onPress: () => { setStatus(""); setLoading(false); } },
                    {
                        text: "Confirm",
                        onPress: async () => {
                            await activateProLocally();
                        }
                    },
                ]
            );
        } catch (err: any) {
            setStatus(`Error: ${err?.message ?? "Could not start checkout"}`);
            setLoading(false);
        }
    };

    const activateProLocally = async () => {
        try {
            setStatus("Activating Pro...");
            const res = await mockActivatePro(selected);
            // Update cached user
            const user = await getStoredUser();
            if (user) {
                await setStoredUser({ ...user, isPremium: true } as any);
            }
            setStatus("Pro activated!");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onProActivated?.();
            setTimeout(() => {
                setStatus("");
                setLoading(false);
                onClose();
                Alert.alert(
                    "Welcome to Pro!",
                    `Your ${selected} subscription is now active. Enjoy all Pro features!`,
                    [{ text: "Let's go!" }]
                );
            }, 800);
        } catch (err: any) {
            setStatus(`Activation failed: ${err?.message}`);
            setLoading(false);
        }
    };

    const handleTestActivate = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setLoading(true);
        await activateProLocally();
    };

    if (!isVisible) return null;

    return (
        <Modal transparent visible={isVisible} animationType="slide" statusBarTranslucent>
            <View style={styles.overlay}>
                <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />

                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.sheetHeader}>
                        <LinearGradient colors={["#22d3ee", "#0ea5e9"]} style={styles.proBadge}>
                            <Ionicons name="star" size={12} color="#080810" />
                            <Text style={styles.proBadgeText}>CENTSIBLE PRO</Text>
                        </LinearGradient>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={loading}>
                            <Ionicons name="close" size={22} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.title}>Take full control{"\n"}of your finances</Text>
                    <Text style={styles.subtitle}>Unlock everything Centsible has to offer.</Text>

                    {/* Features */}
                    <View style={styles.featuresList}>
                        {FEATURES.map((f, i) => (
                            <View key={i} style={styles.featureRow}>
                                <View style={styles.featureIcon}>
                                    <Ionicons name={f.icon as any} size={18} color="#22d3ee" />
                                </View>
                                <View style={styles.featureText}>
                                    <Text style={styles.featureTitle}>{f.title}</Text>
                                    <Text style={styles.featureDesc}>{f.desc}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Plan selector */}
                    <View style={styles.planRow}>
                        {plans.map((p) => (
                            <TouchableOpacity
                                key={p.id}
                                style={[styles.planCard, selected === p.id && styles.planCardActive]}
                                onPress={() => setSelected(p.id)}
                                activeOpacity={0.8}
                            >
                                {p.id === "yearly" && (
                                    <View style={styles.bestValueBadge}>
                                        <Text style={styles.bestValueText}>BEST VALUE</Text>
                                    </View>
                                )}
                                <Text style={styles.planInterval}>{p.interval === "month" ? "Monthly" : "Yearly"}</Text>
                                <Text style={styles.planPrice}>
                                    <Text style={styles.planCurrency}>₹</Text>
                                    {p.amount}
                                </Text>
                                <Text style={styles.planHint}>{p.highlight}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Status */}
                    {!!status && (
                        <Text style={styles.statusText}>{status}</Text>
                    )}

                    {/* CTA */}
                    <TouchableOpacity
                        style={styles.subscribeBtn}
                        onPress={handleSubscribe}
                        disabled={loading || plans.length === 0}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={loading ? ["#1C1C28", "#1C1C28"] : ["#22d3ee", "#0ea5e9"]}
                            style={styles.subscribeBtnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            {loading ? (
                                <ActivityIndicator color="#080810" />
                            ) : (
                                <>
                                    <Ionicons name="card-outline" size={18} color="#080810" />
                                    <Text style={styles.subscribeBtnText}>
                                        Pay ₹{activePlan?.amount ?? "99"} with Razorpay
                                    </Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Test mode bypass */}
                    {rzpKeyId?.startsWith("rzp_test_") && (
                        <TouchableOpacity
                            style={styles.testBtn}
                            onPress={handleTestActivate}
                            disabled={loading}
                        >
                            <Text style={styles.testBtnText}>
                                Skip payment (test mode) — activate {selected} Pro
                            </Text>
                        </TouchableOpacity>
                    )}

                    <Text style={styles.footnote}>
                        {rzpEnabled
                            ? "Secured by Razorpay. Cancel anytime from Profile."
                            : "Add Razorpay keys to backend to enable real payments."}
                    </Text>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
    sheet: {
        backgroundColor: "#0d0d14",
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        padding: 24, paddingBottom: 40,
        borderWidth: 1, borderColor: "rgba(34,211,238,0.15)",
    },
    sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    proBadge: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    },
    proBadgeText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#080810", letterSpacing: 1 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1C1C28", justifyContent: "center", alignItems: "center" },

    title: { fontFamily: "Outfit_800ExtraBold", fontSize: 28, color: "#FFF", lineHeight: 36, marginBottom: 6 },
    subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: "#777", marginBottom: 24 },

    featuresList: { marginBottom: 24, gap: 14 },
    featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
    featureIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(34,211,238,0.1)", justifyContent: "center", alignItems: "center" },
    featureText: { flex: 1 },
    featureTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 15, color: "#FFF", marginBottom: 2 },
    featureDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#666", lineHeight: 18 },

    planRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
    planCard: {
        flex: 1, backgroundColor: "#111218", borderRadius: 18,
        padding: 16, alignItems: "center",
        borderWidth: 1.5, borderColor: "#2A2A35", position: "relative", overflow: "hidden",
    },
    planCardActive: { borderColor: "#22d3ee", backgroundColor: "rgba(34,211,238,0.06)" },
    bestValueBadge: {
        position: "absolute", top: 0, right: 0,
        backgroundColor: "#22d3ee", paddingHorizontal: 10, paddingVertical: 4,
        borderBottomLeftRadius: 12,
    },
    bestValueText: { fontFamily: "Inter_700Bold", fontSize: 9, color: "#080810", letterSpacing: 1 },
    planInterval: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: "#888", marginBottom: 4 },
    planPrice: { fontFamily: "Outfit_800ExtraBold", fontSize: 30, color: "#FFF" },
    planCurrency: { fontSize: 16 },
    planHint: { fontFamily: "Inter_400Regular", fontSize: 11, color: "#555", marginTop: 4, textAlign: "center" },

    statusText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#22d3ee", textAlign: "center", marginBottom: 12 },

    subscribeBtn: { height: 56, borderRadius: 18, overflow: "hidden", marginBottom: 14 },
    subscribeBtnGradient: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10 },
    subscribeBtnText: { fontFamily: "Outfit_700Bold", fontSize: 16, color: "#080810" },

    testBtn: { alignItems: "center", paddingVertical: 8, marginBottom: 12 },
    testBtnText: { fontFamily: "Inter_400Regular", fontSize: 12, color: "#555", textDecorationLine: "underline" },

    footnote: { fontFamily: "Inter_400Regular", fontSize: 11, color: "#444", textAlign: "center" },
});

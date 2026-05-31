import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Animated, Easing, Dimensions, ImageBackground, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';

const { width, height } = Dimensions.get('window');

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Landing'>;
};

// ── Pure code-drawn Rupee Coin — no PNG, no checkerboard, ever ───────────────
const CoinLogo = ({ spin }: { spin: Animated.AnimatedInterpolation<string> }) => (
    <Animated.View style={[coinStyles.outer, { transform: [{ rotateY: spin }] }]}>
        <LinearGradient
            colors={['#D8D8D8', '#A8A8A8', '#E8E8E8', '#B0B0B0', '#C8C8C8']}
            style={coinStyles.face}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
        >
            {/* Outer rim */}
            <View style={coinStyles.rim} />
            {/* Inner circle */}
            <View style={coinStyles.innerCircle}>
                <Text style={coinStyles.rupeeSymbol}>₹</Text>
                <Text style={coinStyles.rupeeLabel}>RUPEE</Text>
            </View>
            {/* Shine reflection */}
            <View style={coinStyles.shine} />
        </LinearGradient>
    </Animated.View>
);

const coinStyles = StyleSheet.create({
    outer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#888',
        shadowColor: '#22d3ee',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 20,
    },
    face: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 3,
        borderColor: '#C0C0C0',
    },
    rim: {
        position: 'absolute',
        width: 128,
        height: 128,
        borderRadius: 64,
        borderWidth: 4,
        borderColor: 'rgba(180,180,180,0.5)',
    },
    innerCircle: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    rupeeSymbol: {
        fontSize: 52,
        color: '#3a3a3a',
        fontFamily: 'Outfit_800ExtraBold',
        lineHeight: 58,
        textShadowColor: 'rgba(255,255,255,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    rupeeLabel: {
        fontSize: 10,
        color: '#4a4a4a',
        fontFamily: 'Outfit_700Bold',
        letterSpacing: 3,
        marginTop: -4,
    },
    shine: {
        position: 'absolute',
        top: 8,
        left: 16,
        width: 40,
        height: 60,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.3)',
        transform: [{ rotate: '-30deg' }],
    },
});

// ── Floating ₹ particle in background ────────────────────────────────────────
const CoinParticle = ({ delay, left, size }: { delay: number; left: number; size: number }) => {
    const fallAnim = useRef(new Animated.Value(-50)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(fallAnim, {
                    toValue: height + 50,
                    duration: Math.random() * 3000 + 4000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return (
        <Animated.Text
            style={[styles.bgCoin, { left, fontSize: size, transform: [{ translateY: fallAnim }] }]}
        >
            ₹
        </Animated.Text>
    );
};

// ── Main Landing Screen ───────────────────────────────────────────────────────
export default function LandingScreen({ navigation }: Props) {
    const spinValue  = useRef(new Animated.Value(0)).current;
    const floatValue = useRef(new Animated.Value(0)).current;
    const entranceOpacity = useRef(new Animated.Value(0)).current;
    const entranceSlide   = useRef(new Animated.Value(40)).current;

    const handleGoogleLogin = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const { googleLogin } = require('../services/authService');
            const result = await googleLogin();
            if (result.success) {
                if (result.user) {
                    if (!result.user.isOnboarded) {
                        navigation.replace('Onboarding');
                    } else {
                        navigation.replace('MainTabs');
                    }
                }
            } else {
                Alert.alert('Login Failed', result.message || 'Google login failed.');
            }
        } catch (error) {
            console.error('Google login error:', error);
            Alert.alert('Login Error', 'An unexpected error occurred.');
        }
    };

    useEffect(() => {
        // Coin spin — useNativeDriver:false required for rotateY
        Animated.loop(
            Animated.timing(spinValue, {
                toValue: 1,
                duration: 4000,
                easing: Easing.linear,
                useNativeDriver: false,
            })
        ).start();

        // Float up/down
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatValue, { toValue: -12, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                Animated.timing(floatValue, { toValue: 0,   duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
            ])
        ).start();

        // Auth buttons entrance
        Animated.parallel([
            Animated.timing(entranceOpacity, { toValue: 1, duration: 900, delay: 600, useNativeDriver: true }),
            Animated.timing(entranceSlide,   { toValue: 0, duration: 900, delay: 600, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
        ]).start();
    }, []);

    const spin = spinValue.interpolate({
        inputRange:  [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <ImageBackground
            source={require('../../assets/images/landing_bg.png')}
            style={styles.container}
            resizeMode="cover"
        >
            <LinearGradient
                colors={['rgba(3,5,16,0.7)', 'rgba(10,11,18,0.95)', '#05040a']}
                style={StyleSheet.absoluteFillObject}
            />

            <SafeAreaView style={styles.safeArea}>
                {/* Background ₹ particles */}
                <CoinParticle delay={0}    left={width * 0.1} size={14} />
                <CoinParticle delay={2000} left={width * 0.4} size={20} />
                <CoinParticle delay={1000} left={width * 0.7} size={16} />
                <CoinParticle delay={3000} left={width * 0.9} size={12} />
                <CoinParticle delay={4000} left={width * 0.2} size={18} />

                {/* Hero section */}
                <View style={styles.centralContent}>
                    {/* Brand name moved here to prevent overlap */}
                    <Text style={styles.logoMiniText}>CENTSIBLE.</Text>

                    {/* Coin — pure code, no PNG */}
                    <Animated.View style={[styles.mainCoinWrapper, { transform: [{ translateY: floatValue }] }]}>
                        {/* Outer glow ring */}
                        <View style={styles.glowRing} />
                        <CoinLogo spin={spin} />
                    </Animated.View>

                    <Text style={styles.brandTitle}>spend smarter,</Text>
                    <Text style={styles.brandAccent}>not harder.</Text>
                    <Text style={styles.subtitle}>
                        Your local-first expense tracker{"\n"}powered by secure AI.
                    </Text>
                </View>

                {/* Auth buttons */}
                <Animated.View style={[styles.authContainer, { opacity: entranceOpacity, transform: [{ translateY: entranceSlide }] }]}>
                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            navigation.navigate('SignIn', { prefillMethod: 'phone' });
                        }}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={['#22d3ee', '#0ea5e9']}
                            style={styles.btnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <MaterialCommunityIcons name="phone" size={20} color="#080810" />
                            <Text style={styles.primaryBtnText}>Sign In with Phone</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryBtn, { backgroundColor: '#FFF' }]}
                        onPress={handleGoogleLogin}
                    >
                        <MaterialCommunityIcons name="google" size={20} color="#000" />
                        <Text style={[styles.secondaryBtnText, { color: '#000' }]}>Continue with Google</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryBtn}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigation.navigate('SignIn');
                        }}
                    >
                        <MaterialCommunityIcons name="email-outline" size={20} color="#FFF" />
                        <Text style={styles.secondaryBtnText}>Sign In with Email</Text>
                    </TouchableOpacity>

                    <View style={styles.signupContainer}>
                        <Text style={styles.footerText}>New to Centsible?</Text>
                        <TouchableOpacity onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigation.navigate('SignIn');
                        }}>
                            <Text style={styles.signupText}>Create an Account</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </SafeAreaView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050508' },
    safeArea:  { flex: 1, justifyContent: 'space-between', padding: 24 },

    bgCoin: {
        position: 'absolute',
        color: '#22d3ee',
        opacity: 0.12,
        fontFamily: 'Outfit_800ExtraBold',
    },

    logoMiniText: {
        fontFamily: 'Outfit_800ExtraBold',
        fontSize: 13,
        color: '#334060',
        letterSpacing: 5,
        marginBottom: 12,
    },

    centralContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    mainCoinWrapper: {
        width: 180,
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    glowRing: {
        position: 'absolute',
        width: 170,
        height: 170,
        borderRadius: 85,
        borderWidth: 1.5,
        borderColor: 'rgba(34,211,238,0.45)',
        backgroundColor: 'rgba(34,211,238,0.04)',
    },

    brandTitle: {
        fontFamily: 'Outfit_800ExtraBold',
        fontSize: 42,
        color: '#FFF',
        letterSpacing: -1.5,
        textAlign: 'center',
    },
    brandAccent: {
        fontFamily: 'Outfit_800ExtraBold',
        fontSize: 42,
        color: '#22d3ee',
        letterSpacing: -1.5,
        textAlign: 'center',
        marginTop: -8,
    },
    subtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        lineHeight: 22,
        color: '#A0A0A0',
        marginTop: 14,
        marginBottom: 24,
        textAlign: 'center',
        paddingHorizontal: 20,
    },

    authContainer: { paddingBottom: 20, gap: 14 },

    primaryBtn: { height: 58, borderRadius: 20, overflow: 'hidden' },
    btnGradient: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        borderRadius: 20,
    },
    primaryBtnText: { fontFamily: 'Outfit_700Bold', fontSize: 16, color: '#080810' },

    secondaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1E1E28',
        paddingVertical: 18,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#33344A',
        gap: 12,
    },
    secondaryBtnText: { fontFamily: 'Outfit_700Bold', fontSize: 16, color: '#FFF' },

    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        gap: 8,
    },
    footerText: { fontFamily: 'Inter_400Regular', color: '#666', fontSize: 14 },
    signupText: {
        fontFamily: 'Inter_600SemiBold',
        color: '#FFF',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});

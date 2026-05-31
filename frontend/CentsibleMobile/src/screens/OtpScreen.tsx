import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { LinearGradient } from 'expo-linear-gradient';
import { verifyOtp } from '../services/authService';
import api from '../services/api';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Otp'>;
    route: RouteProp<RootStackParamList, 'Otp'>;
};

/** How many seconds before they can request a new OTP */
const RESEND_COOLDOWN = 30;

export default function OtpScreen({ navigation, route }: Props) {
    const { method, value } = route.params;

    // Stage 1: OTP entry; Stage 2: name capture (new users only)
    const [stage, setStage] = useState<'otp' | 'name'>('otp');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [fullName, setFullName] = useState('');
    const [pendingUser, setPendingUser] = useState<any>(null);
    const [resendCooldown, setResendCooldown] = useState(0);
    const inputs = useRef<TextInput[]>([]);
    const nameInputRef = useRef<TextInput>(null);

    // ── OTP Verification ──────────────────────────────────────────────────────
    const handleVerify = async () => {
        setIsLoading(true);
        const otpString = otp.join('');
        const result = await verifyOtp(method, value, otpString);
        setIsLoading(false);

        if (!result.success) {
            Alert.alert('Verification Failed', result.message ?? 'Invalid OTP. Please try again.');
            return;
        }

        const user = result.user!;

        // New user: fullName was auto-set to "Centsible User" — ask for their real name
        if (!user.isOnboarded && (user.fullName === 'Centsible User' || !user.fullName?.trim())) {
            setPendingUser(user);
            setStage('name');
            // Focus name input after a brief delay for animation
            setTimeout(() => nameInputRef.current?.focus(), 200);
            return;
        }

        // Existing user: route based on onboarding status
        if (!user.isOnboarded) {
            navigation.replace('Onboarding');
        } else {
            navigation.replace('MainTabs');
        }
    };

    // ── Name Update after first login ─────────────────────────────────────────
    const handleNameSubmit = async () => {
        const trimmedName = fullName.trim();
        if (!trimmedName || trimmedName.length < 2) {
            Alert.alert('Please enter your name', 'A name with at least 2 characters is required.');
            return;
        }

        setIsLoading(true);
        try {
            // Patch the user's name via the API
            await api.patch('/Users/me/name', { fullName: trimmedName });
        } catch {
            // Non-fatal: if update fails, we still continue to onboarding
            console.warn('[OTP] Name update failed — continuing with default name');
        }
        setIsLoading(false);

        navigation.replace('Onboarding');
    };

    // ── OTP Input Handling ────────────────────────────────────────────────────
    const handleChange = (text: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);
        if (text && index < 5) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;

        try {
            await api.post('/Auth/login', { method, value });
            setOtp(['', '', '', '', '', '']);
            inputs.current[0]?.focus();
            // Start cooldown
            setResendCooldown(RESEND_COOLDOWN);
            const interval = setInterval(() => {
                setResendCooldown(prev => {
                    if (prev <= 1) { clearInterval(interval); return 0; }
                    return prev - 1;
                });
            }, 1000);
        } catch {
            Alert.alert('Error', 'Failed to resend OTP. Please try again.');
        }
    };

    const isComplete = otp.every(d => d !== '');

    // ─────────────────────────────────────────────────────────────────────────
    // Stage 2: Name Capture
    // ─────────────────────────────────────────────────────────────────────────
    if (stage === 'name') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => setStage('otp')}>
                        <MaterialCommunityIcons name="chevron-left" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>What's your name?</Text>
                        <Text style={styles.subtitle}>
                            This is how you'll appear in the app and in group budgets.
                        </Text>
                    </View>

                    <View style={styles.nameInputWrapper}>
                        <MaterialCommunityIcons name="account-outline" size={20} color="#666" style={{ marginRight: 12 }} />
                        <TextInput
                            ref={nameInputRef}
                            style={styles.nameInput}
                            placeholder="Your full name"
                            placeholderTextColor="#555"
                            value={fullName}
                            onChangeText={setFullName}
                            autoCapitalize="words"
                            returnKeyType="done"
                            onSubmitEditing={handleNameSubmit}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryBtn, (!fullName.trim() || fullName.trim().length < 2) && styles.primaryBtnDisabled]}
                        onPress={handleNameSubmit}
                        disabled={!fullName.trim() || fullName.trim().length < 2 || isLoading}
                    >
                        <LinearGradient
                            colors={fullName.trim().length >= 2 && !isLoading ? ['#22d3ee', '#0ea5e9'] : ['#1C1C22', '#1C1C22']}
                            style={styles.btnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#080810" />
                            ) : (
                                <Text style={[styles.primaryBtnText, fullName.trim().length < 2 && styles.primaryBtnTextDisabled]}>
                                    Continue →
                                </Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.replace('Onboarding')}>
                        <Text style={styles.skipText}>Skip for now</Text>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Stage 1: OTP Entry
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="chevron-left" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>Check your {method}.</Text>
                    <Text style={styles.subtitle}>We sent a 6-digit code to {value}</Text>
                </View>

                <View style={styles.otpContainer}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref: TextInput | null) => { if (ref) inputs.current[index] = ref; }}
                            style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                            keyboardType="number-pad"
                            maxLength={1}
                            value={digit}
                            onChangeText={(text) => handleChange(text, index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                        />
                    ))}
                </View>

                <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0}>
                    <Text style={styles.resendText}>
                        Didn't receive the code?{' '}
                        <Text style={[styles.resendHighlight, resendCooldown > 0 && { color: '#444' }]}>
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
                        </Text>
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.primaryBtn, !isComplete && styles.primaryBtnDisabled]}
                    onPress={handleVerify}
                    disabled={!isComplete || isLoading}
                >
                    <LinearGradient
                        colors={isComplete && !isLoading ? ['#22d3ee', '#0ea5e9'] : ['#1C1C22', '#1C1C22']}
                        style={styles.btnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#080810" />
                        ) : (
                            <Text style={[styles.primaryBtnText, !isComplete && styles.primaryBtnTextDisabled]}>
                                Verify & Login
                            </Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                {/* Demo Login — only visible in development builds, never in production */}
                {__DEV__ && (
                    <TouchableOpacity
                        style={styles.demoBtn}
                        onPress={() => navigation.replace('MainTabs')}
                    >
                        <MaterialCommunityIcons name="lightning-bolt" size={16} color="#22d3ee" />
                        <Text style={styles.demoBtnText}>Demo Login (Dev Only)</Text>
                    </TouchableOpacity>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050508' },
    header: { padding: 24 },
    backBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#1C1C22', justifyContent: 'center', alignItems: 'center',
    },
    content: { flex: 1, paddingHorizontal: 24 },
    titleContainer: { marginTop: 20, marginBottom: 40 },
    title: {
        fontFamily: 'Outfit_800ExtraBold', fontSize: 36, color: '#FFF', marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'Inter_400Regular', fontSize: 15, color: '#A0A0A0', lineHeight: 22,
    },
    otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
    otpInput: {
        width: 50, height: 60, backgroundColor: '#111218', borderWidth: 1,
        borderColor: '#2A2A35', borderRadius: 12, color: '#FFF',
        fontSize: 24, fontFamily: 'Outfit_700Bold', textAlign: 'center',
    },
    otpInputFilled: { borderColor: '#22d3ee', backgroundColor: '#1A2333' },
    resendText: {
        fontFamily: 'Inter_400Regular', fontSize: 14, color: '#666',
        textAlign: 'center', marginBottom: 40,
    },
    resendHighlight: { color: '#22d3ee', fontFamily: 'Inter_600SemiBold' },
    primaryBtn: { height: 56, borderRadius: 16, overflow: 'hidden', marginTop: 8 },
    btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    primaryBtnDisabled: { opacity: 0.7 },
    primaryBtnText: { fontFamily: 'Outfit_700Bold', fontSize: 16, color: '#080810' },
    primaryBtnTextDisabled: { color: '#666' },
    demoBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginTop: 20, gap: 8, paddingVertical: 12,
    },
    demoBtnText: {
        fontFamily: 'Inter_600SemiBold', fontSize: 14,
        color: '#22d3ee', textDecorationLine: 'underline',
    },
    // Name capture stage
    nameInputWrapper: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#111218',
        borderWidth: 1, borderColor: '#2A2A35', borderRadius: 16,
        paddingHorizontal: 16, height: 60, marginBottom: 32,
    },
    nameInput: {
        flex: 1, fontFamily: 'Inter_500Medium', fontSize: 18, color: '#FFF',
    },
    skipBtn: { alignItems: 'center', marginTop: 16, paddingVertical: 12 },
    skipText: {
        fontFamily: 'Inter_400Regular', fontSize: 14, color: '#555',
        textDecorationLine: 'underline',
    },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { LinearGradient } from 'expo-linear-gradient';
import { RouteProp } from '@react-navigation/native';
import { requestOtp, googleLogin } from '../services/authService';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'SignIn'>;
    route: RouteProp<RootStackParamList, 'SignIn'>;
};

export default function SignInScreen({ navigation, route }: Props) {
    const prefill = route.params;
    const [authMode, setAuthMode] = useState<'phone' | 'email'>(prefill?.prefillMethod || 'phone');
    const [inputValue, setInputValue] = useState(prefill?.prefillValue || '');
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        const result = await googleLogin();
        setIsLoading(false);

        if (result.success && result.user) {
            if (!result.user.isOnboarded) {
                navigation.replace('Onboarding');
            } else {
                navigation.replace('MainTabs');
            }
        } else if (!result.success) {
            Alert.alert(
                'Google Sign-In',
                result.message || 'Use phone or email OTP for now. Google OAuth requires Supabase setup in supabaseService.ts.'
            );
        }
    };

    const handleContinue = async () => {
        if (!inputValue) return;
        
        setIsLoading(true);
        const result = await requestOtp(authMode, inputValue);
        setIsLoading(false);

        if (result.success) {
            navigation.navigate('Otp', { 
                method: authMode, 
                value: inputValue 
            });
            
            // In dev mode, show the OTP for convenience
            if (result.devOtp) {
                console.log(`[DEV] OTP for ${inputValue}: ${result.devOtp}`);
            }
        } else {
            Alert.alert("Authentication Error", result.message);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>Welcome back.</Text>
                    <Text style={styles.subtitle}>Enter your details to securely access your data.</Text>
                </View>

                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, authMode === 'phone' && styles.toggleBtnActive]}
                        onPress={() => setAuthMode('phone')}
                    >
                        <Text style={[styles.toggleText, authMode === 'phone' && styles.toggleTextActive]}>Phone</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, authMode === 'email' && styles.toggleBtnActive]}
                        onPress={() => setAuthMode('email')}
                    >
                        <Text style={[styles.toggleText, authMode === 'email' && styles.toggleTextActive]}>Email</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>{authMode === 'phone' ? 'Phone Number' : 'Email Address'}</Text>
                    <View style={styles.inputWrapper}>
                        {authMode === 'phone' && <Text style={styles.phonePrefix}>+91</Text>}
                        <TextInput
                            style={styles.input}
                            placeholder={authMode === 'phone' ? "99999 00000" : "name@example.com"}
                            placeholderTextColor="#666"
                            keyboardType={authMode === 'phone' ? 'phone-pad' : 'email-address'}
                            value={inputValue}
                            onChangeText={setInputValue}
                            autoFocus
                        />
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.primaryBtn, !inputValue && styles.primaryBtnDisabled]}
                    onPress={handleContinue}
                    disabled={!inputValue || isLoading}
                >
                    <LinearGradient
                        colors={inputValue && !isLoading ? ['#22d3ee', '#0ea5e9'] : ['#1C1C22', '#1C1C22']}
                        style={styles.btnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#080810" />
                        ) : (
                            <Text style={[styles.primaryBtnText, !inputValue && styles.primaryBtnTextDisabled]}>Continue</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                {authMode === 'email' && (
                    <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin}>
                        <Ionicons name="logo-google" size={20} color="#FFF" />
                        <Text style={styles.googleBtnText}>Continue with Google</Text>
                    </TouchableOpacity>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050508',
    },
    header: {
        padding: 24,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1C1C22',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
    },
    titleContainer: {
        marginTop: 20,
        marginBottom: 40,
    },
    title: {
        fontFamily: 'Outfit_800ExtraBold',
        fontSize: 36,
        color: '#FFF',
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: 15,
        color: '#A0A0A0',
        lineHeight: 22,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#111218',
        borderRadius: 16,
        padding: 4,
        marginBottom: 32,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
    },
    toggleBtnActive: {
        backgroundColor: '#1E1E28',
    },
    toggleText: {
        fontFamily: 'Inter_500Medium',
        color: '#666',
        fontSize: 14,
    },
    toggleTextActive: {
        color: '#FFF',
        fontFamily: 'Inter_600SemiBold',
    },
    inputContainer: {
        marginBottom: 40,
    },
    inputLabel: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: '#A0A0A0',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111218',
        borderWidth: 1,
        borderColor: '#2A2A35',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
    },
    phonePrefix: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 16,
        color: '#FFF',
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontFamily: 'Inter_500Medium',
        fontSize: 16,
        color: '#FFF',
    },
    primaryBtn: {
        height: 56,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
    },
    btnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryBtnDisabled: {
        opacity: 0.7,
    },
    primaryBtnText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 16,
        color: '#080810',
    },
    primaryBtnTextDisabled: {
        color: '#666',
    },
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        backgroundColor: '#111218',
        borderWidth: 1,
        borderColor: '#2A2A35',
        borderRadius: 16,
        gap: 12,
    },
    googleBtnText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
        color: '#FFF',
    }
});

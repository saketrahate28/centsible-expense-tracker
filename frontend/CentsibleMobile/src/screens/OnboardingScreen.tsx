import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ScrollView, Animated, Easing,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import api from '../services/api';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

const BANK_COUNT_OPTIONS = [1, 2, 3, 4, 5];

const steps = [
    { id: 0, title: "What's your name?", subtitle: 'We\'ll personalize your experience.' },
    { id: 1, title: "How old are you?", subtitle: 'Age helps us tailor financial insights for you.' },
    { id: 2, title: "How many bank accounts\nwill you sync?", subtitle: 'We auto-detect bank SMS to track expenses.' },
];

export default function OnboardingScreen({ navigation }: Props) {
    const [step, setStep] = useState(0);
    const [fullName, setFullName] = useState('');
    const [age, setAge] = useState('');
    const [bankCount, setBankCount] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const progressAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    const goNext = () => {
        // Validate current step
        if (step === 0 && fullName.trim().length < 2) {
            Alert.alert('Name Required', 'Please enter your full name.');
            return;
        }
        if (step === 1 && (parseInt(age) < 13 || parseInt(age) > 100 || isNaN(parseInt(age)))) {
            Alert.alert('Invalid Age', 'Please enter a valid age between 13 and 100.');
            return;
        }

        if (step < steps.length - 1) {
            // Animate progress bar
            Animated.timing(progressAnim, {
                toValue: (step + 1) / (steps.length - 1),
                duration: 400,
                easing: Easing.out(Easing.quad),
                useNativeDriver: false,
            }).start();

            // Slide out & in
            Animated.sequence([
                Animated.timing(slideAnim, { toValue: -30, duration: 150, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
            ]).start();

            setStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = async () => {
        setIsLoading(true);
        try {
            const response = await api.post('/User/onboard', {
                fullName: fullName.trim(),
                age: parseInt(age),
                expectedBankAccountsCount: bankCount,
            });
            
            // Update the locally stored user profile so the Dashboard picks it up
            const updatedUser = response.data.user;
            if (updatedUser) {
                const { setStoredUser } = require('../services/authService');
                await setStoredUser(updatedUser);
            }
            
            navigation.replace('Permissions');
        } catch (error) {
            console.warn('Onboarding save failed — continuing anyway:', error);
            navigation.replace('Permissions');
        } finally {
            setIsLoading(false);
        }
    };

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    const currentStep = steps[step];
    const canProceed =
        (step === 0 && fullName.trim().length >= 2) ||
        (step === 1 && !isNaN(parseInt(age)) && parseInt(age) >= 13) ||
        step === 2;

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressTrack}>
                        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
                    </View>
                    <Text style={styles.stepCount}>{step + 1} / {steps.length}</Text>
                </View>

                <Animated.View style={[styles.content, { transform: [{ translateX: slideAnim }] }]}>
                    {/* Step title */}
                    <View style={styles.titleBlock}>
                        <Text style={styles.title}>{currentStep.title}</Text>
                        <Text style={styles.subtitle}>{currentStep.subtitle}</Text>
                    </View>

                    {/* Step 0: Name */}
                    {step === 0 && (
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Aryan Sharma"
                            placeholderTextColor="#555"
                            value={fullName}
                            onChangeText={setFullName}
                            autoFocus
                            autoCapitalize="words"
                        />
                    )}

                    {/* Step 1: Age */}
                    {step === 1 && (
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 22"
                            placeholderTextColor="#555"
                            value={age}
                            onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad"
                            maxLength={3}
                            autoFocus
                        />
                    )}

                    {/* Step 2: Bank count */}
                    {step === 2 && (
                        <View style={styles.bankCountRow}>
                            {BANK_COUNT_OPTIONS.map((n) => (
                                <TouchableOpacity
                                    key={n}
                                    style={[styles.bankChip, bankCount === n && styles.bankChipActive]}
                                    onPress={() => setBankCount(n)}
                                >
                                    <Text style={[styles.bankChipText, bankCount === n && styles.bankChipTextActive]}>
                                        {n}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </Animated.View>

                {/* CTA */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.nextBtn, !canProceed && styles.nextBtnDisabled]}
                        onPress={goNext}
                        disabled={!canProceed || isLoading}
                        activeOpacity={0.85}
                    >
                        <LinearGradient
                            colors={canProceed ? ['#22d3ee', '#0ea5e9'] : ['#1C1C22', '#1C1C22']}
                            style={styles.btnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#080810" />
                            ) : (
                                <>
                                    <Text style={[styles.nextBtnText, !canProceed && styles.nextBtnTextDisabled]}>
                                        {step < steps.length - 1 ? 'Continue' : "Let's Go →"}
                                    </Text>
                                    {canProceed && <MaterialCommunityIcons name="arrow-right" size={20} color="#080810" />}
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050508' },

    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 8,
        gap: 16,
    },
    progressTrack: {
        flex: 1,
        height: 4,
        backgroundColor: '#1C1C28',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#22d3ee',
        borderRadius: 2,
    },
    stepCount: {
        fontFamily: 'Inter_500Medium',
        fontSize: 13,
        color: '#555',
    },

    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 48,
    },

    titleBlock: { marginBottom: 40 },
    title: {
        fontFamily: 'Outfit_800ExtraBold',
        fontSize: 34,
        color: '#FFF',
        lineHeight: 42,
        marginBottom: 12,
    },
    subtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: 15,
        color: '#888',
        lineHeight: 22,
    },

    input: {
        backgroundColor: '#111218',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#2A2A35',
        paddingHorizontal: 20,
        paddingVertical: 20,
        fontFamily: 'Outfit_700Bold',
        fontSize: 24,
        color: '#FFF',
    },

    bankCountRow: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
    },
    bankChip: {
        width: 64,
        height: 64,
        borderRadius: 18,
        backgroundColor: '#111218',
        borderWidth: 1.5,
        borderColor: '#2A2A35',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bankChipActive: {
        backgroundColor: 'rgba(34,211,238,0.12)',
        borderColor: '#22d3ee',
    },
    bankChipText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 22,
        color: '#555',
    },
    bankChipTextActive: {
        color: '#22d3ee',
    },

    footer: {
        paddingHorizontal: 24,
        paddingBottom: 32,
    },
    nextBtn: {
        height: 58,
        borderRadius: 20,
        overflow: 'hidden',
    },
    nextBtnDisabled: {
        opacity: 0.5,
    },
    btnGradient: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    nextBtnText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 17,
        color: '#080810',
    },
    nextBtnTextDisabled: {
        color: '#555',
    },
});

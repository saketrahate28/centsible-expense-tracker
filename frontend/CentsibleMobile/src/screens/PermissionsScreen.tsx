import React, { useRef, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Animated,
    Easing, Platform, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import * as Location from 'expo-location';
import api from '../services/api';
import { syncHistoricalSms } from '../services/smsSyncService';
import {
    requestSmsPermissions,
    openAppSettings,
    SMS_ENABLED_KEY,
} from '../services/smsPermissionService';
import { setSmsTrackingEnabled } from '../services/smsRealtimeService';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Permissions'>;
};

type PermState = 'idle' | 'granted' | 'denied';

export default function PermissionsScreen({ navigation }: Props) {
    const [locationState, setLocationState] = useState<PermState>('idle');
    const [smsState, setSmsState] = useState<PermState>('idle');

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 700, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
        ]).start();
    }, []);

    const requestLocation = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
            setLocationState('granted');
            try {
                // Get current city and save to backend
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const [geo] = await Location.reverseGeocodeAsync(loc.coords);
                const city = geo?.city || geo?.subregion || geo?.region || 'Unknown';
                await api.patch('/User/city', { city });
                console.log(`📍 City tagged: ${city}`);
            } catch (e) {
                console.warn('Could not get city:', e);
            }
        } else {
            setLocationState('denied');
        }
    };
    const requestSms = async () => {
        if (Platform.OS !== 'android') {
            Alert.alert(
                'iOS Not Supported',
                'SMS auto-detection is an Android-exclusive feature due to Apple privacy policies. You can still add expenses manually.',
                [{ text: 'Got it', onPress: () => setSmsState('denied') }]
            );
            return;
        }

        Alert.alert(
            'SMS Access',
            'Centsible reads bank transaction SMS on this device to log expenses. You can turn this off anytime in Profile.\n\nRequires a development build (not Expo Go).',
            [
                {
                    text: 'Allow',
                    onPress: async () => {
                        const status = await requestSmsPermissions();
                        if (status === 'granted') {
                            setSmsState('granted');
                            await AsyncStorage.setItem(SMS_ENABLED_KEY, 'true');
                            await setSmsTrackingEnabled(true);
                            syncHistoricalSms(365).then((r) => {
                                if (r.saved > 0) {
                                    Alert.alert(
                                        'Sync Complete',
                                        `Imported ${r.saved} new transaction(s). ${r.skipped > 0 ? `${r.skipped} already on file.` : ''}`
                                    );
                                }
                            }).catch((e) => console.warn('SMS Sync failed:', e));
                        } else if (status === 'never_ask_again') {
                            setSmsState('denied');
                            Alert.alert(
                                'Permission Required',
                                'Enable SMS in Android Settings to use auto-tracking.',
                                [
                                    { text: 'Open Settings', onPress: openAppSettings },
                                    { text: 'Cancel', style: 'cancel' },
                                ]
                            );
                        } else {
                            setSmsState('denied');
                        }
                    },
                },
                { text: 'Skip for Now', style: 'cancel', onPress: () => setSmsState('denied') },
            ]
        );
    };


    const allDone = locationState !== 'idle' && smsState !== 'idle';

    const PermCard = ({
        icon, title, desc, state, onPress, color
    }: {
        icon: string; title: string; desc: string;
        state: PermState; onPress: () => void; color: string;
    }) => {
        const granted = state === 'granted';
        const denied = state === 'denied';
        return (
            <TouchableOpacity
                style={[styles.permCard, granted && styles.permCardGranted, denied && styles.permCardDenied]}
                onPress={onPress}
                disabled={state !== 'idle'}
                activeOpacity={0.8}
            >
                <View style={[styles.permIconBg, { backgroundColor: `${color}18` }]}>
                    <MaterialCommunityIcons
                        name={granted ? 'check-circle' : icon as any}
                        size={28}
                        color={granted ? '#22d3ee' : denied ? '#555' : color}
                    />
                </View>
                <View style={styles.permText}>
                    <Text style={[styles.permTitle, denied && styles.permTitleDenied]}>{title}</Text>
                    <Text style={styles.permDesc}>{desc}</Text>
                </View>
                {state === 'idle' && (
                    <View style={[styles.allowBadge, { backgroundColor: color }]}>
                        <Text style={styles.allowBadgeText}>Allow</Text>
                    </View>
                )}
                {granted && <MaterialCommunityIcons name="check" size={22} color="#22d3ee" />}
                {denied && <MaterialCommunityIcons name="minus-circle-outline" size={22} color="#333" />}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

                {/* Header */}
                <View style={styles.header}>
                    <LinearGradient colors={['#22d3ee22', '#0ea5e900']} style={styles.headerGlow} />
                    <MaterialCommunityIcons name="shield-check-outline" size={52} color="#22d3ee" />
                    <Text style={styles.title}>Let's give Centsible{'\n'}superpowers.</Text>
                    <Text style={styles.subtitle}>
                        We need two quick permissions.{'\n'}
                        All data stays on your device — always.
                    </Text>
                </View>

                {/* Permission cards */}
                <View style={styles.cardStack}>
                    <PermCard
                        icon="map-marker-outline"
                        title="Location Access"
                        desc="Tag your transactions with the city where they happened."
                        state={locationState}
                        onPress={requestLocation}
                        color="#22d3ee"
                    />
                    <PermCard
                        icon="message-text-outline"
                        title="SMS Access"
                        desc="Auto-detect bank transactions from SMS (Android dev build required)."
                        state={smsState}
                        onPress={requestSms}
                        color="#a78bfa"
                    />
                </View>

                {/* Skip & Continue */}
                <View style={styles.footer}>
                    {allDone ? (
                        <TouchableOpacity
                            style={styles.continueBtn}
                            onPress={() => navigation.replace('MainTabs')}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={['#22d3ee', '#0ea5e9']}
                                style={styles.btnGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={styles.continueBtnText}>Enter Centsible ✦</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.skipBtn}
                            onPress={() => navigation.replace('MainTabs')}
                        >
                            <Text style={styles.skipText}>Skip for now → </Text>
                        </TouchableOpacity>
                    )}

                    <Text style={styles.privacyNote}>
                        🔒 Your data never leaves your device. We comply with India's DPDP Act.
                    </Text>
                </View>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050508' },
    content: { flex: 1, paddingHorizontal: 24 },

    header: {
        alignItems: 'center',
        paddingTop: 36,
        paddingBottom: 40,
    },
    headerGlow: {
        position: 'absolute',
        top: 0,
        width: 200,
        height: 200,
        borderRadius: 100,
    },
    title: {
        fontFamily: 'Outfit_800ExtraBold',
        fontSize: 32,
        color: '#FFF',
        textAlign: 'center',
        marginTop: 20,
        lineHeight: 40,
    },
    subtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 22,
    },

    cardStack: { gap: 16 },

    permCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111218',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1.5,
        borderColor: '#1E1E28',
        gap: 16,
    },
    permCardGranted: {
        borderColor: 'rgba(34,211,238,0.35)',
        backgroundColor: 'rgba(34,211,238,0.05)',
    },
    permCardDenied: {
        opacity: 0.5,
    },
    permIconBg: {
        width: 52,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    permText: { flex: 1 },
    permTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 16,
        color: '#FFF',
        marginBottom: 4,
    },
    permTitleDenied: { color: '#555' },
    permDesc: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
    },
    allowBadge: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 10,
    },
    allowBadgeText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 13,
        color: '#080810',
    },

    footer: { flex: 1, justifyContent: 'flex-end', paddingBottom: 32, gap: 16 },

    continueBtn: { height: 58, borderRadius: 20, overflow: 'hidden' },
    btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    continueBtnText: { fontFamily: 'Outfit_700Bold', fontSize: 17, color: '#080810' },

    skipBtn: { alignItems: 'center', paddingVertical: 16 },
    skipText: { fontFamily: 'Inter_600SemiBold', color: '#555', fontSize: 15 },

    privacyNote: {
        fontFamily: 'Inter_400Regular',
        fontSize: 12,
        color: '#333',
        textAlign: 'center',
        lineHeight: 18,
    },
});

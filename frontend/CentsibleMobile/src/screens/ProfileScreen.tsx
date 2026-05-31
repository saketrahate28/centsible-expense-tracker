import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Switch, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import PremiumModal from '../components/PremiumModal';
import { getStoredUser, setStoredUser, logout, AuthUser } from '../services/authService';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    SMS_ENABLED_KEY,
    requestSmsPermissions,
    openAppSettings,
} from '../services/smsPermissionService';
import { setSmsTrackingEnabled } from '../services/smsRealtimeService';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList>;
};

const CATEGORIES = [
    'Needs Review', 'Food & Drinks', 'Transport', 'Shopping',
    'Groceries', 'Bills & Utilities', 'Health', 'Entertainment',
    'Education', 'Investment & Finance', 'Uncategorized',
];

export default function ProfileScreen({ navigation }: Props) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isSmsEnabled, setIsSmsEnabled] = useState(true);
    const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Edit form state
    const [editName, setEditName] = useState('');
    const [editAge, setEditAge] = useState('');
    const [editCity, setEditCity] = useState('');

    // Load user every time screen comes into focus (so Dashboard edits reflect here too)
    useFocusEffect(
        useCallback(() => {
            const loadUser = async () => {
                const storedUser = await getStoredUser();
                setUser(storedUser);
                if (storedUser) {
                    setEditName(storedUser.fullName || '');
                    setEditAge((storedUser as any).age?.toString() || '');
                    setEditCity((storedUser as any).city || '');
                }
                const smsFlag = await AsyncStorage.getItem(SMS_ENABLED_KEY);
                setIsSmsEnabled(smsFlag !== 'false');
            };
            loadUser();
        }, [])
    );

    const handleSmsToggle = async (enabled: boolean) => {
        if (enabled) {
            const status = await requestSmsPermissions();
            if (status !== 'granted') {
                if (status === 'never_ask_again') {
                    Alert.alert(
                        'Permission Required',
                        'Enable SMS in Settings to track bank messages.',
                        [
                            { text: 'Open Settings', onPress: openAppSettings },
                            { text: 'Cancel', style: 'cancel' },
                        ]
                    );
                }
                setIsSmsEnabled(false);
                return;
            }
        }
        setIsSmsEnabled(enabled);
        await setSmsTrackingEnabled(enabled);
    };

    const handleSaveProfile = async () => {
        if (!editName.trim() || editName.trim().length < 2) {
            Alert.alert('Invalid Name', 'Please enter your full name (at least 2 characters).');
            return;
        }
        const ageNum = parseInt(editAge);
        if (editAge && (isNaN(ageNum) || ageNum < 13 || ageNum > 100)) {
            Alert.alert('Invalid Age', 'Please enter a valid age (13–100).');
            return;
        }

        setIsSaving(true);
        try {
            const response = await api.post('/User/onboard', {
                fullName: editName.trim(),
                age: ageNum || undefined,
                city: editCity.trim() || undefined,
                expectedBankAccountsCount: (user as any)?.expectedBankAccountsCount || 1,
            });

            const updatedUser = { ...user, ...response.data.user } as AuthUser;
            await setStoredUser(updatedUser);
            setUser(updatedUser);
            setIsEditing(false);
            Alert.alert('✅ Profile Updated', 'Your details have been saved successfully.');
        } catch (e) {
            console.warn('Profile save failed:', e);
            // Save locally even if backend fails
            const localUser = {
                ...user,
                fullName: editName.trim(),
            } as AuthUser;
            await setStoredUser(localUser);
            setUser(localUser);
            setIsEditing(false);
            Alert.alert('Saved Locally', 'Profile updated on this device (will sync when connected).');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out', style: 'destructive', onPress: async () => {
                    await logout();
                    navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
                }
            },
        ]);
    };

    const SettingItem = ({ icon, title, subtitle, value, onValueChange, type = 'chevron', onPress }: any) => (
        <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={type === 'switch'} activeOpacity={0.7}>
            <View style={styles.settingIconContainer}>
                <Ionicons name={icon} size={22} color="#22d3ee" />
            </View>
            <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>{title}</Text>
                {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
            </View>
            {type === 'switch' ? (
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: '#333', true: '#22d3ee' }}
                    thumbColor={value ? '#FFF' : '#666'}
                />
            ) : (
                <Ionicons name="chevron-forward" size={20} color="#333" />
            )}
        </TouchableOpacity>
    );

    const initial = user?.fullName?.charAt(0)?.toUpperCase() || 'U';

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* ── Profile Header ── */}
                    <View style={styles.header}>
                        <View style={styles.avatarContainer}>
                            <LinearGradient colors={['#22d3ee', '#0ea5e9']} style={styles.avatarGradient}>
                                <Text style={styles.avatarText}>{initial}</Text>
                            </LinearGradient>
                            <TouchableOpacity style={styles.editBadge} onPress={() => setIsEditing(true)}>
                                <Ionicons name="pencil" size={13} color="#080810" />
                            </TouchableOpacity>
                        </View>

                        {!isEditing ? (
                            <>
                                <Text style={styles.userName}>{user?.fullName || 'Centsible User'}</Text>
                                <Text style={styles.userEmail}>{user?.email || user?.phone || 'No contact info'}</Text>
                                {(user as any)?.city && (
                                    <View style={styles.cityRow}>
                                        <Ionicons name="location-outline" size={14} color="#666" />
                                        <Text style={styles.cityText}>{(user as any).city}</Text>
                                    </View>
                                )}
                                <TouchableOpacity style={styles.editProfileBtn} onPress={() => setIsEditing(true)}>
                                    <MaterialCommunityIcons name="account-edit-outline" size={18} color="#22d3ee" />
                                    <Text style={styles.editProfileText}>Edit Profile</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            /* ── Edit Form ── */
                            <View style={styles.editForm}>
                                <Text style={styles.editFormTitle}>Edit Your Profile</Text>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Full Name</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editName}
                                        onChangeText={setEditName}
                                        placeholder="Your full name"
                                        placeholderTextColor="#555"
                                        autoCapitalize="words"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Age</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editAge}
                                        onChangeText={(t) => setEditAge(t.replace(/[^0-9]/g, ''))}
                                        placeholder="Your age"
                                        placeholderTextColor="#555"
                                        keyboardType="number-pad"
                                        maxLength={3}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>City</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editCity}
                                        onChangeText={setEditCity}
                                        placeholder="e.g. Bengaluru"
                                        placeholderTextColor="#555"
                                        autoCapitalize="words"
                                    />
                                </View>

                                <View style={styles.editActions}>
                                    <TouchableOpacity
                                        style={styles.cancelBtn}
                                        onPress={() => setIsEditing(false)}
                                        disabled={isSaving}
                                    >
                                        <Text style={styles.cancelBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.saveBtn}
                                        onPress={handleSaveProfile}
                                        disabled={isSaving}
                                    >
                                        {isSaving
                                            ? <ActivityIndicator size="small" color="#080810" />
                                            : <Text style={styles.saveBtnText}>Save</Text>
                                        }
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* ── Subscription Card ── */}
                    <LinearGradient
                        colors={['#1A2333', '#0a0b12']}
                        style={styles.premiumCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.premiumTextContent}>
                            <Text style={styles.premiumTitle}>Centsible Pro</Text>
                            <Text style={styles.premiumSubtitle}>Get AI-powered deep insights & shared budgets</Text>
                        </View>
                        <TouchableOpacity style={styles.upgradeBtn} onPress={() => setShowPremiumModal(true)}>
                            <Text style={styles.upgradeBtnText}>Upgrade</Text>
                        </TouchableOpacity>
                    </LinearGradient>

                    {/* ── Preferences ── */}
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <View style={styles.settingsGroup}>
                        <SettingItem
                            icon="mail-unread-outline"
                            title="SMS Tracking"
                            subtitle="Automatically track bank SMS"
                            type="switch"
                            value={isSmsEnabled}
                            onValueChange={handleSmsToggle}
                        />
                        <SettingItem
                            icon="finger-print-outline"
                            title="Biometric Lock"
                            subtitle="Secure with Fingerprint"
                            type="switch"
                            value={isBiometricsEnabled}
                            onValueChange={setIsBiometricsEnabled}
                        />
                        <SettingItem icon="notifications-outline" title="Notifications" />
                    </View>

                    {/* ── Accounts & Data ── */}
                    <Text style={styles.sectionTitle}>Accounts & Data</Text>
                    <View style={styles.settingsGroup}>
                        <SettingItem icon="wallet-outline" title="Manage Bank Accounts" />
                        <SettingItem icon="cloud-upload-outline" title="Export Data (CSV/Excel)" />
                        <SettingItem icon="shield-checkmark-outline" title="Privacy & Security" />
                    </View>

                    {/* ── Logout ── */}
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={20} color="#FF4B4B" />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>

                    <Text style={styles.versionText}>Centsible v1.0.24 (BETA)</Text>

                </ScrollView>
            </KeyboardAvoidingView>

            <PremiumModal isVisible={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050508' },
    scrollContent: { paddingBottom: 120 },

    header: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },
    avatarContainer: { position: 'relative', marginBottom: 16 },
    avatarGradient: {
        width: 100, height: 100, borderRadius: 50,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: '#1E1E28',
    },
    avatarText: { fontFamily: 'Outfit_800ExtraBold', fontSize: 42, color: '#080810' },
    editBadge: {
        position: 'absolute', bottom: 0, right: 0,
        backgroundColor: '#FFF', width: 32, height: 32, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: '#050508',
    },
    userName: { fontFamily: 'Outfit_700Bold', fontSize: 24, color: '#FFF', marginBottom: 4, textAlign: 'center' },
    userEmail: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#666', marginBottom: 8 },
    cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
    cityText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#666' },
    editProfileBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(34,211,238,0.1)', paddingHorizontal: 20, paddingVertical: 10,
        borderRadius: 14, borderWidth: 1, borderColor: 'rgba(34,211,238,0.25)',
    },
    editProfileText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#22d3ee' },

    // Edit form
    editForm: { width: '100%', gap: 16 },
    editFormTitle: { fontFamily: 'Outfit_700Bold', fontSize: 20, color: '#FFF', marginBottom: 4, textAlign: 'center' },
    inputGroup: { gap: 8 },
    inputLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#888' },
    input: {
        backgroundColor: '#111218', borderRadius: 14, borderWidth: 1, borderColor: '#2A2A35',
        paddingHorizontal: 16, paddingVertical: 14,
        fontFamily: 'Inter_400Regular', fontSize: 16, color: '#FFF',
    },
    editActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 14,
        backgroundColor: '#1C1C28', alignItems: 'center',
        borderWidth: 1, borderColor: '#2A2A35',
    },
    cancelBtnText: { fontFamily: 'Outfit_700Bold', fontSize: 15, color: '#888' },
    saveBtn: {
        flex: 2, paddingVertical: 14, borderRadius: 14,
        backgroundColor: '#22d3ee', alignItems: 'center',
    },
    saveBtnText: { fontFamily: 'Outfit_700Bold', fontSize: 15, color: '#080810' },

    // Subscription card
    premiumCard: {
        marginHorizontal: 24, borderRadius: 24, padding: 24,
        flexDirection: 'row', alignItems: 'center', marginBottom: 32,
        borderWidth: 1, borderColor: 'rgba(34, 211, 238, 0.2)',
    },
    premiumTextContent: { flex: 1 },
    premiumTitle: { fontFamily: 'Outfit_700Bold', fontSize: 18, color: '#22d3ee', marginBottom: 4 },
    premiumSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#A0A0A0', paddingRight: 20 },
    upgradeBtn: { backgroundColor: '#22d3ee', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    upgradeBtnText: { fontFamily: 'Outfit_700Bold', fontSize: 13, color: '#080810' },

    // Settings
    sectionTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 18, color: '#FFF', marginHorizontal: 24, marginBottom: 12 },
    settingsGroup: {
        backgroundColor: '#111218', marginHorizontal: 24, borderRadius: 24,
        padding: 8, marginBottom: 24, borderWidth: 1, borderColor: '#2A2A35',
    },
    settingItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    settingIconContainer: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: '#1E1E28', justifyContent: 'center', alignItems: 'center', marginRight: 16,
    },
    settingTextContainer: { flex: 1 },
    settingTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#FFF' },
    settingSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#666', marginTop: 2 },

    // Logout
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginHorizontal: 24, marginTop: 8, paddingVertical: 16,
        backgroundColor: '#1A1111', borderRadius: 20,
        borderWidth: 1, borderColor: '#301A1A', gap: 12,
    },
    logoutText: { fontFamily: 'Outfit_700Bold', fontSize: 16, color: '#FF4B4B' },
    versionText: { textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 12, color: '#333', marginTop: 24 },
});

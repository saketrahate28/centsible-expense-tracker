import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import * as Font from 'expo-font';
import {
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold
} from '@expo-google-fonts/outfit';
import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold
} from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LandingScreen from './src/screens/LandingScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import SignInScreen from './src/screens/SignInScreen';
import OtpScreen from './src/screens/OtpScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import PermissionsScreen from './src/screens/PermissionsScreen';
import MainTabs from './src/navigation/MainTabs';
import SharedBudgetScreen from './src/screens/SharedBudgetScreen';
import { getStoredUser, validateSession, AuthUser } from './src/services/authService';
import { initDatabase } from './src/services/databaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SMS_ENABLED_KEY, getSmsPermissionStatus } from './src/services/smsPermissionService';
import { startRealtimeSmsListener } from './src/services/smsRealtimeService';
import { flushSyncQueue } from './src/services/syncQueueService';

export type RootStackParamList = {
    Landing: undefined;
    SignIn: { prefillMethod?: 'phone' | 'email'; prefillValue?: string } | undefined;
    Otp: { method: 'phone' | 'email'; value: string };
    Onboarding: undefined;
    Permissions: undefined;
    MainTabs: { screen?: string } | undefined;
    Dashboard: undefined;
    Analytics: undefined;
    AddExpense: undefined;
    SharedBudget: undefined;
    DashboardTab: undefined;
    AnalyticsTab: undefined;
    ProfileTab: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
    const [fontsLoaded, setFontsLoaded] = useState(false);
    const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Landing');
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        async function init() {
            // Load fonts and initialize local DB
            try {
                await Promise.all([
                    Font.loadAsync({
                        Outfit_400Regular,
                        Outfit_600SemiBold,
                        Outfit_700Bold,
                        Outfit_800ExtraBold,
                        Inter_400Regular,
                        Inter_500Medium,
                        Inter_600SemiBold,
                    }),
                    initDatabase(),
                ]);
                const smsEnabled = await AsyncStorage.getItem(SMS_ENABLED_KEY);
                if (smsEnabled !== 'false') {
                    const perm = await getSmsPermissionStatus();
                    if (perm === 'granted') {
                        await startRealtimeSmsListener();
                    }
                }
                await flushSyncQueue();
            } catch (e) {
                console.warn('Initialization failed:', e);
            }
            setFontsLoaded(true);

            // Check for existing session and route accordingly
            try {
                const user = await validateSession();
                if (user) {
                    if (!user.isOnboarded) {
                        setInitialRoute('Onboarding');
                    } else {
                        setInitialRoute('MainTabs');
                    }
                } else {
                    setInitialRoute('Landing');
                }
            } catch {
                setInitialRoute('Landing');
            } finally {
                setAuthChecked(true);
            }
        }
        init();
    }, []);

    if (!fontsLoaded || !authChecked) {
        return (
            <View style={{ flex: 1, backgroundColor: '#050508', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#22d3ee" />
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <NavigationContainer>
                <Stack.Navigator
                    screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}
                    initialRouteName={initialRoute}
                >
                    {/* Auth Flow */}
                    <Stack.Screen name="Landing" component={LandingScreen} />
                    <Stack.Screen name="SignIn" component={SignInScreen} />
                    <Stack.Screen name="Otp" component={OtpScreen} />

                    {/* Onboarding Flow — only shown once after first login */}
                    <Stack.Screen
                        name="Onboarding"
                        component={OnboardingScreen}
                        options={{ gestureEnabled: false }} // Can't swipe back during onboarding
                    />
                    <Stack.Screen
                        name="Permissions"
                        component={PermissionsScreen}
                        options={{ gestureEnabled: false }}
                    />

                    {/* Main App */}
                    <Stack.Screen
                        name="MainTabs"
                        component={MainTabs}
                        options={{ gestureEnabled: false }}
                    />
                    <Stack.Screen name="Dashboard" component={DashboardScreen} />
                    <Stack.Screen name="Analytics" component={AnalyticsScreen} />
                    <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ presentation: 'modal' }} />
                    <Stack.Screen name="SharedBudget" component={SharedBudgetScreen} />
                </Stack.Navigator>
            </NavigationContainer>
        </SafeAreaProvider>
    );
}

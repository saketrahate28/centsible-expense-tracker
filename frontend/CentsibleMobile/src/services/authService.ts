/**
 * Centsible Authentication Service
 *
 * Manages JWT token lifecycle, login/verify OTP calls,
 * and SECURE token storage via expo-secure-store (hardware-backed keychain/keystore).
 *
 * Why SecureStore over AsyncStorage?
 * - AsyncStorage is plain-text on disk — readable by any app on rooted devices.
 * - SecureStore uses Android Keystore / iOS Keychain — hardware-backed encryption.
 * - For a financial app, this is non-negotiable.
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { supabase, isSupabaseConfigured } from './supabaseService';

const TOKEN_KEY = 'centsible_jwt_token';
const USER_KEY = '@centsible_user'; // User profile stays in AsyncStorage (non-sensitive)

export interface AuthUser {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    isPremium: boolean;
    isOnboarded: boolean;
    avatarUrl: string | null;
}

// ============================================================
// Token Management — SecureStore (hardware-backed encryption)
// ============================================================

export const getToken = async (): Promise<string | null> => {
    try {
        return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
        return null;
    }
};

export const setToken = async (token: string): Promise<void> => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const removeToken = async (): Promise<void> => {
    try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
        // Key may not exist — ignore
    }
    await AsyncStorage.removeItem(USER_KEY);
};

// ============================================================
// User Profile — AsyncStorage (non-sensitive cached data)
// ============================================================

export const getStoredUser = async (): Promise<AuthUser | null> => {
    try {
        const json = await AsyncStorage.getItem(USER_KEY);
        return json ? JSON.parse(json) : null;
    } catch {
        return null;
    }
};

export const setStoredUser = async (user: AuthUser): Promise<void> => {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

// ============================================================
// Auth API Calls
// ============================================================

/**
 * Request an OTP for the given phone/email.
 * Returns the devOtp only in development mode (backend guard).
 */
export const requestOtp = async (method: 'phone' | 'email', value: string) => {
    try {
        const response = await api.post('/Auth/login', { method, value });
        return {
            success: true,
            message: response.data.message,
            devOtp: response.data.devOtp, // Only present in dev mode — undefined in production
        };
    } catch (error: any) {
        console.error('OTP request failed:', error);
        return {
            success: false,
            message: error.response?.data?.message || 'Failed to send OTP. Please try again.',
        };
    }
};

/**
 * Verify OTP and receive JWT token + user profile.
 * Stores token in SecureStore and user profile in AsyncStorage.
 */
export const verifyOtp = async (method: 'phone' | 'email', value: string, otp: string) => {
    try {
        const response = await api.post('/Auth/verify', { method, value, otp });
        const { token, user } = response.data;

        // Persist token securely + user profile
        await setToken(token);
        await setStoredUser(user);

        return { success: true, user, token };
    } catch (error: any) {
        console.error('OTP verification failed:', error);
        return {
            success: false,
            message: error.response?.data?.message || 'Verification failed. Please try again.',
        };
    }
};

/**
 * Dev login without Supabase (use phone/email OTP in production).
 * Only works when the backend is in Development mode (returns devOtp).
 */
export const devLogin = async (email: string, fullName: string) => {
    try {
        const loginRes = await api.post('/Auth/login', { method: 'email', value: email });
        const otp = loginRes.data.devOtp;
        if (!otp) {
            return { success: false, message: 'Dev OTP not returned. Is the API running in Development mode?' };
        }
        const verifyRes = await api.post('/Auth/verify', { method: 'email', value: email, otp });
        const { token, user } = verifyRes.data;
        await setToken(token);
        const merged = { ...user, fullName: fullName || user.fullName };
        await setStoredUser(merged);
        return { success: true as const, user: merged as AuthUser };
    } catch (error: any) {
        console.error('Dev login failed:', error);
        return {
            success: false as const,
            message: error.response?.data?.message || 'Cannot reach API. Start Centsible.Api on port 5272.',
        };
    }
};

/**
 * Google login via Supabase OAuth (requires real Supabase URL/key in .env).
 * Falls back to dev OTP login when Supabase is not configured.
 */
export const googleLogin = async () => {
    if (!isSupabaseConfigured()) {
        return devLogin('google.demo@centsible.app', 'Centsible User');
    }

    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: 'centsible://login-callback' },
        });
        if (error) throw error;
        return { success: true as const, user: undefined };
    } catch (error: any) {
        console.error('Supabase Google login failed:', error);
        return {
            success: false as const,
            message: error.message || 'Google login failed.',
        };
    }
};

/**
 * Validate the current stored token by calling /auth/me.
 * Returns the user if valid, null if expired/invalid.
 */
export const validateSession = async (): Promise<AuthUser | null> => {
    try {
        const token = await getToken();
        if (!token) return null;

        const response = await api.get('/Auth/me');
        const user = response.data;
        await setStoredUser(user);
        return user;
    } catch {
        // Token is invalid or expired — clear it
        await removeToken();
        return null;
    }
};

/**
 * Log out: securely delete token and clear user cache.
 */
export const logout = async (): Promise<void> => {
    await removeToken();
};

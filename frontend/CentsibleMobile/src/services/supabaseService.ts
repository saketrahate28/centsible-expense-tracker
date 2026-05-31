import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * SUPABASE AUTHENTICATION SERVICE
 * 
 * Replace placeholders with your actual Supabase project credentials
 * found in Project Settings -> API.
 */

export const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder.anon_key';

export const isSupabaseConfigured = () => !supabaseUrl.includes('placeholder');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

export default supabase;

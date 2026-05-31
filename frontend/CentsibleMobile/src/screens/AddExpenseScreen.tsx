import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { saveSmsTransaction } from '../services/api';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'AddExpense'>;
};

export default function AddExpenseScreen({ navigation }: Props) {
    const [amount, setAmount] = useState('0');
    const [note, setNote] = useState('');
    const [category, setCategory] = useState('Food & Drinks');
    const [paymentMethod, setPaymentMethod] = useState('GPay');
    const [isLoading, setIsLoading] = useState(false);

    const handleNumpad = (val: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (amount === '0' && val !== '.') {
            setAmount(val);
        } else if (val === '.' && amount.includes('.')) {
            return;
        } else {
            setAmount(amount + val);
        }
    };

    const handleBackspace = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (amount.length > 1) {
            setAmount(amount.slice(0, -1));
        } else {
            setAmount('0');
        }
    };

    const handleSave = async () => {
        if (amount === '0' || amount === '') {
            Alert.alert('Error', 'Please enter an amount');
            return;
        }

        try {
            setIsLoading(true);
            await saveSmsTransaction(amount, note || category, paymentMethod);
            setIsLoading(false);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Transferred!', 'Expense logged successfully.', [
                { text: 'Awesome', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            setIsLoading(false);
            Alert.alert('Oops', 'Could not save this expense. Check your connection.');
        }
    };

    const CategoryChip = ({ name, icon }: any) => (
        <TouchableOpacity
            style={[styles.chip, category === name && styles.chipActive]}
            onPress={() => {
                Haptics.selectionAsync();
                setCategory(name);
            }}
        >
            <Ionicons name={icon} size={16} color={category === name ? '#080810' : '#A0A0A0'} style={{ marginRight: 6 }} />
            <Text style={[styles.chipText, category === name && styles.chipTextActive]}>{name}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#0a0b12', '#050508']} style={StyleSheet.absoluteFillObject} />

            <View style={styles.header}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="close" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Expense</Text>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator size="small" color="#080810" /> : <Text style={styles.saveBtnText}>Done</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.amountDisplay}>
                    <Text style={styles.currency}>₹</Text>
                    <Text style={styles.amountText}>{amount}</Text>
                </View>

                <View style={styles.inputCard}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.chipRow}>
                        <CategoryChip name="Food & Drinks" icon="fast-food-outline" />
                        <CategoryChip name="Transport" icon="car-outline" />
                        <CategoryChip name="Shopping" icon="cart-outline" />
                        <CategoryChip name="Fun" icon="game-controller-outline" />
                    </View>

                    <Text style={styles.label}>Paid Via</Text>
                    <View style={styles.chipRow}>
                        {['GPay', 'PhonePe', 'Cash', 'Credit Card'].map(m => (
                            <TouchableOpacity
                                key={m}
                                style={[styles.methodChip, paymentMethod === m && styles.methodChipActive]}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    setPaymentMethod(m);
                                }}
                            >
                                <Text style={[styles.methodText, paymentMethod === m && styles.methodTextActive]}>{m}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Notes</Text>
                    <TextInput
                        style={styles.noteInput}
                        placeholder="What was this for? (optional)"
                        placeholderTextColor="#444"
                        value={note}
                        onChangeText={setNote}
                    />
                </View>

                {/* Numpad Integration */}
                <View style={styles.numpad}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0, 'back'].map((key, i) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.numKey}
                            onPress={() => key === 'back' ? handleBackspace() : handleNumpad(key.toString())}
                        >
                            {key === 'back' ? (
                                <Ionicons name="backspace-outline" size={24} color="#FFF" />
                            ) : (
                                <Text style={styles.numKeyText}>{key}</Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

import { ScrollView } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050508',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    closeBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#1C1C22',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 18,
        color: '#FFF',
    },
    saveBtn: {
        backgroundColor: '#22d3ee',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
    },
    saveBtnText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 14,
        color: '#080810',
    },
    amountDisplay: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    currency: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 32,
        color: '#22d3ee',
        marginRight: 8,
    },
    amountText: {
        fontFamily: 'Outfit_800ExtraBold',
        fontSize: 64,
        color: '#FFF',
        letterSpacing: -2,
    },
    inputCard: {
        backgroundColor: '#111218',
        marginHorizontal: 24,
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: '#2A2A35',
    },
    label: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 13,
        color: '#666',
        marginBottom: 16,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 32,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: '#1E1E28',
        borderWidth: 1,
        borderColor: '#2A2A35',
    },
    chipActive: {
        backgroundColor: '#22d3ee',
        borderColor: '#22d3ee',
    },
    chipText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 13,
        color: '#A0A0A0',
    },
    chipTextActive: {
        color: '#080810',
        fontFamily: 'Inter_600SemiBold',
    },
    methodChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#111218',
        borderWidth: 1,
        borderColor: '#2A2A35',
    },
    methodChipActive: {
        borderColor: '#22d3ee',
    },
    methodText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 12,
        color: '#666',
    },
    methodTextActive: {
        color: '#22d3ee',
    },
    noteInput: {
        fontFamily: 'Inter_400Regular',
        fontSize: 16,
        color: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#2A2A35',
        paddingVertical: 12,
    },
    numpad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 32,
        paddingHorizontal: 12,
    },
    numKey: {
        width: (width - 60) / 3,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 6,
        borderRadius: 16,
        backgroundColor: '#111218',
    },
    numKeyText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 24,
        color: '#FFF',
    }
});

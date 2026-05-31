import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

type Group = {
    id: string;
    name: string;
    members: number;
    userBalance: number; // Positive = owed, Negative = owe
    recentActivity: string;
};

const MOCK_GROUPS: Group[] = [
    { id: '1', name: 'Flatmates 🏠', members: 3, userBalance: -450, recentActivity: 'Electricity bill added' },
    { id: '2', name: 'Goa Trip 🏖️', members: 5, userBalance: 1200, recentActivity: 'Dinner split added' },
];

export default function SharedBudgetScreen({ navigation }: any) {
    const [groups] = useState(MOCK_GROUPS);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Shared Budgets</Text>
                <TouchableOpacity style={styles.addBtn}>
                    <Ionicons name="add" size={24} color="#22d3ee" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Balance Overview Card */}
                <LinearGradient
                    colors={['#171923', '#0a0b12']}
                    style={styles.balanceCard}
                >
                    <View>
                        <Text style={styles.balanceLabel}>Overall Balance</Text>
                        <Text style={styles.balanceAmount}>₹750</Text>
                    </View>
                    <View style={styles.settleBtnContainer}>
                        <TouchableOpacity style={styles.settleBtn}>
                            <Text style={styles.settleBtnText}>Settle All</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                <Text style={styles.sectionTitle}>Your Groups</Text>

                {groups.map(group => (
                    <TouchableOpacity key={group.id} style={styles.groupCard}>
                        <View style={styles.groupIconContainer}>
                            <LinearGradient colors={['#22d3ee', '#0ea5e9']} style={styles.groupIcon}>
                                <Ionicons name="people" size={24} color="#080810" />
                            </LinearGradient>
                        </View>
                        <View style={styles.groupInfo}>
                            <Text style={styles.groupName}>{group.name}</Text>
                            <Text style={styles.groupMeta}>{group.members} members • {group.recentActivity}</Text>
                        </View>
                        <View style={styles.groupBalance}>
                            <Text style={[styles.balanceValue, { color: group.userBalance >= 0 ? '#4ade80' : '#f87171' }]}>
                                {group.userBalance >= 0 ? `+₹${group.userBalance}` : `-₹${Math.abs(group.userBalance)}`}
                            </Text>
                            <Text style={styles.balanceSub}>{group.userBalance >= 0 ? 'owed' : 'owe'}</Text>
                        </View>
                    </TouchableOpacity>
                ))}

                {/* Empty State / Create New */}
                <TouchableOpacity style={styles.createNewCard}>
                    <Ionicons name="add-circle-outline" size={32} color="#666" />
                    <Text style={styles.createNewText}>Create New Group</Text>
                    <Text style={styles.limitNote}>Free users: 1 group limit</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050508',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#14141c',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 20,
        color: '#FFF',
    },
    addBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#11222e',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 20,
    },
    balanceCard: {
        padding: 24,
        borderRadius: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#2A2A35',
    },
    balanceLabel: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: '#A0A0A0',
        marginBottom: 4,
    },
    balanceAmount: {
        fontFamily: 'Outfit_800ExtraBold',
        fontSize: 32,
        color: '#FFF',
    },
    settleBtnContainer: {
        backgroundColor: 'rgba(34, 211, 238, 0.1)',
        borderRadius: 12,
        padding: 2,
    },
    settleBtn: {
        backgroundColor: '#22d3ee',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
    },
    settleBtnText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 14,
        color: '#080810',
    },
    sectionTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 18,
        color: '#FFF',
        marginBottom: 16,
    },
    groupCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111218',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    groupIconContainer: {
        marginRight: 16,
    },
    groupIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
        color: '#FFF',
        marginBottom: 4,
    },
    groupMeta: {
        fontFamily: 'Inter_400Regular',
        fontSize: 12,
        color: '#666',
    },
    groupBalance: {
        alignItems: 'flex-end',
    },
    balanceValue: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 16,
    },
    balanceSub: {
        fontFamily: 'Inter_500Medium',
        fontSize: 10,
        color: '#666',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    createNewCard: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#2A2A35',
        borderRadius: 24,
        padding: 32,
        marginTop: 8,
    },
    createNewText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
        color: '#FFF',
        marginTop: 12,
    },
    limitNote: {
        fontFamily: 'Inter_400Regular',
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    }
});

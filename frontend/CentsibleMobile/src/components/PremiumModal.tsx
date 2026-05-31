import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

type Props = {
    isVisible: boolean;
    onClose: () => void;
};

export default function PremiumModal({ isVisible, onClose }: Props) {
    const features = [
        { icon: 'sparkles', title: 'Advanced AI Insights', desc: 'Predictive analytics and smart savings tips.' },
        { icon: 'people', title: 'Unlimited Shared Groups', desc: 'Split bills with flatmates, family, and trips.' },
        { icon: 'color-palette', title: 'Exclusive Themes', desc: 'Unlock Cyberpunk and Glass themes.' },
    ];

    if (!isVisible) return null;

    return (
        <Modal transparent visible={isVisible} animationType="fade">
            <View style={styles.overlay}>
                <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />

                <LinearGradient
                    colors={['#1a1f35', '#080810']}
                    style={styles.modalContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>

                    <LinearGradient colors={['#22d3ee', '#0ea5e9']} style={styles.badge}>
                        <Text style={styles.badgeText}>PRO</Text>
                    </LinearGradient>

                    <Text style={styles.title}>Unlock PennyWise Pro</Text>
                    <Text style={styles.subtitle}>Take full control of your finances with ultra-premium features.</Text>

                    <View style={styles.featuresList}>
                        {features.map((feature, idx) => (
                            <View key={idx} style={styles.featureItem}>
                                <View style={styles.featureIconContainer}>
                                    <Ionicons name={feature.icon as any} size={20} color="#22d3ee" />
                                </View>
                                <View style={styles.featureText}>
                                    <Text style={styles.featureTitle}>{feature.title}</Text>
                                    <Text style={styles.featureDesc}>{feature.desc}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.subscribeBtn} onPress={onClose}>
                        <LinearGradient
                            colors={['#22d3ee', '#0ea5e9']}
                            style={styles.subscribeBtnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Text style={styles.subscribeBtnText}>Upgrade for ₹99/mo</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <Text style={styles.footerNote}>Cancel anytime. Secure checkout via Google Play.</Text>
                </LinearGradient>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContainer: {
        width: width * 0.85,
        borderRadius: 32,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(34, 211, 238, 0.2)',
    },
    closeBtn: {
        position: 'absolute',
        top: 20,
        right: 20,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 16,
    },
    badgeText: {
        fontFamily: 'Inter_700Bold',
        fontSize: 10,
        color: '#080810',
    },
    title: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 24,
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        color: '#A0A0A0',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 20,
    },
    featuresList: {
        width: '100%',
        marginBottom: 32,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    featureIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(34, 211, 238, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
        color: '#FFF',
        marginBottom: 2,
    },
    featureDesc: {
        fontFamily: 'Inter_400Regular',
        fontSize: 12,
        color: '#666',
    },
    subscribeBtn: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        overflow: 'hidden',
    },
    subscribeBtnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    subscribeBtnText: {
        fontFamily: 'Inter_700Bold',
        fontSize: 16,
        color: '#080810',
    },
    footerNote: {
        fontFamily: 'Inter_400Regular',
        fontSize: 11,
        color: '#444',
        marginTop: 16,
    }
});

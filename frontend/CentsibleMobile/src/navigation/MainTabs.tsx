import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import DashboardScreen from '../screens/DashboardScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
    const insets = useSafeAreaInsets();
    // Use a larger base padding for Android to clear the 3-button navigation bar if gesture nav is off
    const tabBarPaddingBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 8) + (Platform.OS === 'ios' ? 20 : 0);
    const tabBarHeight = Platform.OS === 'ios' ? 88 : 72 + insets.bottom;
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: any = 'home-variant';

                    if (route.name === 'DashboardTab') {
                        iconName = focused ? 'home-variant' : 'home-variant-outline';
                    } else if (route.name === 'AnalyticsTab') {
                        iconName = focused ? 'chart-box' : 'chart-box-outline';
                    } else if (route.name === 'ProfileTab') {
                        iconName = focused ? 'account' : 'account-outline';
                    }

                    return <MaterialCommunityIcons name={iconName} size={size + 4} color={color} />;
                },

                tabBarActiveTintColor: '#22d3ee',
                tabBarInactiveTintColor: '#555',
                tabBarStyle: {
                    backgroundColor: '#0A0B12',
                    borderTopWidth: 1,
                    borderTopColor: 'rgba(34,211,238,0.08)',
                    height: tabBarHeight,
                    paddingBottom: tabBarPaddingBottom,
                    paddingTop: 8,
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    elevation: 0,
                },
                tabBarLabelStyle: {
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 11,
                    marginTop: -4,
                },
                tabBarHideOnKeyboard: true,
            })}
        >
            <Tab.Screen
                name="DashboardTab"
                component={DashboardScreen}
                options={{ tabBarLabel: 'Home' }}
            />
            <Tab.Screen
                name="AnalyticsTab"
                component={AnalyticsScreen}
                options={{ tabBarLabel: 'Insights' }}
            />
            <Tab.Screen
                name="ProfileTab"
                component={ProfileScreen}
                options={{ tabBarLabel: 'Profile' }}
            />
        </Tab.Navigator>
    );
}

import React from 'react';
import {View, StyleSheet, Platform} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import {BlurView} from '@react-native-community/blur';

import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import QRPairScreen from '../screens/QRPairScreen';
import SettingsScreen from '../screens/SettingsScreen';

import {useTheme} from '../theme/ThemeContext';
import {Colors, Radius, Typography} from '../theme';

const Tab = createBottomTabNavigator();

const TAB_ROUTES = [
  {name: 'Home',     label: 'Beam',     icon: 'wifi-tethering',  screen: HomeScreen},
  {name: 'QRPair',  label: 'Pair',     icon: 'qr-code',         screen: QRPairScreen},
  {name: 'History', label: 'History',  icon: 'history',         screen: HistoryScreen},
  {name: 'Settings',label: 'Settings', icon: 'settings',        screen: SettingsScreen},
];

/**
 * RootNavigator — bottom tab navigator with custom glass tab bar.
 * Active tab renders a gradient pill indicator.
 */
export const RootNavigator: React.FC = () => {
  const {colors, isDark} = useTheme();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({route}) => ({
          headerShown: false,
          tabBarShowLabel: true,
          tabBarStyle: styles.tabBar,
          tabBarBackground: () => (
            <View style={StyleSheet.absoluteFillObject}>
              {Platform.OS === 'ios' ? (
                <BlurView
                  style={StyleSheet.absoluteFillObject}
                  blurType={isDark ? 'dark' : 'light'}
                  blurAmount={30}
                />
              ) : (
                <View style={[StyleSheet.absoluteFillObject, {backgroundColor: colors.surfaceStrong}]} />
              )}
              {/* Top border shimmer */}
              <View style={[styles.tabBorder, {backgroundColor: colors.border}]} />
            </View>
          ),
          tabBarIcon: ({focused, color, size}) => {
            const route_data = TAB_ROUTES.find(r => r.name === route.name);
            const iconName = route_data?.icon ?? 'circle';
            if (focused) {
              return (
                <LinearGradient
                  colors={Colors.brand.primary}
                  style={styles.activeIcon}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}>
                  <Icon name={iconName} size={20} color="#fff" />
                </LinearGradient>
              );
            }
            return <Icon name={iconName} size={22} color={color} />;
          },
          tabBarActiveTintColor: Colors.brand.primary[0],
          tabBarInactiveTintColor: colors.text.tertiary,
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabItem,
        })}>
        {TAB_ROUTES.map(r => (
          <Tab.Screen
            key={r.name}
            name={r.name}
            component={r.screen}
            options={{tabBarLabel: r.label}}
          />
        ))}
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 85,
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: 'transparent',
  },
  tabBorder: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: StyleSheet.hairlineWidth,
  },
  activeIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  tabLabel: {
    ...Typography.labelSmall,
    marginTop: -4,
  },
  tabItem: {
    paddingTop: 8,
  },
});

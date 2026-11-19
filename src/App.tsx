import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';

import {ThemeProvider} from './theme/ThemeContext';
import {AppProvider} from './store/AppContext';
import {RootNavigator} from './navigation/RootNavigator';
import {usePermissions} from './hooks/usePermissions';
import {Colors, Typography, Spacing, Radius} from './theme';

/**
 * PermissionGate — shows a splash if permissions haven't been granted yet.
 * Once granted, renders the full app.
 */
const PermissionGate: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {permissionStatus, isGranted, requestPermissions} = usePermissions();

  if (isGranted) return <>{children}</>;

  if (permissionStatus === 'checking') {
    return (
      <LinearGradient colors={Colors.background.dark} style={styles.gate}>
        <Icon name="wifi-tethering" size={64} color={Colors.brand.primary[0]} />
        <Text style={styles.gateTitle}>ZoroBeamShare</Text>
        <Text style={styles.gateSub}>Requesting permissions…</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={Colors.background.dark} style={styles.gate}>
      <Icon name="lock" size={64} color={Colors.brand.warning[0]} />
      <Text style={styles.gateTitle}>Permissions Needed</Text>
      <Text style={styles.gateSub}>
        ZoroBeamShare needs Wi-Fi, Bluetooth, and storage access to discover devices and transfer files.
      </Text>
      <TouchableOpacity onPress={requestPermissions} style={styles.grantBtn}>
        <LinearGradient
          colors={Colors.brand.primary}
          style={styles.grantBtnInner}
          start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
          <Text style={styles.grantBtnText}>Grant Permissions</Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
};

/**
 * App — root component.
 * Provider tree: GestureHandler → SafeArea → Theme → PermissionGate → App state → Navigator
 */
const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <PermissionGate>
            <AppProvider>
              <RootNavigator />
              <Toast />
            </AppProvider>
          </PermissionGate>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
  gate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.lg,
  },
  gateTitle: {
    ...Typography.headingLarge,
    color: '#F0F0FF',
    textAlign: 'center',
  },
  gateSub: {
    ...Typography.bodyLarge,
    color: '#7070A0',
    textAlign: 'center',
    lineHeight: 24,
  },
  grantBtn: {borderRadius: Radius.full, marginTop: Spacing.xl},
  grantBtnInner: {
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
  },
  grantBtnText: {
    ...Typography.labelLarge,
    color: '#fff',
  },
});

export default App;

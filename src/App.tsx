import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {StyleSheet} from 'react-native';
import Toast from 'react-native-toast-message';

import {ThemeProvider} from './theme/ThemeContext';
import {AppProvider} from './store/AppContext';
import {RootNavigator} from './navigation/RootNavigator';

/**
 * App — root component.
 * Provider tree: GestureHandler → SafeArea → Theme → App state → Navigator
 */
const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppProvider>
            <RootNavigator />
            <Toast />
          </AppProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1},
});

export default App;

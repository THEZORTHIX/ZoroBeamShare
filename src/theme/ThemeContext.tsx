import React, {createContext, useContext, useState, useEffect} from 'react';
import {useColorScheme} from 'react-native';
import {Colors} from './index';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: typeof Colors.glass.light & {
    text: typeof Colors.text.light;
    background: string[];
    orbs: string[];
  };
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(systemScheme ?? 'dark');

  useEffect(() => {
    if (systemScheme) setMode(systemScheme);
  }, [systemScheme]);

  const isDark = mode === 'dark';
  const glass = isDark ? Colors.glass.dark : Colors.glass.light;
  const text = isDark ? Colors.text.dark : Colors.text.light;
  const background = isDark ? Colors.background.dark : Colors.background.light;
  const orbs = isDark ? Colors.orbs.dark : Colors.orbs.light;

  const colors = {...glass, text, background, orbs};

  const toggle = () => setMode(prev => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{mode, colors, isDark, toggle}}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

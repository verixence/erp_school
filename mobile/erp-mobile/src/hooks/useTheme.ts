import { useColorScheme } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { schoolTheme } from '../theme/schoolTheme';
import { darkTheme } from '../theme/darkTheme';

export type ColorScheme = 'light' | 'dark' | 'auto';

const THEME_STORAGE_KEY = '@erp_school_theme_preference';

export const useTheme = () => {
  const systemColorScheme = useColorScheme();
  const [userPreference, setUserPreference] = useState<ColorScheme>('auto');
  const [isLoading, setIsLoading] = useState(true);

  // Load user preference from AsyncStorage
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved) {
        setUserPreference(saved as ColorScheme);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveThemePreference = async (preference: ColorScheme) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
      setUserPreference(preference);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Determine active color scheme
  const activeColorScheme: 'light' | 'dark' =
    userPreference === 'auto'
      ? systemColorScheme || 'light'
      : userPreference === 'dark'
      ? 'dark'
      : 'light';

  // Select appropriate theme
  const theme = activeColorScheme === 'dark' ? darkTheme : schoolTheme;

  return {
    colorScheme: activeColorScheme,
    userPreference,
    theme,
    isDark: activeColorScheme === 'dark',
    isLoading,
    setTheme: saveThemePreference,
  };
};

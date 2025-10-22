import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Sun, Moon, Smartphone, Check } from 'lucide-react-native';
import { useTheme, ColorScheme } from '../../hooks/useTheme';
import { schoolTheme } from '../../theme/schoolTheme';

export const ThemeSettingsScreen = () => {
  const navigation = useNavigation();
  const { userPreference, setTheme, theme } = useTheme();

  const themeOptions: { value: ColorScheme; label: string; description: string; icon: any }[] = [
    {
      value: 'light',
      label: 'Light Mode',
      description: 'Always use light theme',
      icon: Sun},
    {
      value: 'dark',
      label: 'Dark Mode',
      description: 'Always use dark theme',
      icon: Moon},
    {
      value: 'auto',
      label: 'System Default',
      description: 'Match your device settings',
      icon: Smartphone},
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.main }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border.light }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary, fontFamily: theme.typography.fonts.bold }]}>
          Theme
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary, fontFamily: theme.typography.fonts.medium }]}>
          APPEARANCE
        </Text>

        {themeOptions.map((option) => {
          const IconComponent = option.icon;
          const isSelected = userPreference === option.value;

          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionCard,
                {
                  backgroundColor: theme.colors.background.card,
                  borderColor: isSelected ? theme.colors.primary.main : theme.colors.border.light},
                isSelected && styles.optionCardSelected,
              ]}
              onPress={() => setTheme(option.value)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconContainer,
                {
                  backgroundColor: isSelected
                    ? theme.colors.primary.main + '15'
                    : theme.colors.background.tertiary},
              ]}>
                <IconComponent
                  size={24}
                  color={isSelected ? theme.colors.primary.main : theme.colors.text.secondary}
                />
              </View>

              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionLabel,
                  {
                    color: theme.colors.text.primary,
                    fontFamily: theme.typography.fonts.semibold},
                ]}>
                  {option.label}
                </Text>
                <Text style={[
                  styles.optionDescription,
                  {
                    color: theme.colors.text.secondary,
                    fontFamily: theme.typography.fonts.regular},
                ]}>
                  {option.description}
                </Text>
              </View>

              {isSelected && (
                <View style={[styles.checkContainer, { backgroundColor: theme.colors.primary.main }]}>
                  <Check size={16} color="white" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Info Section */}
        <View style={[styles.infoCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.light }]}>
          <Text style={[styles.infoTitle, { color: theme.colors.text.primary, fontFamily: theme.typography.fonts.semibold }]}>
            About Dark Mode
          </Text>
          <Text style={[styles.infoText, { color: theme.colors.text.secondary, fontFamily: theme.typography.fonts.regular }]}>
            Dark mode reduces eye strain in low-light environments and may help conserve battery life on OLED screens.
          </Text>
          <Text style={[styles.infoText, { color: theme.colors.text.secondary, fontFamily: theme.typography.fonts.regular, marginTop: 12 }]}>
            When set to "System Default", the app will automatically switch between light and dark themes based on your device settings.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1},
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center'},
  headerTitle: {
    fontSize: 18},
  content: {
    flex: 1,
    padding: 20},
  sectionTitle: {
    fontSize: 13,
    marginBottom: 12,
    marginLeft: 4},
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2},
  optionCardSelected: {
    borderWidth: 2},
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16},
  optionContent: {
    flex: 1},
  optionLabel: {
    fontSize: 16,
    marginBottom: 4},
  optionDescription: {
    fontSize: 14},
  checkContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'},
  infoCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1},
  infoTitle: {
    fontSize: 16,
    marginBottom: 8},
  infoText: {
    fontSize: 14,
    lineHeight: 20}});

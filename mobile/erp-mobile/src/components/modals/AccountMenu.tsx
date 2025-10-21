import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Moon, Bell, Info, LogOut, X, ChevronRight, Sun, Smartphone } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { schoolTheme } from '../../theme/schoolTheme';

const { height } = Dimensions.get('window');

interface AccountMenuProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToTheme: () => void;
  onNavigateToNotifications: () => void;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({
  visible,
  onClose,
  onNavigateToTheme,
  onNavigateToNotifications,
}) => {
  const { user, signOut, isTeacher, isParent } = useAuth();
  const { theme, isDark, userPreference } = useTheme();

  const handleSignOut = () => {
    onClose();
    setTimeout(() => {
      signOut();
    }, 300);
  };

  const getThemeLabel = () => {
    switch (userPreference) {
      case 'light':
        return 'Light Mode';
      case 'dark':
        return 'Dark Mode';
      case 'auto':
        return 'System Default';
      default:
        return 'System Default';
    }
  };

  const getThemeIcon = () => {
    switch (userPreference) {
      case 'light':
        return Sun;
      case 'dark':
        return Moon;
      case 'auto':
        return Smartphone;
      default:
        return Smartphone;
    }
  };

  const ThemeIcon = getThemeIcon();

  const menuItems = [
    {
      icon: ThemeIcon,
      title: 'Theme',
      subtitle: getThemeLabel(),
      onPress: () => {
        onClose();
        setTimeout(onNavigateToTheme, 300);
      },
      color: theme.colors.primary.main,
    },
    {
      icon: Bell,
      title: 'Notifications',
      subtitle: 'Manage preferences',
      onPress: () => {
        onClose();
        setTimeout(onNavigateToNotifications, 300);
      },
      color: theme.colors.warning.main,
    },
    {
      icon: Info,
      title: 'About',
      subtitle: 'Version 2.2.0',
      onPress: () => {
        onClose();
        // Could navigate to about screen if needed
      },
      color: theme.colors.info.main,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.menuContainer, { backgroundColor: theme.colors.background.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle Bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary, fontFamily: theme.typography.fonts.bold }]}>
              Account
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* User Profile Section */}
          <View style={[styles.profileSection, { borderBottomColor: theme.colors.border.light }]}>
            <View
              style={[
                styles.avatarLarge,
                {
                  backgroundColor: isTeacher
                    ? theme.colors.teacher.main
                    : theme.colors.parent.main,
                },
              ]}
            >
              <Text style={[styles.avatarText, { fontFamily: theme.typography.fonts.bold }]}>
                {user?.first_name?.charAt(0) || 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.userName, { color: theme.colors.text.primary, fontFamily: theme.typography.fonts.bold }]}>
                {user?.first_name} {user?.last_name}
              </Text>
              <Text style={[styles.userEmail, { color: theme.colors.text.secondary, fontFamily: theme.typography.fonts.regular }]}>
                {user?.email}
              </Text>
              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor: isTeacher
                      ? theme.colors.teacher.lightBg
                      : theme.colors.parent.lightBg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.roleText,
                    {
                      color: isTeacher ? theme.colors.teacher.main : theme.colors.parent.main,
                      fontFamily: theme.typography.fonts.semibold,
                    },
                  ]}
                >
                  {isTeacher ? 'Teacher' : 'Parent'}
                </Text>
              </View>
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.menuItems}>
            {menuItems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.menuItem,
                    index < menuItems.length - 1 && { borderBottomColor: theme.colors.border.light, borderBottomWidth: 1 },
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                    <IconComponent size={20} color={item.color} />
                  </View>
                  <View style={styles.menuItemContent}>
                    <Text style={[styles.menuItemTitle, { color: theme.colors.text.primary, fontFamily: theme.typography.fonts.semibold }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.menuItemSubtitle, { color: theme.colors.text.secondary, fontFamily: theme.typography.fonts.regular }]}>
                      {item.subtitle}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={theme.colors.text.tertiary} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            style={[styles.signOutButton, { backgroundColor: theme.colors.error.bg, borderColor: theme.colors.error.main }]}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <View style={[styles.signOutIconContainer, { backgroundColor: theme.colors.error.main }]}>
              <LogOut size={20} color="white" />
            </View>
            <Text style={[styles.signOutText, { color: theme.colors.error.main, fontFamily: theme.typography.fonts.semibold }]}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
    paddingBottom: 40,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: 'white',
    fontSize: 24,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
  },
  menuItems: {
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 13,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  signOutIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  signOutText: {
    fontSize: 16,
  },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle, BookOpen, ClipboardCheck, TrendingDown } from 'lucide-react-native';
import { schoolTheme } from '../../theme/schoolTheme';

interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
  action?: () => void;
  actionLabel?: string;
}

interface ImportantAlertsProps {
  alerts: Alert[];
  theme?: typeof schoolTheme;
}

export const ImportantAlerts: React.FC<ImportantAlertsProps> = ({ alerts, theme = schoolTheme }) => {
  if (alerts.length === 0) return null;

  const getAlertConfig = (type: Alert['type']) => {
    switch (type) {
      case 'danger':
        return {
          backgroundColor: theme.colors.error.bg,
          borderColor: theme.colors.error.main,
          iconColor: theme.colors.error.main,
          Icon: AlertCircle,
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.warning.bg,
          borderColor: theme.colors.warning.main,
          iconColor: theme.colors.warning.main,
          Icon: BookOpen,
        };
      case 'info':
        return {
          backgroundColor: theme.colors.info.bg,
          borderColor: theme.colors.info.main,
          iconColor: theme.colors.info.main,
          Icon: ClipboardCheck,
        };
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary, fontFamily: theme.typography.fonts.bold }]}>
        Important Alerts
      </Text>
      <View style={styles.alertsList}>
        {alerts.map((alert) => {
          const config = getAlertConfig(alert.type);
          const IconComponent = config.Icon;

          return (
            <View
              key={alert.id}
              style={[
                styles.alertCard,
                {
                  backgroundColor: config.backgroundColor,
                  borderLeftColor: config.borderColor,
                },
              ]}
            >
              <View style={styles.alertHeader}>
                <IconComponent size={20} color={config.iconColor} />
                <Text
                  style={[
                    styles.alertTitle,
                    { color: theme.colors.text.primary, fontFamily: theme.typography.fonts.semibold },
                  ]}
                >
                  {alert.title}
                </Text>
              </View>
              <Text
                style={[
                  styles.alertMessage,
                  { color: theme.colors.text.secondary, fontFamily: theme.typography.fonts.regular },
                ]}
              >
                {alert.message}
              </Text>
              {alert.action && alert.actionLabel && (
                <TouchableOpacity
                  style={[styles.alertAction, { borderColor: config.borderColor }]}
                  onPress={alert.action}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.alertActionText,
                      { color: config.iconColor, fontFamily: theme.typography.fonts.semibold },
                    ]}
                  >
                    {alert.actionLabel}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    marginBottom: 16,
  },
  alertsList: {
    gap: 12,
  },
  alertCard: {
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  alertTitle: {
    fontSize: 15,
  },
  alertMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  alertAction: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  alertActionText: {
    fontSize: 13,
  },
});

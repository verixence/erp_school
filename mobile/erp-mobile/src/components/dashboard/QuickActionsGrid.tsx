import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

interface QuickAction {
  id: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  color: string;
  route: string;
  params?: any;
}

interface QuickActionsGridProps {
  actions: QuickAction[];
  columns?: number;
}

const { width } = Dimensions.get('window');

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({ 
  actions, 
  columns = 2 
}) => {
  const navigation = useNavigation();

  const cardWidth = (width - 60 - (columns - 1) * 12) / columns;

  const handleActionPress = (action: QuickAction) => {
    if (action.params) {
      navigation.navigate(action.route as never, action.params as never);
    } else {
      navigation.navigate(action.route as never);
    }
  };

  const renderActionCard = (action: QuickAction) => {
    const IconComponent = action.icon;

    return (
      <TouchableOpacity
        key={action.id}
        style={[
          styles.actionCard,
          { 
            width: cardWidth,
            borderLeftColor: action.color,
            borderLeftWidth: 4
          }
        ]}
        onPress={() => handleActionPress(action)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={[styles.iconContainer, { backgroundColor: action.color + '15' }]}>
            <IconComponent size={24} color={action.color} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {action.title}
            </Text>
            {action.subtitle && (
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {action.subtitle}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.grid}>
        {actions.map(renderActionCard)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 18,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
}); 
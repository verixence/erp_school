import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { X, GraduationCap, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { schoolTheme } from '../../theme/schoolTheme';

interface Child {
  id: string;
  full_name: string;
  admission_no: string;
  sections?: {
    grade: number;
    section: string;
  };
}

interface ChildSelectorModalProps {
  visible: boolean;
  children: Child[];
  selectedChildId: string;
  onSelect: (childId: string) => void;
  onClose: () => void;
}

const { height } = Dimensions.get('window');

export const ChildSelectorModal: React.FC<ChildSelectorModalProps> = ({
  visible,
  children,
  selectedChildId,
  onSelect,
  onClose,
}) => {
  const handleSelect = (childId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(childId);
    onClose();
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Select Child</Text>
                <Text style={styles.headerSubtitle}>
                  Choose which child's information to view
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Children List */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {children.map((child, index) => {
                const isSelected = child.id === selectedChildId;
                return (
                  <TouchableOpacity
                    key={child.id}
                    style={[
                      styles.childCard,
                      isSelected && styles.childCardSelected,
                    ]}
                    onPress={() => handleSelect(child.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.childCardLeft}>
                      <View
                        style={[
                          styles.avatarContainer,
                          isSelected && styles.avatarContainerSelected,
                        ]}
                      >
                        <GraduationCap
                          size={24}
                          color={isSelected ? 'white' : schoolTheme.colors.parent.main}
                        />
                      </View>
                      <View style={styles.childInfo}>
                        <Text style={styles.childName}>{child.full_name}</Text>
                        <Text style={styles.childDetails}>
                          Grade {child.sections?.grade}
                          {child.sections?.section} • {child.admission_no}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <CheckCircle
                        size={24}
                        color={schoolTheme.colors.parent.main}
                        fill={schoolTheme.colors.parent.main}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.7,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  childCardSelected: {
    backgroundColor: schoolTheme.colors.parent.lightBg,
    borderColor: schoolTheme.colors.parent.main,
  },
  childCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: schoolTheme.colors.parent.lightBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarContainerSelected: {
    backgroundColor: schoolTheme.colors.parent.main,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  childDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
});

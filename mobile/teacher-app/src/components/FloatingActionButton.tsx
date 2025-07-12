import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, Alert } from 'react-native';
import { FAB, Portal, PaperProvider, Card, Title, Paragraph, TextInput, Button, List } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface FloatingActionButtonProps {
  onPress?: () => void;
}

export default function FloatingActionButton({ onPress }: FloatingActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [homeworkModalVisible, setHomeworkModalVisible] = useState(false);
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [announcementModalVisible, setAnnouncementModalVisible] = useState(false);

  // Form states
  const [homeworkTitle, setHomeworkTitle] = useState('');
  const [homeworkDescription, setHomeworkDescription] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');

  const onStateChange = ({ open }: { open: boolean }) => setOpen(open);

  const handleCreateHomework = () => {
    setOpen(false);
    setHomeworkModalVisible(true);
  };

  const handleTakeAttendance = () => {
    setOpen(false);
    router.push('/attendance');
  };

  const handleMakeAnnouncement = () => {
    setOpen(false);
    setAnnouncementModalVisible(true);
  };

  const submitHomework = () => {
    if (!homeworkTitle.trim()) {
      Alert.alert('Error', 'Please enter a homework title');
      return;
    }
    
    Alert.alert(
      'Success',
      'Homework created successfully!',
      [
        {
          text: 'OK',
          onPress: () => {
            setHomeworkModalVisible(false);
            setHomeworkTitle('');
            setHomeworkDescription('');
            router.push('/homework');
          }
        }
      ]
    );
  };

  const submitAnnouncement = () => {
    if (!announcementTitle.trim()) {
      Alert.alert('Error', 'Please enter an announcement title');
      return;
    }
    
    Alert.alert(
      'Success',
      'Announcement created successfully!',
      [
        {
          text: 'OK',
          onPress: () => {
            setAnnouncementModalVisible(false);
            setAnnouncementTitle('');
            setAnnouncementContent('');
            router.push('/announcements');
          }
        }
      ]
    );
  };

  return (
    <PaperProvider>
      <Portal>
        <FAB.Group
          open={open}
          visible={true}
          icon={open ? 'close' : 'plus'}
          actions={[
            {
              icon: 'book-plus',
              label: 'Create Homework',
              onPress: handleCreateHomework,
              color: '#8B5CF6',
            },
            {
              icon: 'clipboard-check',
              label: 'Take Attendance',
              onPress: handleTakeAttendance,
              color: '#10B981',
            },
            {
              icon: 'megaphone',
              label: 'Make Announcement',
              onPress: handleMakeAnnouncement,
              color: '#EF4444',
            },
          ]}
          onStateChange={onStateChange}
          onPress={onPress}
          fabStyle={styles.fab}
        />

        {/* Homework Modal */}
        <Modal
          visible={homeworkModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setHomeworkModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView>
                <Card style={styles.modalCard}>
                  <Card.Content>
                    <Title style={styles.modalTitle}>Create Homework</Title>
                    <Paragraph style={styles.modalSubtitle}>
                      Assign new homework to your students
                    </Paragraph>
                    
                    <TextInput
                      label="Homework Title"
                      value={homeworkTitle}
                      onChangeText={setHomeworkTitle}
                      style={styles.input}
                      mode="outlined"
                      placeholder="Enter homework title"
                    />
                    
                    <TextInput
                      label="Description"
                      value={homeworkDescription}
                      onChangeText={setHomeworkDescription}
                      style={styles.input}
                      mode="outlined"
                      multiline
                      numberOfLines={4}
                      placeholder="Enter homework description and instructions"
                    />
                    
                    <View style={styles.modalButtons}>
                      <Button
                        mode="outlined"
                        onPress={() => setHomeworkModalVisible(false)}
                        style={styles.cancelButton}
                      >
                        Cancel
                      </Button>
                      <Button
                        mode="contained"
                        onPress={submitHomework}
                        style={styles.submitButton}
                      >
                        Create Homework
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Announcement Modal */}
        <Modal
          visible={announcementModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setAnnouncementModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView>
                <Card style={styles.modalCard}>
                  <Card.Content>
                    <Title style={styles.modalTitle}>Make Announcement</Title>
                    <Paragraph style={styles.modalSubtitle}>
                      Share important information with students and parents
                    </Paragraph>
                    
                    <TextInput
                      label="Announcement Title"
                      value={announcementTitle}
                      onChangeText={setAnnouncementTitle}
                      style={styles.input}
                      mode="outlined"
                      placeholder="Enter announcement title"
                    />
                    
                    <TextInput
                      label="Content"
                      value={announcementContent}
                      onChangeText={setAnnouncementContent}
                      style={styles.input}
                      mode="outlined"
                      multiline
                      numberOfLines={4}
                      placeholder="Enter announcement content"
                    />
                    
                    <View style={styles.modalButtons}>
                      <Button
                        mode="outlined"
                        onPress={() => setAnnouncementModalVisible(false)}
                        style={styles.cancelButton}
                      >
                        Cancel
                      </Button>
                      <Button
                        mode="contained"
                        onPress={submitAnnouncement}
                        style={styles.submitButton}
                      >
                        Send Announcement
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </Portal>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  fab: {
    backgroundColor: '#3B82F6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
  },
  modalCard: {
    margin: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1F2937',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  submitButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#3B82F6',
  },
}); 
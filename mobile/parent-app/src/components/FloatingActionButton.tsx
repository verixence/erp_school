import React, { useState } from 'react';
import { View, StyleSheet, Alert, Modal } from 'react-native';
import { FAB, Portal, Card, TextInput, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../theme/colors';
import { router } from 'expo-router';

interface FloatingActionButtonProps {
  onComplaintPress?: () => void;
  onLeaveRequestPress?: () => void;
}

export default function FloatingActionButton({ 
  onComplaintPress, 
  onLeaveRequestPress 
}: FloatingActionButtonProps) {
  const [fabOpen, setFabOpen] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const [complaint, setComplaint] = useState({
    subject: '',
    description: '',
    category: 'academic',
  });

  const [leaveRequest, setLeaveRequest] = useState({
    reason: '',
    fromDate: '',
    toDate: '',
    description: '',
  });

  const handleComplaintSubmit = () => {
    if (!complaint.subject.trim() || !complaint.description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Handle complaint submission
    Alert.alert('Success', 'Complaint submitted successfully!');
    setComplaint({ subject: '', description: '', category: 'academic' });
    setShowComplaintModal(false);
    setFabOpen(false);
    
    if (onComplaintPress) {
      onComplaintPress();
    }
  };

  const handleLeaveSubmit = () => {
    if (!leaveRequest.reason.trim() || !leaveRequest.fromDate.trim() || !leaveRequest.toDate.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Handle leave request submission
    Alert.alert('Success', 'Leave request submitted successfully!');
    setLeaveRequest({ reason: '', fromDate: '', toDate: '', description: '' });
    setShowLeaveModal(false);
    setFabOpen(false);
    
    if (onLeaveRequestPress) {
      onLeaveRequestPress();
    }
  };

  return (
    <>
      <FAB.Group
        open={fabOpen}
        visible={true}
        icon={fabOpen ? 'close' : 'plus'}
        actions={[
          {
            icon: 'alert-circle',
            label: 'Raise Complaint',
            onPress: () => setShowComplaintModal(true),
            color: theme.colors.red[500],
          },
          {
            icon: 'calendar-remove',
            label: 'Leave Request',
            onPress: () => setShowLeaveModal(true),
            color: theme.colors.blue[500],
          },
        ]}
        onStateChange={({ open }) => setFabOpen(open)}
        fabStyle={styles.fab}
        color={theme.colors.white}
        theme={{ colors: { primary: theme.colors.primary[600] } }}
      />

      {/* Complaint Modal */}
      <Modal
        visible={showComplaintModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowComplaintModal(false)}
      >
        <View style={styles.modal}>
          <Card style={styles.modalCard}>
            <Card.Title title="Raise a Complaint" />
            <Card.Content>
              <TextInput
                label="Subject"
                value={complaint.subject}
                onChangeText={(text) => setComplaint({ ...complaint, subject: text })}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Description"
                value={complaint.description}
                onChangeText={(text) => setComplaint({ ...complaint, description: text })}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.input}
              />
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => setShowComplaintModal(false)}>Cancel</Button>
              <Button mode="contained" onPress={handleComplaintSubmit}>
                Submit
              </Button>
            </Card.Actions>
          </Card>
        </View>
      </Modal>

      {/* Leave Request Modal */}
      <Modal
        visible={showLeaveModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLeaveModal(false)}
      >
        <View style={styles.modal}>
          <Card style={styles.modalCard}>
            <Card.Title title="Leave Request" />
            <Card.Content>
              <TextInput
                label="Reason"
                value={leaveRequest.reason}
                onChangeText={(text) => setLeaveRequest({ ...leaveRequest, reason: text })}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="From Date"
                value={leaveRequest.fromDate}
                onChangeText={(text) => setLeaveRequest({ ...leaveRequest, fromDate: text })}
                mode="outlined"
                placeholder="YYYY-MM-DD"
                style={styles.input}
              />
              <TextInput
                label="To Date"
                value={leaveRequest.toDate}
                onChangeText={(text) => setLeaveRequest({ ...leaveRequest, toDate: text })}
                mode="outlined"
                placeholder="YYYY-MM-DD"
                style={styles.input}
              />
              <TextInput
                label="Additional Description"
                value={leaveRequest.description}
                onChangeText={(text) => setLeaveRequest({ ...leaveRequest, description: text })}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
              />
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => setShowLeaveModal(false)}>Cancel</Button>
              <Button mode="contained" onPress={handleLeaveSubmit}>
                Submit
              </Button>
            </Card.Actions>
          </Card>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    backgroundColor: theme.colors.primary[600],
  },
  modal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
  },
  input: {
    marginBottom: 16,
  },
}); 
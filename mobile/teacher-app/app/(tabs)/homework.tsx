import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  useAuth,
  useTeacherSections,
  useHomework,
  useCreateHomework,
  type Homework,
} from '@erp/common';

interface HomeworkItemProps {
  homework: Homework;
}

function HomeworkItem({ homework }: HomeworkItemProps) {
  const dueDate = new Date(homework.due_date);
  const isOverdue = dueDate < new Date();
  
  return (
    <View className="bg-white rounded-lg p-4 shadow-sm mb-3">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-medium text-gray-900 flex-1">
          {homework.title}
        </Text>
        <View className={`px-2 py-1 rounded ${isOverdue ? 'bg-red-100' : 'bg-green-100'}`}>
          <Text className={`text-xs font-medium ${isOverdue ? 'text-red-800' : 'text-green-800'}`}>
            {isOverdue ? 'Overdue' : 'Active'}
          </Text>
        </View>
      </View>
      
      <Text className="text-sm text-gray-600 mb-2">{homework.section} • {homework.subject}</Text>
      
      {homework.description && (
        <Text className="text-sm text-gray-700 mb-3">{homework.description}</Text>
      )}
      
      <View className="flex-row justify-between items-center">
        <Text className="text-sm text-gray-600">
          Due: {dueDate.toLocaleDateString()}
        </Text>
        {homework.file_url && (
          <Ionicons name="attach" size={16} color="#6b7280" />
        )}
      </View>
    </View>
  );
}

export default function Homework() {
  const { data: authData } = useAuth();
  const user = authData?.user;
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newHomework, setNewHomework] = useState({
    section: '',
    subject: '',
    title: '',
    description: '',
    due_date: '',
  });

  const { data: sections = [] } = useTeacherSections(user?.id);
  const { data: homeworkList = [] } = useHomework(user?.id);
  const createHomeworkMutation = useCreateHomework();

  const handleCreateHomework = async () => {
    if (!user?.school_id || !newHomework.title || !newHomework.section || !newHomework.due_date) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await createHomeworkMutation.mutateAsync({
        school_id: user.school_id,
        section: newHomework.section,
        subject: newHomework.subject,
        title: newHomework.title,
        description: newHomework.description,
        due_date: newHomework.due_date,
        created_by: user.id,
      });
      
      setShowCreateModal(false);
      setNewHomework({
        section: '',
        subject: '',
        title: '',
        description: '',
        due_date: '',
      });
      
      Alert.alert('Success', 'Homework created successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create homework');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      // In a real app, you would upload this to storage
      Alert.alert('Image Selected', 'File attachment feature coming soon!');
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 p-4">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold text-gray-900">Homework</Text>
          <TouchableOpacity
            className="bg-primary-600 rounded-lg px-4 py-2"
            onPress={() => setShowCreateModal(true)}
          >
            <Text className="text-white font-medium">Create New</Text>
          </TouchableOpacity>
        </View>

        {homeworkList.length > 0 ? (
          homeworkList.map(homework => (
            <HomeworkItem key={homework.id} homework={homework} />
          ))
        ) : (
          <View className="bg-white rounded-lg p-8 shadow-sm">
            <Text className="text-center text-gray-600">No homework assignments yet</Text>
          </View>
        )}
      </ScrollView>

      {/* Create Homework Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-gray-50">
          <View className="bg-white p-4 border-b border-gray-200">
            <View className="flex-row justify-between items-center">
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text className="text-primary-600 font-medium">Cancel</Text>
              </TouchableOpacity>
              <Text className="text-lg font-semibold">Create Homework</Text>
              <TouchableOpacity
                onPress={handleCreateHomework}
                disabled={createHomeworkMutation.isPending}
              >
                <Text className="text-primary-600 font-medium">
                  {createHomeworkMutation.isPending ? 'Creating...' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1 p-4">
            {/* Section Selection */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Section *</Text>
              <View className="bg-white border border-gray-300 rounded-lg">
                <Picker
                  selectedValue={newHomework.section}
                  onValueChange={(value) => setNewHomework(prev => ({ ...prev, section: value }))}
                  style={{ height: 50 }}
                >
                  <Picker.Item label="Choose a section..." value="" />
                  {sections.map(section => (
                    <Picker.Item
                      key={section.id}
                      label={`${section.grade} ${section.section}`}
                      value={`${section.grade} ${section.section}`}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Subject */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Subject *</Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-lg px-4 py-3"
                placeholder="Enter subject"
                value={newHomework.subject}
                onChangeText={(value) => setNewHomework(prev => ({ ...prev, subject: value }))}
              />
            </View>

            {/* Title */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Title *</Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-lg px-4 py-3"
                placeholder="Enter homework title"
                value={newHomework.title}
                onChangeText={(value) => setNewHomework(prev => ({ ...prev, title: value }))}
              />
            </View>

            {/* Description */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Description</Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-lg px-4 py-3"
                placeholder="Enter homework description"
                value={newHomework.description}
                onChangeText={(value) => setNewHomework(prev => ({ ...prev, description: value }))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Due Date */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Due Date *</Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-lg px-4 py-3"
                placeholder="YYYY-MM-DD"
                value={newHomework.due_date}
                onChangeText={(value) => setNewHomework(prev => ({ ...prev, due_date: value }))}
              />
            </View>

            {/* File Attachment */}
            <TouchableOpacity
              className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-4"
              onPress={pickImage}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="attach" size={20} color="#6b7280" />
                <Text className="ml-2 text-gray-600">Attach Image</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
} 
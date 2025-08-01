import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  Home,
  Users,
  Calendar,
  BookOpen,
  PenTool,
  MessageSquare,
  Settings,
  ClipboardList,
  Award,
  GraduationCap,
  Camera,
  Mail,
  Video,
  FileText
} from 'lucide-react-native';

// Teacher Screens
import { TeacherDashboardScreen } from '../screens/teacher/TeacherDashboardScreen';
import { TeacherAttendanceScreen } from '../screens/teacher/TeacherAttendanceScreen';
import TeacherTimetableScreen from '../screens/teacher/TeacherTimetableScreen';
import { TeacherHomeworkScreen } from '../screens/teacher/TeacherHomeworkScreen';

import TeacherExamsScreen from '../screens/teacher/TeacherExamsScreen';
import { TeacherAnnouncementsScreen } from '../screens/teacher/TeacherAnnouncementsScreen';
import TeacherCommunityScreen from '../screens/teacher/TeacherCommunityScreen';
import { TeacherGalleryScreen } from '../screens/teacher/TeacherGalleryScreen';
import TeacherCalendarScreen from '../screens/teacher/TeacherCalendarScreen';
import { TeacherCoScholasticScreen } from '../screens/teacher/TeacherCoScholasticScreen';
import { TeacherLeaveRequestsScreen } from '../screens/teacher/TeacherLeaveRequestsScreen';
import { TeacherOnlineClassesScreen } from '../screens/teacher/TeacherOnlineClassesScreen';
import { TeacherMarksEntryScreen } from '../screens/teacher/TeacherMarksEntryScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const DashboardStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Dashboard" 
      component={TeacherDashboardScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const AttendanceStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Attendance" 
      component={TeacherAttendanceScreen}
      options={{ title: 'Take Attendance' }}
    />
  </Stack.Navigator>
);

const AcademicsStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Timetable" 
      component={TeacherTimetableScreen}
      options={{ title: 'My Timetable' }}
    />
    <Stack.Screen 
      name="Homework" 
      component={TeacherHomeworkScreen}
      options={{ title: 'Homework Management' }}
    />
    <Stack.Screen 
      name="Marks" 
      component={TeacherMarksEntryScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="Exams" 
      component={TeacherExamsScreen}
      options={{ title: 'Exam Management' }}
    />
    <Stack.Screen 
      name="Calendar" 
      component={TeacherCalendarScreen}
      options={{ title: 'Academic Calendar' }}
    />
    <Stack.Screen 
      name="CoScholastic" 
      component={TeacherCoScholasticScreen}
      options={{ title: 'Co-Scholastic Assessments' }}
    />
    <Stack.Screen 
      name="OnlineClasses" 
      component={TeacherOnlineClassesScreen}
      options={{ title: 'Online Classes' }}
    />
    <Stack.Screen 
      name="LeaveRequests" 
      component={TeacherLeaveRequestsScreen}
      options={{ title: 'Leave Requests' }}
    />
  </Stack.Navigator>
);

const CommunicationStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Announcements" 
      component={TeacherAnnouncementsScreen}
      options={{ title: 'Announcements' }}
    />
    <Stack.Screen 
      name="Community" 
      component={TeacherCommunityScreen}
      options={{ title: 'Community' }}
    />
  </Stack.Navigator>
);

const GalleryStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Gallery" 
      component={TeacherGalleryScreen}
      options={{ title: 'Gallery' }}
    />
  </Stack.Navigator>
);

const SettingsStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Settings" 
      component={SettingsScreen}
      options={{ title: 'Settings' }}
    />
  </Stack.Navigator>
);

export const TeacherNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let IconComponent;

          switch (route.name) {
            case 'DashboardTab':
              IconComponent = Home;
              break;
            case 'AttendanceTab':
              IconComponent = Users;
              break;
            case 'AcademicsTab':
              IconComponent = GraduationCap;
              break;
            case 'MessagesTab':
              IconComponent = MessageSquare;
              break;
            case 'GalleryTab':
              IconComponent = Camera;
              break;
            case 'SettingsTab':
              IconComponent = Settings;
              break;
            default:
              IconComponent = Home;
          }

          return <IconComponent size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: 8,
          paddingTop: 8,
          height: 80
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="DashboardTab" 
        component={DashboardStack}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="AttendanceTab" 
        component={AttendanceStack}
        options={{ title: 'Attendance' }}
      />
      <Tab.Screen 
        name="AcademicsTab" 
        component={AcademicsStack}
        options={{ title: 'Academics' }}
      />
      <Tab.Screen 
        name="MessagesTab" 
        component={CommunicationStack}
        options={{ title: 'Messages' }}
      />
      <Tab.Screen 
        name="GalleryTab" 
        component={GalleryStack}
        options={{ title: 'Gallery' }}
      />
      <Tab.Screen 
        name="SettingsTab" 
        component={SettingsStack}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}; 
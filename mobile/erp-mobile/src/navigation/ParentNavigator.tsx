import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  Home,
  GraduationCap,
  Calendar,
  BookOpen,
  FileText,
  MessageSquare,
  Settings,
  Award,
  Users,
  Clock
} from 'lucide-react-native';

// Parent Screens
import { ParentDashboardScreen } from '../screens/parent/ParentDashboardScreen';
import { ParentAttendanceScreen } from '../screens/parent/ParentAttendanceScreen';
import { ParentTimetableScreen } from '../screens/parent/ParentTimetableScreen';
import { ParentHomeworkScreen } from '../screens/parent/ParentHomeworkScreen';
import { ParentExamsScreen } from '../screens/parent/ParentExamsScreen';
import { ParentReportsScreen } from '../screens/parent/ParentReportsScreen';
import { ParentAnnouncementsScreen } from '../screens/parent/ParentAnnouncementsScreen';
import { SettingsScreen } from '../screens/shared/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const DashboardStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Dashboard" 
      component={ParentDashboardScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const AcademicsStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Attendance" 
      component={ParentAttendanceScreen}
      options={{ title: 'Child Attendance' }}
    />
    <Stack.Screen 
      name="Timetable" 
      component={ParentTimetableScreen}
      options={{ title: 'Class Timetable' }}
    />
    <Stack.Screen 
      name="Homework" 
      component={ParentHomeworkScreen}
      options={{ title: 'Homework' }}
    />
    <Stack.Screen 
      name="Exams" 
      component={ParentExamsScreen}
      options={{ title: 'Exams & Results' }}
    />
    <Stack.Screen 
      name="Reports" 
      component={ParentReportsScreen}
      options={{ title: 'Report Cards' }}
    />
  </Stack.Navigator>
);

const CommunicationStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Announcements" 
      component={ParentAnnouncementsScreen}
      options={{ title: 'Announcements' }}
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

export const ParentNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let IconComponent;

          switch (route.name) {
            case 'DashboardTab':
              IconComponent = Home;
              break;
            case 'AcademicsTab':
              IconComponent = GraduationCap;
              break;
            case 'MessagesTab':
              IconComponent = MessageSquare;
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
        name="SettingsTab" 
        component={SettingsStack}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}; 
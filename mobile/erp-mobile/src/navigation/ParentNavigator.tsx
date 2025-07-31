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
  Clock,
  Camera,
  Video,
  Mail,
  CalendarDays
} from 'lucide-react-native';

// Parent Screens
import { ParentDashboardScreen } from '../screens/parent/ParentDashboardScreen';
import { ParentAttendanceScreen } from '../screens/parent/ParentAttendanceScreen';
import { ParentTimetableScreen } from '../screens/parent/ParentTimetableScreen';
import { ParentHomeworkScreen } from '../screens/parent/ParentHomeworkScreen';
import { ParentExamsScreen } from '../screens/parent/ParentExamsScreen';
import { ParentReportsScreen } from '../screens/parent/ParentReportsScreen';
import { ParentAnnouncementsScreen } from '../screens/parent/ParentAnnouncementsScreen';
import { ParentGalleryScreen } from '../screens/parent/ParentGalleryScreen';
import { ParentCommunityScreen } from '../screens/parent/ParentCommunityScreen';
import { ParentCalendarScreen } from '../screens/parent/ParentCalendarScreen';
import { ParentFeedbackScreen } from '../screens/parent/ParentFeedbackScreen';
import { ParentOnlineClassesScreen } from '../screens/parent/ParentOnlineClassesScreen';
import { ParentAnalyticsScreen } from '../screens/parent/ParentAnalyticsScreen';
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
    <Stack.Screen 
      name="Analytics" 
      component={ParentAnalyticsScreen}
      options={{ title: 'Performance Analytics' }}
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
    <Stack.Screen 
      name="OnlineClasses" 
      component={ParentOnlineClassesScreen}
      options={{ title: 'Online Classes' }}
    />
  </Stack.Navigator>
);

const CommunicationStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Community" 
      component={ParentCommunityScreen}
      options={{ title: 'Community' }}
    />
    <Stack.Screen 
      name="Announcements" 
      component={ParentAnnouncementsScreen}
      options={{ title: 'Announcements' }}
    />
    <Stack.Screen 
      name="Feedback" 
      component={ParentFeedbackScreen}
      options={{ title: 'Feedback' }}
    />
  </Stack.Navigator>
);

const MediaStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Gallery" 
      component={ParentGalleryScreen}
      options={{ title: 'School Gallery' }}
    />
    <Stack.Screen 
      name="Calendar" 
      component={ParentCalendarScreen}
      options={{ title: 'Academic Calendar' }}
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
            case 'MediaTab':
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
        name="MediaTab" 
        component={MediaStack}
        options={{ title: 'Media' }}
      />
      <Tab.Screen 
        name="SettingsTab" 
        component={SettingsStack}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}; 
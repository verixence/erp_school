import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <span style={{ color, fontSize: 24 }}>📊</span>,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color }) => <span style={{ color, fontSize: 24 }}>✅</span>,
        }}
      />
      <Tabs.Screen
        name="homework"
        options={{
          title: 'Homework',
          tabBarIcon: ({ color }) => <span style={{ color, fontSize: 24 }}>📝</span>,
        }}
      />
      <Tabs.Screen
        name="timetable"
        options={{
          title: 'Timetable',
          tabBarIcon: ({ color }) => <span style={{ color, fontSize: 24 }}>📅</span>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <span style={{ color, fontSize: 24 }}>⚙️</span>,
        }}
      />
    </Tabs>
  );
} 
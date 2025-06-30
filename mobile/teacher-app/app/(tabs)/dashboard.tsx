import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.dateText}>Today is {new Date().toLocaleDateString()}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>5</Text>
            <Text style={styles.statLabel}>Classes Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>128</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Pending Tasks</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <View style={styles.scheduleItem}>
            <Text style={styles.scheduleTime}>9:00 AM</Text>
            <Text style={styles.scheduleClass}>Mathematics - Grade 10A</Text>
          </View>
          <View style={styles.scheduleItem}>
            <Text style={styles.scheduleTime}>11:00 AM</Text>
            <Text style={styles.scheduleClass}>Physics - Grade 11B</Text>
          </View>
          <View style={styles.scheduleItem}>
            <Text style={styles.scheduleTime}>2:00 PM</Text>
            <Text style={styles.scheduleClass}>Chemistry - Grade 12A</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityItem}>
            <Text style={styles.activityText}>✅ Attendance marked for Grade 10A</Text>
            <Text style={styles.activityTime}>2 hours ago</Text>
          </View>
          <View style={styles.activityItem}>
            <Text style={styles.activityText}>📝 Homework assigned to Grade 11B</Text>
            <Text style={styles.activityTime}>4 hours ago</Text>
          </View>
          <View style={styles.activityItem}>
            <Text style={styles.activityText}>📊 Test results uploaded</Text>
            <Text style={styles.activityTime}>Yesterday</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#3B82F6',
    padding: 20,
    paddingTop: 60,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    color: '#E5E7EB',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    marginTop: -20,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 80,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  scheduleTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    width: 80,
  },
  scheduleClass: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  activityItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
}); 
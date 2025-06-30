import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function AttendanceScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.headerSubtitle}>Mark student attendance</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Class</Text>
          <TouchableOpacity style={styles.classButton}>
            <Text style={styles.classButtonText}>Grade 10A - Mathematics</Text>
            <Text style={styles.classButtonSubtext}>32 students</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.classButton}>
            <Text style={styles.classButtonText}>Grade 11B - Physics</Text>
            <Text style={styles.classButtonSubtext}>28 students</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.classButton}>
            <Text style={styles.classButtonText}>Grade 12A - Chemistry</Text>
            <Text style={styles.classButtonSubtext}>25 students</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Summary</Text>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>85</Text>
              <Text style={styles.summaryLabel}>Present</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: '#EF4444' }]}>12</Text>
              <Text style={styles.summaryLabel}>Absent</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: '#F59E0B' }]}>3</Text>
              <Text style={styles.summaryLabel}>Late</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📊 View Attendance Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📧 Send Absence Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📋 Export Attendance Data</Text>
          </TouchableOpacity>
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
    backgroundColor: '#10B981',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#D1FAE5',
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
  classButton: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  classButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  classButtonSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  actionButton: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#374151',
  },
}); 
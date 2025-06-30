import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function HomeworkScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Homework</Text>
          <Text style={styles.headerSubtitle}>Manage assignments and submissions</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Assignments</Text>
            <TouchableOpacity style={styles.addButton}>
              <Text style={styles.addButtonText}>+ New</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.assignmentCard}>
            <View style={styles.assignmentHeader}>
              <Text style={styles.assignmentTitle}>Math Problem Set #5</Text>
              <Text style={styles.assignmentDue}>Due: Tomorrow</Text>
            </View>
            <Text style={styles.assignmentClass}>Grade 10A - Mathematics</Text>
            <View style={styles.assignmentStats}>
              <Text style={styles.assignmentStat}>📝 18/32 submitted</Text>
              <Text style={styles.assignmentStat}>⏰ 2 days left</Text>
            </View>
          </View>

          <View style={styles.assignmentCard}>
            <View style={styles.assignmentHeader}>
              <Text style={styles.assignmentTitle}>Physics Lab Report</Text>
              <Text style={styles.assignmentDue}>Due: Friday</Text>
            </View>
            <Text style={styles.assignmentClass}>Grade 11B - Physics</Text>
            <View style={styles.assignmentStats}>
              <Text style={styles.assignmentStat}>📝 12/28 submitted</Text>
              <Text style={styles.assignmentStat}>⏰ 5 days left</Text>
            </View>
          </View>

          <View style={styles.assignmentCard}>
            <View style={styles.assignmentHeader}>
              <Text style={styles.assignmentTitle}>Chemistry Essay</Text>
              <Text style={styles.assignmentDue}>Due: Next Week</Text>
            </View>
            <Text style={styles.assignmentClass}>Grade 12A - Chemistry</Text>
            <View style={styles.assignmentStats}>
              <Text style={styles.assignmentStat}>📝 5/25 submitted</Text>
              <Text style={styles.assignmentStat}>⏰ 8 days left</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📊 View Submission Statistics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📧 Send Reminders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>⭐ Grade Submissions</Text>
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
    backgroundColor: '#8B5CF6',
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
    color: '#E9D5FF',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  assignmentCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  assignmentDue: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  assignmentClass: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  assignmentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  assignmentStat: {
    fontSize: 14,
    color: '#4B5563',
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
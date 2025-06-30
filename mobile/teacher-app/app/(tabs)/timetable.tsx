import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function TimetableScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Timetable</Text>
          <Text style={styles.headerSubtitle}>Your weekly schedule</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today - Monday</Text>
          <View style={styles.timeSlot}>
            <Text style={styles.timeText}>9:00 - 10:00</Text>
            <View style={styles.classInfo}>
              <Text style={styles.className}>Mathematics</Text>
              <Text style={styles.classDetails}>Grade 10A • Room 201</Text>
            </View>
          </View>
          <View style={styles.timeSlot}>
            <Text style={styles.timeText}>10:15 - 11:15</Text>
            <View style={styles.classInfo}>
              <Text style={styles.className}>Physics</Text>
              <Text style={styles.classDetails}>Grade 11B • Lab 1</Text>
            </View>
          </View>
          <View style={styles.timeSlot}>
            <Text style={styles.timeText}>11:30 - 12:30</Text>
            <View style={styles.classInfo}>
              <Text style={styles.className}>Free Period</Text>
              <Text style={styles.classDetails}>Staff Room</Text>
            </View>
          </View>
          <View style={styles.timeSlot}>
            <Text style={styles.timeText}>2:00 - 3:00</Text>
            <View style={styles.classInfo}>
              <Text style={styles.className}>Chemistry</Text>
              <Text style={styles.classDetails}>Grade 12A • Lab 2</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Overview</Text>
          <View style={styles.weeklyGrid}>
            <View style={styles.dayColumn}>
              <Text style={styles.dayHeader}>Mon</Text>
              <View style={styles.dayClasses}>
                <Text style={styles.dayClass}>Math</Text>
                <Text style={styles.dayClass}>Physics</Text>
                <Text style={styles.dayClass}>Chem</Text>
              </View>
            </View>
            <View style={styles.dayColumn}>
              <Text style={styles.dayHeader}>Tue</Text>
              <View style={styles.dayClasses}>
                <Text style={styles.dayClass}>Math</Text>
                <Text style={styles.dayClass}>Free</Text>
                <Text style={styles.dayClass}>Physics</Text>
              </View>
            </View>
            <View style={styles.dayColumn}>
              <Text style={styles.dayHeader}>Wed</Text>
              <View style={styles.dayClasses}>
                <Text style={styles.dayClass}>Chem</Text>
                <Text style={styles.dayClass}>Math</Text>
                <Text style={styles.dayClass}>Free</Text>
              </View>
            </View>
            <View style={styles.dayColumn}>
              <Text style={styles.dayHeader}>Thu</Text>
              <View style={styles.dayClasses}>
                <Text style={styles.dayClass}>Physics</Text>
                <Text style={styles.dayClass}>Chem</Text>
                <Text style={styles.dayClass}>Math</Text>
              </View>
            </View>
            <View style={styles.dayColumn}>
              <Text style={styles.dayHeader}>Fri</Text>
              <View style={styles.dayClasses}>
                <Text style={styles.dayClass}>Free</Text>
                <Text style={styles.dayClass}>Physics</Text>
                <Text style={styles.dayClass}>Chem</Text>
              </View>
            </View>
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
    backgroundColor: '#F59E0B',
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
    color: '#FEF3C7',
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
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    width: 100,
  },
  classInfo: {
    flex: 1,
    marginLeft: 16,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  classDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  weeklyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
  },
  dayHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  dayClasses: {
    alignItems: 'center',
  },
  dayClass: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
    textAlign: 'center',
  },
}); 
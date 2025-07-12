import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

export default function GalleryScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'albums' | 'create'>('albums');

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const tabs = [
    { id: 'albums', label: 'Albums', icon: 'albums' },
    { id: 'create', label: 'Create Album', icon: 'add-circle' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gallery Management</Text>
        <Text style={styles.headerSubtitle}>Manage school photo albums</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              selectedTab === tab.id && styles.activeTab,
            ]}
            onPress={() => setSelectedTab(tab.id as any)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={selectedTab === tab.id ? '#3B82F6' : '#6B7280'}
            />
            <Text
              style={[
                styles.tabText,
                selectedTab === tab.id && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {selectedTab === 'albums' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Existing Albums</Text>
            
            {/* Albums List */}
            <View style={styles.albumsList}>
              <View style={styles.albumCard}>
                <View style={styles.albumIcon}>
                  <Ionicons name="images" size={32} color="#3B82F6" />
                </View>
                <View style={styles.albumInfo}>
                  <Text style={styles.albumTitle}>Sports Day 2024</Text>
                  <Text style={styles.albumDescription}>Annual sports day celebration</Text>
                  <View style={styles.albumMeta}>
                    <Text style={styles.albumMetaText}>15 photos</Text>
                    <Text style={styles.albumMetaText}>Published</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.albumAction}>
                  <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.albumCard}>
                <View style={styles.albumIcon}>
                  <Ionicons name="images" size={32} color="#3B82F6" />
                </View>
                <View style={styles.albumInfo}>
                  <Text style={styles.albumTitle}>Science Fair 2024</Text>
                  <Text style={styles.albumDescription}>Students' science projects showcase</Text>
                  <View style={styles.albumMeta}>
                    <Text style={styles.albumMetaText}>8 photos</Text>
                    <Text style={styles.albumMetaText}>Draft</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.albumAction}>
                  <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.albumCard}>
                <View style={styles.albumIcon}>
                  <Ionicons name="images" size={32} color="#3B82F6" />
                </View>
                <View style={styles.albumInfo}>
                  <Text style={styles.albumTitle}>Graduation Ceremony</Text>
                  <Text style={styles.albumDescription}>Class of 2024 graduation photos</Text>
                  <View style={styles.albumMeta}>
                    <Text style={styles.albumMetaText}>25 photos</Text>
                    <Text style={styles.albumMetaText}>Published</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.albumAction}>
                  <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {selectedTab === 'create' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Create New Album</Text>
            
            <View style={styles.form}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Album Title</Text>
                <View style={styles.formInput}>
                  <Text style={styles.formInputPlaceholder}>Enter album title...</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <View style={[styles.formInput, styles.formTextArea]}>
                  <Text style={styles.formInputPlaceholder}>Enter album description...</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Photos</Text>
                <TouchableOpacity style={styles.uploadButton}>
                  <Ionicons name="cloud-upload" size={24} color="#3B82F6" />
                  <Text style={styles.uploadButtonText}>Upload Photos</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.formRow}>
                  <View style={styles.checkbox}>
                    <Ionicons name="checkbox" size={20} color="#3B82F6" />
                  </View>
                  <Text style={styles.checkboxLabel}>Publish immediately</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.createButton}>
                <Text style={styles.createButtonText}>Create Album</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gallery Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="albums" size={24} color="#10B981" />
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Total Albums</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="images" size={24} color="#3B82F6" />
              <Text style={styles.statValue}>156</Text>
              <Text style={styles.statLabel}>Total Photos</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="eye" size={24} color="#8B5CF6" />
              <Text style={styles.statValue}>2.3k</Text>
              <Text style={styles.statLabel}>Views</Text>
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
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#3B82F6',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  albumsList: {
    gap: 12,
  },
  albumCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  albumIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  albumInfo: {
    flex: 1,
    gap: 4,
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  albumDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  albumMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  albumMetaText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  albumAction: {
    padding: 8,
  },
  form: {
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  formTextArea: {
    height: 80,
  },
  formInputPlaceholder: {
    fontSize: 14,
    color: '#9ca3af',
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
  },
  createButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
}); 
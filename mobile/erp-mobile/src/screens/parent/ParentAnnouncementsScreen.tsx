import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Card, CardContent } from '../../components/ui/Card';
import { 
  MessageSquare, 
  Filter, 
  Bell, 
  AlertCircle, 
  ChevronDown,
  X,
  Users,
  Calendar,
  User
} from 'lucide-react-native';

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: 'all' | 'teachers' | 'parents' | 'students';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_published: boolean;
  created_at: string;
  created_by: string;
  school_id: string;
  author?: {
    first_name: string;
    last_name: string;
  };
}

interface Child {
  id: string;
  full_name: string;
  grade: number;
  section: string;
  school_id: string;
}

export const ParentAnnouncementsScreen: React.FC = () => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChild, setSelectedChild] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [showChildModal, setShowChildModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);

  // Fetch parent's children
  const { data: children = [] } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async (): Promise<Child[]> => {
      if (!user?.id) return [];

      const { data: studentParents, error: spError } = await supabase
        .from('student_parents')
        .select('student_id')
        .eq('parent_id', user.id);

      if (spError || !studentParents?.length) return [];

      const studentIds = studentParents.map(sp => sp.student_id);
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, grade, section, school_id')
        .in('id', studentIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch announcements
  const { data: announcements = [], isLoading, refetch } = useQuery({
    queryKey: ['parent-announcements', user?.school_id, selectedChild, selectedPriority],
    queryFn: async (): Promise<Announcement[]> => {
      if (!user?.school_id) return [];

      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          author:users!announcements_created_by_fkey(first_name, last_name)
        `)
        .eq('school_id', user.school_id)
        .eq('is_published', true)
        .in('target_audience', ['all', 'parents'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      let filteredData = data || [];

      // Filter by priority
      if (selectedPriority !== 'all') {
        filteredData = filteredData.filter(ann => ann.priority === selectedPriority);
      }

      return filteredData;
    },
    enabled: !!user?.school_id,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getSelectedChildName = () => {
    if (selectedChild === 'all') return 'All Children';
    const child = children.find(c => c.id === selectedChild);
    return child?.full_name || 'Select Child';
  };

  const getPriorityLabel = (priority: string) => {
    const priorities = {
      all: 'All Priorities',
      low: 'Low Priority',
      normal: 'Normal',
      high: 'High Priority',
      urgent: 'Urgent'
    };
    return priorities[priority as keyof typeof priorities] || 'All Priorities';
  };

  const getAudienceBadge = (audience: string) => {
    const audiences = {
      all: { label: 'Everyone', color: '#3b82f6' },
      teachers: { label: 'Teachers', color: '#10b981' },
      parents: { label: 'Parents', color: '#f59e0b' },
      students: { label: 'Students', color: '#8b5cf6' }
    };
    return audiences[audience as keyof typeof audiences] || audiences.all;
  };

  const getPriorityBadge = (priority: string) => {
    const priorities = {
      low: { label: 'Low', color: '#6b7280' },
      normal: { label: 'Normal', color: '#3b82f6' },
      high: { label: 'High', color: '#f59e0b' },
      urgent: { label: 'Urgent', color: '#ef4444' }
    };
    return priorities[priority as keyof typeof priorities] || priorities.normal;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderAnnouncement = ({ item }: { item: Announcement }) => {
    const audienceBadge = getAudienceBadge(item.target_audience);
    const priorityBadge = getPriorityBadge(item.priority);
    
    return (
      <Card style={{ marginBottom: 16 }}>
        <CardContent style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                {item.title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <View style={{ 
                  backgroundColor: audienceBadge.color + '20', 
                  paddingHorizontal: 8, 
                  paddingVertical: 2, 
                  borderRadius: 4 
                }}>
                  <Text style={{ fontSize: 12, color: audienceBadge.color, fontWeight: '500' }}>
                    {audienceBadge.label}
                  </Text>
                </View>
                <View style={{ 
                  backgroundColor: priorityBadge.color + '20', 
                  paddingHorizontal: 8, 
                  paddingVertical: 2, 
                  borderRadius: 4 
                }}>
                  <Text style={{ fontSize: 12, color: priorityBadge.color, fontWeight: '500' }}>
                    {priorityBadge.label}
                  </Text>
                </View>
              </View>
            </View>
            {item.priority === 'urgent' && (
              <View style={{ marginLeft: 8 }}>
                <AlertCircle size={20} color="#ef4444" />
              </View>
            )}
          </View>
          
          <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 12 }}>
            {item.content}
          </Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                By {item.author?.first_name} {item.author?.last_name}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                {formatDate(item.created_at)}
              </Text>
            </View>
            {item.priority === 'urgent' && (
              <View style={{ 
                backgroundColor: '#ef4444', 
                paddingHorizontal: 8, 
                paddingVertical: 4, 
                borderRadius: 4 
              }}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '500' }}>
                  Important
                </Text>
              </View>
            )}
          </View>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6b7280' }}>Loading announcements...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={{
        backgroundColor: 'white',
        paddingHorizontal: 24,
        paddingTop: 48,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ 
            width: 40, 
            height: 40, 
            borderRadius: 20, 
            backgroundColor: '#f59e0b',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12
          }}>
            <MessageSquare size={20} color="white" />
          </View>
          <View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
              School Announcements
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280' }}>
              Stay updated with important notices
            </Text>
          </View>
        </View>

        {/* Filters */}
        <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
          {children.length > 1 && (
            <TouchableOpacity
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f3f4f6',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8
              }}
              onPress={() => setShowChildModal(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <User size={16} color="#6b7280" />
                <Text style={{ fontSize: 14, color: '#111827', marginLeft: 6 }}>
                  {getSelectedChildName()}
                </Text>
              </View>
              <ChevronDown size={16} color="#6b7280" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f3f4f6',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8
            }}
            onPress={() => setShowPriorityModal(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Filter size={16} color="#6b7280" />
              <Text style={{ fontSize: 14, color: '#111827', marginLeft: 6 }}>
                {getPriorityLabel(selectedPriority)}
              </Text>
            </View>
            <ChevronDown size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Announcements List */}
      <FlatList
        data={announcements}
        renderItem={renderAnnouncement}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <Card>
            <CardContent style={{ padding: 32, alignItems: 'center' }}>
              <MessageSquare size={48} color="#6b7280" style={{ marginBottom: 16 }} />
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                No Announcements
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
                There are no announcements to display at this time.
              </Text>
            </CardContent>
          </Card>
        }
      />

      {/* Child Selector Modal */}
      {children.length > 1 && (
        <Modal
          visible={showChildModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowChildModal(false)}
        >
          <View style={{ 
            flex: 1, 
            backgroundColor: 'rgba(0,0,0,0.5)', 
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <View style={{ 
              backgroundColor: 'white', 
              borderRadius: 12,
              padding: 24,
              width: '80%',
              maxWidth: 300
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
                Select Child
              </Text>
              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  marginBottom: 8,
                  backgroundColor: selectedChild === 'all' ? '#f59e0b' + '20' : 'transparent'
                }}
                onPress={() => {
                  setSelectedChild('all');
                  setShowChildModal(false);
                }}
              >
                <Text style={{ 
                  fontSize: 16, 
                  color: selectedChild === 'all' ? '#f59e0b' : '#111827',
                  fontWeight: selectedChild === 'all' ? '600' : '400'
                }}>
                  All Children
                </Text>
              </TouchableOpacity>
              {children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    marginBottom: 8,
                    backgroundColor: selectedChild === child.id ? '#f59e0b' + '20' : 'transparent'
                  }}
                  onPress={() => {
                    setSelectedChild(child.id);
                    setShowChildModal(false);
                  }}
                >
                  <Text style={{ 
                    fontSize: 16, 
                    color: selectedChild === child.id ? '#f59e0b' : '#111827',
                    fontWeight: selectedChild === child.id ? '600' : '400'
                  }}>
                    {child.full_name}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    Grade {child.grade} - {child.section}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      )}

      {/* Priority Selector Modal */}
      <Modal
        visible={showPriorityModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPriorityModal(false)}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{ 
            backgroundColor: 'white', 
            borderRadius: 12,
            padding: 24,
            width: '80%',
            maxWidth: 300
          }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 }}>
              Filter by Priority
            </Text>
            {[
              { key: 'all', label: 'All Priorities' },
              { key: 'urgent', label: 'Urgent' },
              { key: 'high', label: 'High Priority' },
              { key: 'normal', label: 'Normal' },
              { key: 'low', label: 'Low Priority' }
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  marginBottom: 8,
                  backgroundColor: selectedPriority === option.key ? '#f59e0b' + '20' : 'transparent'
                }}
                onPress={() => {
                  setSelectedPriority(option.key);
                  setShowPriorityModal(false);
                }}
              >
                <Text style={{ 
                  fontSize: 16, 
                  color: selectedPriority === option.key ? '#f59e0b' : '#111827',
                  fontWeight: selectedPriority === option.key ? '600' : '400'
                }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

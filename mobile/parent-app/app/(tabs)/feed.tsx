import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

// Custom components
import { Card, CardContent, CardHeader, CardTitle } from '../../src/components/Card';
import { Heading1, Heading2, Heading3, Body, BodySmall, Caption } from '../../src/components/Typography';
import { Button } from '../../src/components/Button';
import { theme } from '../../src/theme/colors';

// Hooks
import { useAuth } from '../../src/contexts/AuthContext';
import { useChildren, useCommunityPosts } from '../../src/hooks/useParentData';

interface CommunityPost {
  id: string;
  title: string;
  content: string;
  author_name: string;
  author_role: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  school_id: string;
  has_media: boolean;
  user_liked: boolean;
}

export default function CommunityFeedScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [filter, setFilter] = useState<'all' | 'teachers' | 'parents'>('all');

  const { data: children } = useChildren(user?.id);
  const schoolId = children?.[0]?.sections?.school_id;
  
  const { data: posts, isLoading, refetch } = useCommunityPosts(schoolId);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const filteredPosts = React.useMemo(() => {
    if (!posts) return [];
    if (filter === 'all') return posts;
    return posts.filter(post => post.author_role === filter.slice(0, -1)); // Remove 's' from 'teachers'/'parents'
  }, [posts, filter]);

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return '1 day ago';
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'teacher':
        return 'school';
      case 'parent':
        return 'people';
      case 'admin':
        return 'admin-panel-settings';
      default:
        return 'person';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'teacher':
        return theme.colors.blue[500];
      case 'parent':
        return theme.colors.green[500];
      case 'admin':
        return theme.colors.purple[500];
      default:
        return theme.colors.gray[500];
    }
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) return;
    
    // TODO: Implement post creation API call
    console.log('Creating post:', { title: newPostTitle, content: newPostContent });
    
    setNewPostTitle('');
    setNewPostContent('');
    setShowCreateModal(false);
    await refetch();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Heading1 style={styles.title}>Community Feed</Heading1>
            <Body variant="secondary" style={styles.subtitle}>
              Connect with teachers and other parents
            </Body>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <MaterialIcons name="add" size={24} color={theme.colors.white} />
          </TouchableOpacity>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterButtons}>
              {[
                { key: 'all', label: 'All Posts', icon: 'forum' },
                { key: 'teachers', label: 'Teachers', icon: 'school' },
                { key: 'parents', label: 'Parents', icon: 'people' },
              ].map((filterOption) => (
                <TouchableOpacity
                  key={filterOption.key}
                  style={[
                    styles.filterButton,
                    filter === filterOption.key && styles.activeFilterButton
                  ]}
                  onPress={() => setFilter(filterOption.key as any)}
                >
                  <MaterialIcons 
                    name={filterOption.icon as any} 
                    size={18} 
                    color={filter === filterOption.key ? theme.colors.white : theme.colors.text.secondary} 
                  />
                  <Body 
                    style={[
                      styles.filterButtonText,
                      filter === filterOption.key && styles.activeFilterButtonText
                    ]}
                  >
                    {filterOption.label}
                  </Body>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <Card variant="default" style={styles.statCard}>
              <CardContent style={styles.statContent}>
                <MaterialIcons name="forum" size={20} color={theme.colors.blue[500]} />
                <Heading3 style={styles.statValue}>{posts?.length || 0}</Heading3>
                <Caption variant="secondary">Total Posts</Caption>
              </CardContent>
            </Card>
            
            <Card variant="default" style={styles.statCard}>
              <CardContent style={styles.statContent}>
                <MaterialIcons name="school" size={20} color={theme.colors.green[500]} />
                <Heading3 style={styles.statValue}>
                  {posts?.filter(p => p.author_role === 'teacher').length || 0}
                </Heading3>
                <Caption variant="secondary">From Teachers</Caption>
              </CardContent>
            </Card>

            <Card variant="default" style={styles.statCard}>
              <CardContent style={styles.statContent}>
                <MaterialIcons name="people" size={20} color={theme.colors.purple[500]} />
                <Heading3 style={styles.statValue}>
                  {posts?.filter(p => p.author_role === 'parent').length || 0}
                </Heading3>
                <Caption variant="secondary">From Parents</Caption>
              </CardContent>
            </Card>
          </View>
        </View>

        {/* Posts */}
        <View style={styles.postsSection}>
          {isLoading ? (
            <Card variant="default" style={styles.loadingCard}>
              <CardContent style={styles.loadingContent}>
                <MaterialIcons name="refresh" size={32} color={theme.colors.primary[500]} />
                <Body variant="secondary" style={{ marginTop: theme.spacing.sm }}>
                  Loading community posts...
                </Body>
              </CardContent>
            </Card>
          ) : filteredPosts.length > 0 ? (
            <View style={styles.postsContainer}>
              {filteredPosts.map((post) => (
                <Card key={post.id} variant="default" style={styles.postCard}>
                  <CardContent style={styles.postContent}>
                    {/* Post Header */}
                    <View style={styles.postHeader}>
                      <View style={styles.authorInfo}>
                        <View style={[styles.authorAvatar, { backgroundColor: getRoleColor(post.author_role) }]}>
                          <MaterialIcons 
                            name={getRoleIcon(post.author_role) as any} 
                            size={20} 
                            color={theme.colors.white} 
                          />
                        </View>
                        <View style={styles.authorDetails}>
                          <Body weight="medium" style={styles.authorName}>{post.author_name}</Body>
                          <Caption variant="secondary" style={styles.authorRole}>
                            {post.author_role.charAt(0).toUpperCase() + post.author_role.slice(1)}
                          </Caption>
                        </View>
                      </View>
                      <Caption variant="secondary">{formatTimeAgo(post.created_at)}</Caption>
                    </View>

                    {/* Post Title */}
                    <Heading3 style={styles.postTitle}>{post.title}</Heading3>

                    {/* Post Content */}
                    <Body style={styles.postText}>{post.content}</Body>

                    {/* Post Actions */}
                    <View style={styles.postActions}>
                      <TouchableOpacity style={styles.actionButton}>
                        <MaterialIcons 
                          name={post.user_liked ? "favorite" : "favorite-border"} 
                          size={18} 
                          color={post.user_liked ? theme.colors.red[500] : theme.colors.text.secondary} 
                        />
                        <Caption style={[styles.actionText, post.user_liked && { color: theme.colors.red[500] }]}>
                          {post.likes_count}
                        </Caption>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.actionButton}>
                        <MaterialIcons name="comment" size={18} color={theme.colors.text.secondary} />
                        <Caption style={styles.actionText}>{post.comments_count}</Caption>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.actionButton}>
                        <MaterialIcons name="share" size={18} color={theme.colors.text.secondary} />
                        <Caption style={styles.actionText}>Share</Caption>
                      </TouchableOpacity>
                    </View>
                  </CardContent>
                </Card>
              ))}
            </View>
          ) : (
            <Card variant="default" style={styles.emptyCard}>
              <CardContent style={styles.emptyContent}>
                <MaterialIcons name="forum" size={64} color={theme.colors.text.muted} />
                <Heading3 variant="secondary" style={styles.emptyTitle}>No Posts Found</Heading3>
                <Body variant="muted" style={styles.emptyText}>
                  {filter === 'all' 
                    ? 'No community posts available yet. Be the first to share!'
                    : `No posts from ${filter} found. Try changing the filter.`
                  }
                </Body>
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => setShowCreateModal(true)}
                  style={{ marginTop: theme.spacing.md }}
                >
                  Create First Post
                </Button>
              </CardContent>
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Create Post Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <Heading2 style={styles.modalTitle}>Create Post</Heading2>
            <TouchableOpacity onPress={handleCreatePost} disabled={!newPostTitle.trim() || !newPostContent.trim()}>
              <Body 
                weight="medium" 
                style={[
                  styles.postButton,
                  (!newPostTitle.trim() || !newPostContent.trim()) && styles.disabledPostButton
                ]}
              >
                Post
              </Body>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Body weight="medium" style={styles.inputLabel}>Title</Body>
              <TextInput
                style={styles.titleInput}
                value={newPostTitle}
                onChangeText={setNewPostTitle}
                placeholder="What's your post about?"
                placeholderTextColor={theme.colors.text.muted}
                maxLength={100}
              />
            </View>

            <View style={styles.inputContainer}>
              <Body weight="medium" style={styles.inputLabel}>Content</Body>
              <TextInput
                style={styles.contentInput}
                value={newPostContent}
                onChangeText={setNewPostContent}
                placeholder="Share your thoughts with the community..."
                placeholderTextColor={theme.colors.text.muted}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                maxLength={1000}
              />
              <Caption variant="secondary" style={styles.characterCount}>
                {newPostContent.length}/1000 characters
              </Caption>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    color: theme.colors.text.secondary,
  },
  createButton: {
    backgroundColor: theme.colors.primary[500],
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.md,
  },
  filterContainer: {
    marginVertical: theme.spacing.sm,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  activeFilterButton: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  filterButtonText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
  },
  activeFilterButtonText: {
    color: theme.colors.white,
  },
  statsContainer: {
    marginVertical: theme.spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    borderColor: theme.colors.border,
  },
  statContent: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statValue: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
  },
  postsSection: {
    flex: 1,
  },
  loadingCard: {
    borderColor: theme.colors.border,
  },
  loadingContent: {
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  postsContainer: {
    gap: theme.spacing.md,
  },
  postCard: {
    borderColor: theme.colors.border,
  },
  postContent: {
    padding: theme.spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorDetails: {
    gap: theme.spacing.xs / 2,
  },
  authorName: {
    color: theme.colors.text.primary,
  },
  authorRole: {
    textTransform: 'capitalize',
  },
  postTitle: {
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  postText: {
    color: theme.colors.text.secondary,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  postActions: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  actionText: {
    color: theme.colors.text.secondary,
  },
  emptyCard: {
    borderColor: theme.colors.border,
  },
  emptyContent: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    color: theme.colors.text.primary,
  },
  postButton: {
    color: theme.colors.primary[500],
  },
  disabledPostButton: {
    color: theme.colors.text.muted,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.surface,
  },
  contentInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.surface,
    height: 150,
  },
  characterCount: {
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },
}); 
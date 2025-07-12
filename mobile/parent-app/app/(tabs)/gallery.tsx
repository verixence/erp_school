import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Image, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Card, Title, Paragraph, Chip, Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { useChildren } from '../../src/hooks/useParentData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../src/lib/supabase';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Album {
  id: string;
  title: string;
  description: string;
  is_published: boolean;
  image_count: number;
  created_at: string;
  created_by: string;
  school_id: string;
}

interface GalleryImage {
  id: string;
  album_id: string;
  image_url: string;
  title: string;
  description: string;
  created_at: string;
}

export default function GalleryScreen() {
  const { user } = useAuth();
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: children } = useChildren(user?.id);
  const schoolId = children?.[0]?.sections?.school_id;

  // Fetch albums
  const { data: albums = [], isLoading: albumsLoading, refetch: refetchAlbums } = useQuery({
    queryKey: ['gallery-albums', schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      
      const { data, error } = await supabase
        .from('gallery_albums')
        .select(`
          *,
          gallery_images(count)
        `)
        .eq('school_id', schoolId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching albums:', error);
        return [];
      }

      return data.map(album => ({
        ...album,
        image_count: album.gallery_images?.[0]?.count || 0
      }));
    },
    enabled: !!schoolId,
  });

  // Fetch images for selected album
  const { data: images = [], isLoading: imagesLoading, refetch: refetchImages } = useQuery({
    queryKey: ['gallery-images', selectedAlbum?.id],
    queryFn: async () => {
      if (!selectedAlbum?.id) return [];
      
      const { data, error } = await supabase
        .from('gallery_images')
        .select('*')
        .eq('album_id', selectedAlbum.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching images:', error);
        return [];
      }

      return data;
    },
    enabled: !!selectedAlbum?.id,
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchAlbums();
      if (selectedAlbum) {
        await refetchImages();
      }
    } finally {
      setRefreshing(false);
    }
  }, [refetchAlbums, refetchImages, selectedAlbum]);

  const filteredAlbums = albums.filter(album =>
    album.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    album.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openImageModal = (image: GalleryImage) => {
    setSelectedImage(image);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (!selectedImage) return;
    
    const currentIndex = images.findIndex(img => img.id === selectedImage.id);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    } else {
      newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    }
    
    setSelectedImage(images[newIndex]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (albumsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading gallery...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {selectedAlbum ? (
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setSelectedAlbum(null)}
              >
                <MaterialIcons name="arrow-back" size={24} color="#3B82F6" />
                <Text style={styles.backText}>Back to Albums</Text>
              </TouchableOpacity>
            ) : (
              <Title style={styles.headerTitle}>School Gallery</Title>
            )}
          </View>
          
          {selectedAlbum && (
            <View style={styles.albumHeader}>
              <Title style={styles.albumTitle}>{selectedAlbum.title}</Title>
              <Paragraph style={styles.albumDescription}>{selectedAlbum.description}</Paragraph>
              <View style={styles.albumMeta}>
                <Chip style={styles.chip} textStyle={styles.chipText}>
                  {images.length} {images.length === 1 ? 'Image' : 'Images'}
                </Chip>
                <Chip style={styles.chip} textStyle={styles.chipText}>
                  {formatDate(selectedAlbum.created_at)}
                </Chip>
              </View>
            </View>
          )}
        </View>

        {/* Search Bar (only for albums view) */}
        {!selectedAlbum && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search albums..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              left={<TextInput.Icon icon="magnify" />}
            />
          </View>
        )}

        {/* Albums Grid */}
        {!selectedAlbum && (
          <View style={styles.albumsGrid}>
            {filteredAlbums.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="photo-library" size={64} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>No Albums Available</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery ? 'No albums match your search' : 'School gallery is empty'}
                </Text>
              </View>
            ) : (
              filteredAlbums.map((album) => (
                <TouchableOpacity
                  key={album.id}
                  style={styles.albumCard}
                  onPress={() => setSelectedAlbum(album)}
                >
                  <Card style={styles.card}>
                    <Card.Content>
                      <View style={styles.albumIcon}>
                        <MaterialIcons name="photo-library" size={48} color="#3B82F6" />
                      </View>
                      <Title style={styles.cardTitle}>{album.title}</Title>
                      <Paragraph style={styles.cardDescription}>
                        {album.description.length > 100 
                          ? `${album.description.substring(0, 100)}...` 
                          : album.description}
                      </Paragraph>
                      <View style={styles.cardMeta}>
                        <Chip style={styles.chip} textStyle={styles.chipText}>
                          {album.image_count} {album.image_count === 1 ? 'Image' : 'Images'}
                        </Chip>
                        <Chip style={styles.chip} textStyle={styles.chipText}>
                          {formatDate(album.created_at)}
                        </Chip>
                      </View>
                    </Card.Content>
                  </Card>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Images Grid */}
        {selectedAlbum && (
          <View style={styles.imagesGrid}>
            {imagesLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>Loading images...</Text>
              </View>
            ) : images.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="photo" size={64} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>No Images</Text>
                <Text style={styles.emptySubtitle}>This album is empty</Text>
              </View>
            ) : (
              images.map((image) => (
                <TouchableOpacity
                  key={image.id}
                  style={styles.imageCard}
                  onPress={() => openImageModal(image)}
                >
                  <Image
                    source={{ uri: image.image_url }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                  {image.title && (
                    <View style={styles.imageOverlay}>
                      <Text style={styles.imageTitle}>{image.title}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Image Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={closeImageModal}>
              <MaterialIcons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
          
          {selectedImage && (
            <>
              <Image
                source={{ uri: selectedImage.image_url }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              
              <View style={styles.modalControls}>
                <TouchableOpacity
                  style={styles.modalNavButton}
                  onPress={() => navigateImage('prev')}
                >
                  <MaterialIcons name="chevron-left" size={32} color="#ffffff" />
                </TouchableOpacity>
                
                <View style={styles.modalInfo}>
                  {selectedImage.title && (
                    <Text style={styles.modalTitle}>{selectedImage.title}</Text>
                  )}
                  {selectedImage.description && (
                    <Text style={styles.modalDescription}>{selectedImage.description}</Text>
                  )}
                  <Text style={styles.modalDate}>
                    {formatDate(selectedImage.created_at)}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={styles.modalNavButton}
                  onPress={() => navigateImage('next')}
                >
                  <MaterialIcons name="chevron-right" size={32} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  albumHeader: {
    marginTop: 16,
  },
  albumTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  albumDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  albumMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  searchInput: {
    backgroundColor: '#f9fafb',
  },
  albumsGrid: {
    padding: 16,
  },
  albumCard: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  albumIcon: {
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#e5e7eb',
    height: 28,
  },
  chipText: {
    fontSize: 12,
    color: '#374151',
  },
  imagesGrid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  imageCard: {
    width: (screenWidth - 48) / 2,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
  },
  imageTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    paddingTop: 50,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalImage: {
    flex: 1,
    width: screenWidth,
    height: screenHeight - 200,
  },
  modalControls: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  modalNavButton: {
    padding: 8,
  },
  modalInfo: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#d1d5db',
    marginBottom: 8,
  },
  modalDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
}); 
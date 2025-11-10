import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Image,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import {
  Camera,
  Image as ImageIcon,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';

const { width: screenWidth } = Dimensions.get('window');

interface Album {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  event_name: string | null;
  images_count: number;
  created_at: string;
  cover_image: string | null;
}

interface GalleryImage {
  id: string;
  album_id: string;
  image_url: string;
  caption: string | null;
  file_name: string;
  created_at: string;
}

const ParentGalleryScreen = () => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [showImages, setShowImages] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);

  // Fetch albums
  const { data: albums = [], isLoading, refetch } = useQuery({
    queryKey: ['gallery-albums', user?.school_id],
    queryFn: async (): Promise<Album[]> => {
      if (!user?.school_id) return [];

      console.log('Fetching gallery albums for school:', user.school_id);

      const { data, error } = await supabase
        .from('gallery_albums')
        .select(`
          id,
          title,
          description,
          event_date,
          event_name,
          created_at
        `)
        .eq('school_id', user.school_id)
        .eq('is_published', true)
        .order('event_date', { ascending: false });

      if (error) {
        console.error('Error fetching albums:', error);
        throw error;
      }

      console.log('Raw gallery albums data:', data);

      // Get images count and cover image for each album
      const albumsWithMeta = await Promise.all(
        (data || []).map(async (album) => {
          const { data: images, error: imagesError } = await supabase
            .from('gallery_images')
            .select('image_url')
            .eq('album_id', album.id)
            .order('upload_order', { ascending: true });

          return {
            ...album,
            images_count: images?.length || 0,
            cover_image: images?.[0]?.image_url || null
          };
        })
      );

      return albumsWithMeta;
    },
    enabled: !!user?.school_id,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const openAlbum = async (album: Album) => {
    setSelectedAlbum(album);
    
    console.log('Fetching images for album:', album.id);

    // Fetch images for this album
    const { data, error } = await supabase
      .from('gallery_images')
      .select('*')
      .eq('album_id', album.id)
      .order('upload_order', { ascending: true });

    if (error) {
      console.error('Error fetching images:', error);
      return;
    }

    console.log('Raw gallery images data:', data);
    setImages(data || []);
    setShowImages(true);
  };

  const closeImageViewer = () => {
    setShowImages(false);
    setSelectedImageIndex(null);
    setSelectedAlbum(null);
    setImages([]);
  };

  const formatEventDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6b7280' }}>Loading gallery...</Text>
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
        paddingTop: 16,
        paddingBottom: 20,
        borderBottomWidth: 1, 
        borderBottomColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ 
              backgroundColor: '#8b5cf6', 
              padding: 10, 
              borderRadius: 12, 
              marginRight: 12 
            }}>
              <Camera size={24} color="white" />
            </View>
            <View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>
                Gallery
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                Explore memories from school events and activities
              </Text>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ImageIcon size={16} color="#6b7280" />
            <Text style={{ fontSize: 14, color: '#6b7280', marginLeft: 4 }}>
              {albums.length} albums
            </Text>
          </View>
        </View>
      </View>

      {/* Albums Grid */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {albums.length === 0 ? (
          <Card style={{ padding: 32, alignItems: 'center' }}>
            <Camera size={48} color="#6b7280" style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
              No Albums Available
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' }}>
              No photo albums have been published yet. Check back later for school event photos and memories.
            </Text>
          </Card>
        ) : (
          <View style={{ 
            flexDirection: 'row', 
            flexWrap: 'wrap', 
            justifyContent: 'space-between',
            gap: 16 
          }}>
            {albums.map((album) => (
              <TouchableOpacity
                key={album.id}
                style={{
                  width: (screenWidth - 64) / 2, // 2 columns with padding
                  marginBottom: 16
                }}
                onPress={() => openAlbum(album)}
              >
                <Card style={{ overflow: 'hidden' }}>
                  {/* Album Cover */}
                  <View style={{ 
                    height: 120, 
                    backgroundColor: '#f3f4f6',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {album.cover_image ? (
                      <Image
                        source={{ uri: album.cover_image }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <ImageIcon size={32} color="#6b7280" />
                    )}
                  </View>

                  {/* Album Info */}
                  <View style={{ padding: 12 }}>
                    <Text style={{ 
                      fontSize: 16, 
                      fontWeight: '600', 
                      color: '#111827',
                      marginBottom: 4
                    }} numberOfLines={2}>
                      {album.title}
                    </Text>
                    
                    {album.event_name && (
                      <Text style={{ 
                        fontSize: 12, 
                        color: '#8b5cf6',
                        marginBottom: 4,
                        fontWeight: '500'
                      }}>
                        {album.event_name}
                      </Text>
                    )}

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <ImageIcon size={12} color="#6b7280" />
                      <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>
                        {album.images_count} photos
                      </Text>
                    </View>

                    {album.event_date && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Calendar size={12} color="#6b7280" />
                        <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>
                          {formatEventDate(album.event_date)}
                        </Text>
                      </View>
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Image Viewer Modal */}
      <Modal
        visible={showImages}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={closeImageViewer}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 16,
            backgroundColor: 'rgba(0,0,0,0.8)'
          }}>
            <TouchableOpacity onPress={closeImageViewer}>
              <X size={24} color="white" />
            </TouchableOpacity>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>
              {selectedAlbum?.title}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Image Grid */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ 
              padding: 20,
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between'
            }}
          >
            {images.map((image, index) => (
              <TouchableOpacity
                key={image.id}
                style={{
                  width: (screenWidth - 60) / 3, // 3 columns
                  height: (screenWidth - 60) / 3,
                  marginBottom: 10,
                  borderRadius: 8,
                  overflow: 'hidden'
                }}
                onPress={() => setSelectedImageIndex(index)}
              >
                <Image
                  source={{ uri: image.image_url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Full Image Viewer */}
          {selectedImageIndex !== null && (
            <Modal
              visible={true}
              animationType="fade"
              presentationStyle="fullScreen"
              onRequestClose={() => setSelectedImageIndex(null)}
            >
              <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
                {/* Header */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  backgroundColor: 'rgba(0,0,0,0.8)'
                }}>
                  <TouchableOpacity onPress={() => setSelectedImageIndex(null)}>
                    <X size={24} color="white" />
                  </TouchableOpacity>
                  <Text style={{ color: 'white', fontSize: 16 }}>
                    {selectedImageIndex + 1} of {images.length}
                  </Text>
                  <TouchableOpacity>
                    <Download size={24} color="white" />
                  </TouchableOpacity>
                </View>

                {/* Image */}
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Image
                    source={{ uri: images[selectedImageIndex].image_url }}
                    style={{ 
                      width: screenWidth, 
                      height: screenWidth,
                      maxHeight: '80%'
                    }}
                    resizeMode="contain"
                  />
                </View>

                {/* Navigation */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  backgroundColor: 'rgba(0,0,0,0.8)'
                }}>
                  <TouchableOpacity
                    onPress={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                    disabled={selectedImageIndex === 0}
                    style={{ opacity: selectedImageIndex === 0 ? 0.5 : 1 }}
                  >
                    <ChevronLeft size={32} color="white" />
                  </TouchableOpacity>

                  <View style={{ flex: 1, alignItems: 'center' }}>
                    {images[selectedImageIndex].caption && (
                      <Text style={{ 
                        color: 'white', 
                        fontSize: 16, 
                        textAlign: 'center',
                        marginHorizontal: 20
                      }}>
                        {images[selectedImageIndex].caption}
                      </Text>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() => setSelectedImageIndex(Math.min(images.length - 1, selectedImageIndex + 1))}
                    disabled={selectedImageIndex === images.length - 1}
                    style={{ opacity: selectedImageIndex === images.length - 1 ? 0.5 : 1 }}
                  >
                    <ChevronRight size={32} color="white" />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </Modal>
          )}
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
};

export { ParentGalleryScreen };
export default ParentGalleryScreen;
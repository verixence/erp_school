import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  SafeAreaView, 
  RefreshControl, 
  TouchableOpacity, 
  Image, 
  Dimensions,
  FlatList
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  Camera, 
  Calendar, 
  Download, 
  Eye, 
  Heart,
  Share,
  ImageIcon,
  Grid,
  List,
  Search
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const imageWidth = (width - 60) / 2; // 2 columns with padding

interface Album {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  cover_image?: string;
  image_count: number;
}

interface GalleryImage {
  id: string;
  album_id: string;
  title: string;
  description?: string;
  image_url: string;
  uploaded_at: string;
  album_title?: string;
}

export const ParentGalleryScreen: React.FC = () => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'albums' | 'images'>('albums');

  // Fetch school albums
  const { data: albums = [], isLoading: albumsLoading, refetch: refetchAlbums } = useQuery({
    queryKey: ['school-albums', user?.school_id],
    queryFn: async (): Promise<Album[]> => {
      if (!user?.school_id) return [];

      const { data, error } = await supabase
        .from('gallery_albums')
        .select(`
          id,
          title,
          description,
          created_at,
          cover_image,
          gallery_images(count)
        `)
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((album: any) => ({
        id: album.id,
        title: album.title,
        description: album.description,
        created_at: album.created_at,
        cover_image: album.cover_image,
        image_count: album.gallery_images?.[0]?.count || 0
      }));
    },
    enabled: !!user?.school_id,
  });

  // Fetch images for selected album
  const { data: albumImages = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['album-images', selectedAlbum],
    queryFn: async (): Promise<GalleryImage[]> => {
      if (!selectedAlbum) return [];

      const { data, error } = await supabase
        .from('gallery_images')
        .select(`
          id,
          album_id,
          title,
          description,
          image_url,
          uploaded_at,
          gallery_albums!inner(title)
        `)
        .eq('album_id', selectedAlbum)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((image: any) => ({
        id: image.id,
        album_id: image.album_id,
        title: image.title,
        description: image.description,
        image_url: image.image_url,
        uploaded_at: image.uploaded_at,
        album_title: image.gallery_albums?.title
      }));
    },
    enabled: !!selectedAlbum,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchAlbums();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderAlbumItem = ({ item }: { item: Album }) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedAlbum(item.id);
        setViewMode('images');
      }}
      className="mb-4"
    >
      <Card>
        <CardContent className="p-0">
          <View className="relative">
            {item.cover_image ? (
              <Image
                source={{ uri: item.cover_image }}
                className="w-full h-48 rounded-t-lg"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                <Camera size={48} color="#9ca3af" />
              </View>
            )}
            <View className="absolute bottom-2 right-2 bg-black/50 px-2 py-1 rounded">
              <Text className="text-white text-xs">{item.image_count} photos</Text>
            </View>
          </View>
          <View className="p-4">
            <Text className="text-lg font-semibold text-gray-900 mb-1">
              {item.title}
            </Text>
            {item.description && (
              <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
                {item.description}
              </Text>
            )}
            <View className="flex-row items-center">
              <Calendar size={14} color="#6b7280" />
              <Text className="text-xs text-gray-500 ml-1">
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>
    </TouchableOpacity>
  );

  const renderImageItem = ({ item }: { item: GalleryImage }) => (
    <TouchableOpacity className="mb-2 mx-1" style={{ width: imageWidth }}>
      <Card>
        <CardContent className="p-0">
          <Image
            source={{ uri: item.image_url }}
            style={{ width: imageWidth, height: imageWidth }}
            className="rounded-lg"
            resizeMode="cover"
          />
          {item.title && (
            <View className="p-2">
              <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                {item.title}
              </Text>
              <Text className="text-xs text-gray-500">
                {formatDate(item.uploaded_at)}
              </Text>
            </View>
          )}
        </CardContent>
      </Card>
    </TouchableOpacity>
  );

  if (albumsLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">Loading gallery...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          {viewMode === 'images' && selectedAlbum ? (
            <TouchableOpacity
              onPress={() => {
                setViewMode('albums');
                setSelectedAlbum(null);
              }}
              className="flex-row items-center"
            >
              <Text className="text-blue-600 text-lg font-semibold">← Albums</Text>
            </TouchableOpacity>
          ) : (
            <Text className="text-xl font-bold text-gray-900">School Gallery</Text>
          )}
          
          <View className="flex-row items-center space-x-2">
            <TouchableOpacity className="p-2">
              <Search size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
        
        {viewMode === 'images' && selectedAlbum && (
          <Text className="text-sm text-gray-600 mt-1">
            {albumImages.length} photos
          </Text>
        )}
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {viewMode === 'albums' ? (
          <View className="py-4">
            {albums.length === 0 ? (
              <View className="flex-1 justify-center items-center py-20">
                <Camera size={48} color="#9ca3af" />
                <Text className="text-gray-500 text-center mt-4">
                  No photo albums available yet
                </Text>
              </View>
            ) : (
              <FlatList
                data={albums}
                renderItem={renderAlbumItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        ) : (
          <View className="py-4">
            {imagesLoading ? (
              <View className="flex-1 justify-center items-center py-20">
                <Text className="text-gray-500">Loading photos...</Text>
              </View>
            ) : albumImages.length === 0 ? (
              <View className="flex-1 justify-center items-center py-20">
                <ImageIcon size={48} color="#9ca3af" />
                <Text className="text-gray-500 text-center mt-4">
                  No photos in this album yet
                </Text>
              </View>
            ) : (
              <FlatList
                data={albumImages}
                renderItem={renderImageItem}
                keyExtractor={(item) => item.id}
                numColumns={2}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                columnWrapperStyle={{ justifyContent: 'space-between' }}
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}; 
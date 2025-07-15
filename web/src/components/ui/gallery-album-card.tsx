'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Image, Eye, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { format } from 'date-fns';

interface GalleryAlbum {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  event_name: string | null;
  images_count: number[];
  created_at: string;
  created_by_user: {
    first_name: string;
    last_name: string;
  };
}

interface GalleryAlbumCardProps {
  album: GalleryAlbum;
  viewOnly?: boolean;
}

export function GalleryAlbumCard({ album, viewOnly = false }: GalleryAlbumCardProps) {
  const [showImages, setShowImages] = useState(false);
  const [images, setImages] = useState<any[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const fetchImages = async () => {
    try {
      const response = await fetch(`/api/admin/gallery/images?album_id=${album.id}`);
      if (response.ok) {
        const data = await response.json();
        setImages(data.images || []);
      }
    } catch (error) {
      console.error('Failed to fetch images:', error);
    }
  };

  const openImageViewer = (index: number) => {
    setSelectedImageIndex(index);
  };

  const closeImageViewer = () => {
    setSelectedImageIndex(null);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImageIndex === null) return;
    
    if (direction === 'prev') {
      setSelectedImageIndex(selectedImageIndex > 0 ? selectedImageIndex - 1 : images.length - 1);
    } else {
      setSelectedImageIndex(selectedImageIndex < images.length - 1 ? selectedImageIndex + 1 : 0);
    }
  };

  const handleViewClick = () => {
    fetchImages();
    setShowImages(true);
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{album.title}</CardTitle>
            <Badge variant="default" className="text-green-600">
              Published
            </Badge>
          </div>
          {album.event_name && (
            <p className="text-sm text-gray-600">{album.event_name}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {album.description && (
            <p className="text-sm text-gray-700 line-clamp-2">{album.description}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {album.event_date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(album.event_date), 'MMM d, yyyy')}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Image className="w-4 h-4" />
              {album.images_count[0]} photos
            </div>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={handleViewClick}
          >
            <Eye className="w-4 h-4 mr-2" />
            View Photos
          </Button>
        </CardContent>
      </Card>

      {/* Album Images Dialog */}
      <Dialog open={showImages} onOpenChange={setShowImages}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{album.title} ({images.length} photos)</span>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[70vh]">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
              {images.map((image, index) => (
                <div 
                  key={image.id} 
                  className="space-y-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => openImageViewer(index)}
                >
                  <img
                    src={image.image_url}
                    alt={image.caption || 'Gallery image'}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  {image.caption && (
                    <p className="text-xs text-gray-600 line-clamp-2">{image.caption}</p>
                  )}
                </div>
              ))}
            </div>
            {images.length === 0 && (
              <div className="text-center py-8">
                <Image className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No images in this album yet.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Modal */}
      {selectedImageIndex !== null && (
        <Dialog open={selectedImageIndex !== null} onOpenChange={closeImageViewer}>
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0">
            <div className="relative">
              {/* Navigation Buttons */}
              <Button
                variant="outline"
                size="sm"
                className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10"
                onClick={() => navigateImage('prev')}
              >
                ←
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10"
                onClick={() => navigateImage('next')}
              >
                →
              </Button>

              {/* Close Button */}
              <Button
                variant="outline"
                size="sm"
                className="absolute top-4 right-4 z-10"
                onClick={closeImageViewer}
              >
                ✕
              </Button>

              {/* Image */}
              <div className="flex items-center justify-center bg-black min-h-[60vh]">
                <img
                  src={images[selectedImageIndex]?.image_url}
                  alt={images[selectedImageIndex]?.caption || 'Gallery image'}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              </div>

              {/* Image Info */}
              <div className="p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      Image {selectedImageIndex + 1} of {images.length}
                    </p>
                    {images[selectedImageIndex]?.caption && (
                      <p className="text-sm text-gray-600 mt-1">
                        {images[selectedImageIndex].caption}
                      </p>
                    )}
                  </div>
                  {!viewOnly && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 
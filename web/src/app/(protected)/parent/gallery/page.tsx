'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar, Camera, Image, Eye, Search, Download, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase-client'
import { motion, AnimatePresence } from 'framer-motion'

interface Album {
  id: string
  title: string
  description: string | null
  event_date: string | null
  event_name: string | null
  images_count: number
  created_at: string
  cover_image: string | null
}

interface GalleryImage {
  id: string
  image_url: string
  caption: string | null
  file_name: string | null
  upload_order: number
}

export default function ParentGallery() {
  const { user } = useAuth()
  const [albums, setAlbums] = useState<Album[]>([])
  const [allImages, setAllImages] = useState<GalleryImage[]>([])
  const [images, setImages] = useState<GalleryImage[]>([])
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null)
  const [loading, setLoading] = useState(true)
  const [showImages, setShowImages] = useState(false)
  const [showPhotoWall, setShowPhotoWall] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)

  useEffect(() => {
    if (user) {
      fetchAlbums()
      fetchAllImages()
    }
  }, [user])

  const fetchAlbums = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/gallery/albums', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAlbums(data.data || [])
      } else {
        console.error('Failed to fetch albums:', await response.text())
      }
    } catch (error) {
      console.error('Failed to fetch albums:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllImages = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      // First get all albums
      const albumsResponse = await fetch('/api/gallery/albums', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (albumsResponse.ok) {
        const albumsData = await albumsResponse.json()
        const albumsList = albumsData.data || []
        
        // Then fetch images for each album
        const imagePromises = albumsList.map(async (album: Album) => {
          const imagesResponse = await fetch(`/api/gallery/images?album_id=${album.id}`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          })
          
          if (imagesResponse.ok) {
            const imagesData = await imagesResponse.json()
            return (imagesData.data || []).map((img: GalleryImage) => ({
              ...img,
              album_title: album.title,
              album_id: album.id
            }))
          }
          return []
        })

        const allImageResults = await Promise.all(imagePromises)
        const flattenedImages = allImageResults.flat()
        setAllImages(flattenedImages)
      }
    } catch (error) {
      console.error('Failed to fetch all images:', error)
    }
  }

  const fetchImages = async (albumId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(`/api/gallery/images?album_id=${albumId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setImages(data.data || [])
      } else {
        console.error('Failed to fetch images:', await response.text())
      }
    } catch (error) {
      console.error('Failed to fetch images:', error)
    }
  }

  const openAlbum = (album: Album) => {
    setSelectedAlbum(album)
    fetchImages(album.id)
    setShowImages(true)
  }

  const openPhotoWall = () => {
    setShowPhotoWall(true)
  }

  const openImageViewer = (index: number, fromPhotoWall = false) => {
    if (fromPhotoWall) {
      setSelectedImageIndex(index)
    } else {
      setSelectedImageIndex(index)
    }
  }

  const closeImageViewer = () => {
    setSelectedImageIndex(null)
  }

  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImageIndex === null) return
    
    const imageList = showPhotoWall ? allImages : images
    
    if (direction === 'prev') {
      setSelectedImageIndex(selectedImageIndex > 0 ? selectedImageIndex - 1 : imageList.length - 1)
    } else {
      setSelectedImageIndex(selectedImageIndex < imageList.length - 1 ? selectedImageIndex + 1 : 0)
    }
  }

  const downloadImage = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName || 'image.jpg'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }

  const filteredAlbums = albums.filter(album =>
    album.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    album.event_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    album.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredImages = allImages.filter(image =>
    image.caption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (image as any).album_title?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gallery</h1>
          <p className="text-gray-600 mt-2">
            Explore memories from school events and activities
          </p>
        </div>
        
        <Button 
          onClick={openPhotoWall}
          className="flex items-center gap-2"
        >
          <Image className="w-4 h-4" />
          Photo Wall ({allImages.length} photos)
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search albums..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Albums Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAlbums.map((album) => (
          <Card key={album.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => openAlbum(album)}>
            <div className="h-48 bg-gray-100 relative overflow-hidden">
              {album.cover_image ? (
                <img
                  src={album.cover_image}
                  alt={album.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <Camera className="w-12 h-12 text-gray-400" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="absolute bottom-4 left-4 right-4">
                <Badge variant="secondary" className="bg-white/90 text-gray-800">
                  {album.images_count} photos
                </Badge>
              </div>
              <div className="absolute top-4 right-4">
                <Badge className="bg-green-600 text-white">
                  Published
                </Badge>
              </div>
            </div>
            
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900">
                {album.title}
              </CardTitle>
              {album.event_name && (
                <p className="text-sm text-gray-600 font-medium">{album.event_name}</p>
              )}
            </CardHeader>
            
            <CardContent className="pt-0 space-y-4">
              {album.description && (
                <p className="text-sm text-gray-700 line-clamp-2">{album.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {album.event_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(album.event_date).toLocaleDateString()}
                  </div>
                )}
              </div>

              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  openAlbum(album);
                }}
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Photos
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Albums Message */}
      {filteredAlbums.length === 0 && !loading && (
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-8 text-center">
            <Camera className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {searchTerm ? 'No albums found' : 'No albums available'}
            </h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'Try adjusting your search terms.'
                : 'Published photo albums will appear here when available.'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Photo Wall Modal */}
      <Dialog open={showPhotoWall} onOpenChange={setShowPhotoWall}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-2xl font-bold text-center">
              School Photo Wall ({allImages.length} photos)
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[80vh] p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredImages.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="aspect-square cursor-pointer group relative overflow-hidden rounded-lg"
                  onClick={() => openImageViewer(index, true)}
                >
                  <img
                    src={image.image_url}
                    alt={image.caption || 'Gallery image'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                  {image.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-white text-xs truncate">{image.caption}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
            
            {filteredImages.length === 0 && (
              <div className="text-center py-16">
                <Image className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No photos found.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Album Images Dialog */}
      <Dialog open={showImages} onOpenChange={setShowImages}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-2xl font-bold text-center">
              {selectedAlbum?.title} ({images.length} photos)
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[70vh] p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="aspect-square cursor-pointer group relative overflow-hidden rounded-lg"
                  onClick={() => openImageViewer(index, false)}
                >
                  <img
                    src={image.image_url}
                    alt={image.caption || 'Gallery image'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                  {image.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-white text-xs truncate">{image.caption}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
            
            {images.length === 0 && (
              <div className="text-center py-16">
                <Image className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No photos in this album yet.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Modal */}
      <AnimatePresence>
        {selectedImageIndex !== null && (
          <Dialog open={true} onOpenChange={closeImageViewer}>
            <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0 bg-black">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative h-full"
              >
                {/* Navigation Buttons */}
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                  onClick={() => navigateImage('prev')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                  onClick={() => navigateImage('next')}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>

                {/* Close Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-4 right-4 z-10 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                  onClick={closeImageViewer}
                >
                  <X className="w-4 h-4" />
                </Button>

                {/* Image */}
                <div className="flex items-center justify-center h-[80vh] bg-black">
                  {selectedImageIndex !== null && (
                    <img
                      src={showPhotoWall ? filteredImages[selectedImageIndex]?.image_url : images[selectedImageIndex]?.image_url}
                      alt={showPhotoWall ? filteredImages[selectedImageIndex]?.caption || 'Gallery image' : images[selectedImageIndex]?.caption || 'Gallery image'}
                      className="max-w-full max-h-full object-contain"
                    />
                  )}
                </div>

                {/* Image Info */}
                <div className="p-6 bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      {selectedImageIndex !== null && (
                        <>
                          <p className="font-semibold text-gray-900">
                            Image {selectedImageIndex + 1} of {showPhotoWall ? filteredImages.length : images.length}
                          </p>
                          {((showPhotoWall ? filteredImages[selectedImageIndex]?.caption : images[selectedImageIndex]?.caption)) && (
                            <p className="text-sm text-gray-600 mt-1">
                              {showPhotoWall ? filteredImages[selectedImageIndex]?.caption : images[selectedImageIndex]?.caption}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {selectedImageIndex !== null && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => downloadImage(
                          showPhotoWall ? filteredImages[selectedImageIndex]?.image_url : images[selectedImageIndex]?.image_url,
                          showPhotoWall ? filteredImages[selectedImageIndex]?.file_name || 'image.jpg' : images[selectedImageIndex]?.file_name || 'image.jpg'
                        )}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  )
} 
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Camera, Image, Eye, Search, Download, Plus, Edit, Trash2, Upload } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Album {
  id: string
  title: string
  description: string | null
  event_date: string | null
  event_name: string | null
  image_count: number
  status: 'draft' | 'published'
  created_at: string
}

interface GalleryImage {
  id: string
  image_url: string
  caption: string | null
  file_name: string | null
  upload_order: number
}

export default function TeacherGallery() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [images, setImages] = useState<GalleryImage[]>([])
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null)
  const [loading, setLoading] = useState(true)
  const [showImages, setShowImages] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState<{
    title: string
    description: string
    event_name: string
    event_date: string
    status: 'draft' | 'published'
  }>({
    title: '',
    description: '',
    event_name: '',
    event_date: '',
    status: 'draft'
  })

  useEffect(() => {
    fetchAlbums()
  }, [])

  const fetchAlbums = async () => {
    try {
      const response = await fetch('/api/admin/gallery/albums')
      if (response.ok) {
        const data = await response.json()
        setAlbums(data.albums || [])
      }
    } catch (error) {
      console.error('Failed to fetch albums:', error)
      toast.error('Failed to load albums')
    } finally {
      setLoading(false)
    }
  }

  const fetchImages = async (albumId: string) => {
    try {
      const response = await fetch(`/api/admin/gallery/images?album_id=${albumId}`)
      if (response.ok) {
        const data = await response.json()
        setImages(data.images || [])
      }
    } catch (error) {
      console.error('Failed to fetch images:', error)
      toast.error('Failed to load images')
    }
  }

  const createAlbum = async () => {
    try {
      const response = await fetch('/api/admin/gallery/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        toast.success('Album created successfully')
        setShowCreateModal(false)
        setFormData({ title: '', description: '', event_name: '', event_date: '', status: 'draft' })
        fetchAlbums()
      } else {
        toast.error('Failed to create album')
      }
    } catch (error) {
      console.error('Failed to create album:', error)
      toast.error('Failed to create album')
    }
  }

  const updateAlbum = async () => {
    if (!editingAlbum) return
    
    try {
      const response = await fetch(`/api/admin/gallery/albums/${editingAlbum.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        toast.success('Album updated successfully')
        setShowEditModal(false)
        setEditingAlbum(null)
        setFormData({ title: '', description: '', event_name: '', event_date: '', status: 'draft' })
        fetchAlbums()
      } else {
        toast.error('Failed to update album')
      }
    } catch (error) {
      console.error('Failed to update album:', error)
      toast.error('Failed to update album')
    }
  }

  const deleteAlbum = async (albumId: string) => {
    if (!confirm('Are you sure you want to delete this album? This action cannot be undone.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/admin/gallery/albums/${albumId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast.success('Album deleted successfully')
        fetchAlbums()
      } else {
        toast.error('Failed to delete album')
      }
    } catch (error) {
      console.error('Failed to delete album:', error)
      toast.error('Failed to delete album')
    }
  }

  const openCreateModal = () => {
    setFormData({ title: '', description: '', event_name: '', event_date: '', status: 'draft' })
    setShowCreateModal(true)
  }

  const openEditModal = (album: Album) => {
    setEditingAlbum(album)
    setFormData({
      title: album.title,
      description: album.description || '',
      event_name: album.event_name || '',
      event_date: album.event_date || '',
      status: album.status
    })
    setShowEditModal(true)
  }

  const openAlbum = (album: Album) => {
    setSelectedAlbum(album)
    fetchImages(album.id)
    setShowImages(true)
  }

  const openImageViewer = (index: number) => {
    setSelectedImageIndex(index)
  }

  const closeImageViewer = () => {
    setSelectedImageIndex(null)
  }

  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImageIndex === null) return
    
    if (direction === 'prev') {
      setSelectedImageIndex(selectedImageIndex > 0 ? selectedImageIndex - 1 : images.length - 1)
    } else {
      setSelectedImageIndex(selectedImageIndex < images.length - 1 ? selectedImageIndex + 1 : 0)
    }
  }

  const getStatusBadge = (status: string) => {
    return status === 'published' ? (
      <Badge variant="default" className="bg-green-100 text-green-800">Published</Badge>
    ) : (
      <Badge variant="secondary">Draft</Badge>
    )
  }

  const filteredAlbums = albums.filter(album =>
    album.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    album.event_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    album.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gallery Management</h1>
          <p className="text-gray-600">Create and manage photo albums for school events</p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Album
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
          <Card key={album.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{album.title}</CardTitle>
                {getStatusBadge(album.status)}
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
                    {new Date(album.event_date).toLocaleDateString()}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Image className="w-4 h-4" />
                  {album.image_count} photos
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openAlbum(album)} className="flex-1">
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEditModal(album)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => deleteAlbum(album.id)} className="text-red-600 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAlbums.length === 0 && !loading && (
        <Card className="text-center py-12">
          <CardContent>
            <Camera className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No albums found' : 'No albums created yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms.'
                : 'Create your first photo album to get started.'
              }
            </p>
            {!searchTerm && (
              <Button onClick={openCreateModal}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Album
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Album Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Album</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Album Title *</label>
              <Input
                placeholder="Enter album title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Event Name</label>
              <Input
                placeholder="Event or occasion name"
                value={formData.event_name}
                onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Event Date</label>
              <Input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                placeholder="Album description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={formData.status} onValueChange={(value: 'draft' | 'published') => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={createAlbum}
                disabled={!formData.title.trim()}
                className="flex-1"
              >
                Create Album
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Album Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Album</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Album Title *</label>
              <Input
                placeholder="Enter album title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Event Name</label>
              <Input
                placeholder="Event or occasion name"
                value={formData.event_name}
                onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Event Date</label>
              <Input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                placeholder="Album description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={formData.status} onValueChange={(value: 'draft' | 'published') => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowEditModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={updateAlbum}
                disabled={!formData.title.trim()}
                className="flex-1"
              >
                Update Album
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Album Images Dialog */}
      <Dialog open={showImages} onOpenChange={setShowImages}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedAlbum?.title} ({images.length} photos)</span>
              <Button size="sm" variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Add Photos
              </Button>
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
              <div className="text-center py-12">
                <Image className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
                <p className="text-gray-600 mb-4">Upload photos to populate this album.</p>
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload First Photo
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Modal */}
      {selectedImageIndex !== null && images[selectedImageIndex] && (
        <Dialog open={true} onOpenChange={closeImageViewer}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Photo {selectedImageIndex + 1} of {images.length}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigateImage('prev')}>
                    Previous
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigateImage('next')}>
                    Next
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center max-h-[70vh]">
              <img
                src={images[selectedImageIndex].image_url}
                alt={images[selectedImageIndex].caption || 'Gallery image'}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            {images[selectedImageIndex].caption && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{images[selectedImageIndex].caption}</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
} 
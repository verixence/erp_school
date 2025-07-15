'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Calendar, Camera, Image, Plus, Eye, Edit, Trash2, Upload, X, File } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase-client'

interface Album {
  id: string
  title: string
  description: string | null
  event_date: string | null
  event_name: string | null
  is_published: boolean
  images_count: number
  created_at: string
  created_by_name: string
}

interface GalleryImage {
  id: string
  image_url: string
  caption: string | null
  file_name: string | null
  upload_order: number
  uploaded_by_name: string
}

export default function GalleryManagement() {
  const { user, isLoading: authLoading } = useAuth()
  const [albums, setAlbums] = useState<Album[]>([])
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null)
  const [showCreateAlbum, setShowCreateAlbum] = useState(false)
  const [showImages, setShowImages] = useState(false)
  const [showAddImages, setShowAddImages] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [newAlbum, setNewAlbum] = useState({
    title: '',
    description: '',
    event_date: '',
    event_name: '',
    is_published: false
  })

  const [newImages, setNewImages] = useState({
    image_urls: '',
    captions: ''
  })

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('file')

  useEffect(() => {
    if (user?.school_id) {
      fetchAlbums()
    }
  }, [user?.school_id])

  const fetchAlbums = async () => {
    if (!user?.school_id) return

    try {
      const response = await fetch(`/api/admin/gallery/albums?school_id=${user.school_id}`)
      if (response.ok) {
        const data = await response.json()
        setAlbums(data.data || [])
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to fetch albums')
      }
    } catch (error) {
      alert('Failed to fetch albums')
    } finally {
      setLoading(false)
    }
  }

  const fetchImages = async (albumId: string) => {
    if (!user?.school_id) return

    try {
      const response = await fetch(`/api/admin/gallery/images?album_id=${albumId}&school_id=${user.school_id}`)
      if (response.ok) {
        const data = await response.json()
        setImages(data.data || [])
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to fetch images')
      }
    } catch (error) {
      alert('Failed to fetch images')
    }
  }

  const createAlbum = async () => {
    if (!user?.school_id || !user?.id) {
      alert('Authentication required')
      return
    }

    try {
      const response = await fetch('/api/admin/gallery/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAlbum,
          school_id: user.school_id,
          created_by: user.id
        })
      })

      if (response.ok) {
        alert('Album created successfully')
        setShowCreateAlbum(false)
        setNewAlbum({
          title: '',
          description: '',
          event_date: '',
          event_name: '',
          is_published: false
        })
        fetchAlbums()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create album')
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create album')
    }
  }

  const addImages = async () => {
    if (!selectedAlbum || !user?.school_id || !user?.id) return

    try {
      if (uploadMethod === 'file' && selectedFiles.length > 0) {
        // Handle file uploads
        setUploadingFiles(true)
        
        const uploadPromises = selectedFiles.map(async (file, index) => {
          // Upload file to Supabase Storage
          const fileExt = file.name.split('.').pop()
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
          const filePath = `gallery/${user.school_id}/${selectedAlbum.id}/${fileName}`

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('media')
            .upload(filePath, file)

          if (uploadError) {
            console.error('Upload error:', uploadError)
            throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(filePath)

          // Create image record in database
          const response = await fetch('/api/admin/gallery/images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              album_id: selectedAlbum.id,
              school_id: user.school_id,
              image_url: publicUrl,
              caption: null, // Could add caption input for each file if needed
              file_name: file.name,
              file_size: file.size,
              uploaded_by: user.id
            })
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to save image record')
          }
          
          return response.json()
        })

        await Promise.all(uploadPromises)
        
        alert(`Successfully uploaded ${selectedFiles.length} images!`)
        setSelectedFiles([])
        
      } else if (uploadMethod === 'url' && newImages.image_urls.trim()) {
        // Handle URL uploads (existing functionality)
        const urls = newImages.image_urls.split('\n').filter(url => url.trim())
        const captions = newImages.captions.split('\n').filter(caption => caption.trim())

        const promises = urls.map(async (url, index) => {
          const response = await fetch('/api/admin/gallery/images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              album_id: selectedAlbum.id,
              school_id: user.school_id,
              image_url: url.trim(),
              caption: captions[index]?.trim() || null,
              uploaded_by: user.id
            })
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to add image')
          }
          return response.json()
        })

        await Promise.all(promises)
        alert('Images added successfully from URLs')
        setNewImages({ image_urls: '', captions: '' })
      } else {
        alert('Please select files to upload or enter image URLs')
        return
      }
      
      setShowAddImages(false)
      fetchImages(selectedAlbum.id)
      
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add images')
    } finally {
      setUploadingFiles(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Validate file types (images only)
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/')
      if (!isImage) {
        alert(`${file.name} is not a valid image file`)
        return false
      }
      
      // Check file size (max 10MB per file)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        alert(`${file.name} is too large. Maximum size is 10MB.`)
        return false
      }
      
      return true
    })
    
    setSelectedFiles(prev => [...prev, ...validFiles])
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/')
      if (!isImage) return false
      
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) return false
      
      return true
    })
    
    setSelectedFiles(prev => [...prev, ...validFiles])
  }

  const toggleAlbumStatus = async (album: Album) => {
    if (!user?.school_id) return

    try {
      const response = await fetch('/api/admin/gallery/albums', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: album.id,
          school_id: user.school_id,
          is_published: !album.is_published
        })
      })

      if (response.ok) {
        alert(`Album ${!album.is_published ? 'published' : 'unpublished'} successfully`)
        fetchAlbums()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update album status')
      }
    } catch (error) {
      alert('Failed to update album status')
    }
  }

  const deleteAlbum = async (albumId: string) => {
    if (!user?.school_id) return
    if (!confirm('Are you sure you want to delete this album? This will also delete all images.')) return

    try {
      const response = await fetch(`/api/admin/gallery/albums?id=${albumId}&school_id=${user.school_id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Album deleted successfully')
        fetchAlbums()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete album')
      }
    } catch (error) {
      alert('Failed to delete album')
    }
  }

  if (authLoading || (!user && !authLoading)) {
    return <div className="p-6">Loading...</div>
  }

  if (!user?.school_id) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            School access required. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return <div className="p-6">Loading albums...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">School Gallery</h1>
          <p className="text-gray-600">Manage photo albums and images for your school</p>
        </div>
        
        <Dialog open={showCreateAlbum} onOpenChange={setShowCreateAlbum}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Album
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Album</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Album Title</Label>
                <Input
                  id="title"
                  value={newAlbum.title}
                  onChange={(e) => setNewAlbum({...newAlbum, title: e.target.value})}
                  placeholder="Enter album title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newAlbum.description}
                  onChange={(e) => setNewAlbum({...newAlbum, description: e.target.value})}
                  placeholder="Album description"
                />
              </div>
              <div>
                <Label htmlFor="event_name">Event Name</Label>
                <Input
                  id="event_name"
                  value={newAlbum.event_name}
                  onChange={(e) => setNewAlbum({...newAlbum, event_name: e.target.value})}
                  placeholder="e.g., Annual Sports Day"
                />
              </div>
              <div>
                <Label htmlFor="event_date">Event Date</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={newAlbum.event_date}
                  onChange={(e) => setNewAlbum({...newAlbum, event_date: e.target.value})}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="published"
                  checked={newAlbum.is_published}
                  onCheckedChange={(checked) => setNewAlbum({...newAlbum, is_published: checked})}
                />
                <Label htmlFor="published">Publish immediately</Label>
              </div>
              <div className="flex gap-2">
                <Button onClick={createAlbum} className="flex-1">
                  Create Album
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateAlbum(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Albums must be published to be visible to parents and students in their portals.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {albums.map((album) => (
          <Card key={album.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{album.title}</CardTitle>
                <Badge variant={album.is_published ? 'default' : 'secondary'}>
                  {album.is_published ? 'Published' : 'Draft'}
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
                    {new Date(album.event_date).toLocaleDateString()}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Image className="w-4 h-4" />
                  {album.images_count} images
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedAlbum(album)
                    fetchImages(album.id)
                    setShowImages(true)
                  }}
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedAlbum(album)
                    setShowAddImages(true)
                  }}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Add Images
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAlbumStatus(album)}
                  className="flex-1"
                >
                  {album.is_published ? 'Unpublish' : 'Publish'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteAlbum(album.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {albums.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Camera className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No albums yet</h3>
            <p className="text-gray-600 mb-4">Create your first album to get started with the school gallery.</p>
            <Button onClick={() => setShowCreateAlbum(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Album
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Images Dialog */}
      <Dialog open={showImages} onOpenChange={setShowImages}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedAlbum?.title} - Images ({images.length})
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((image) => (
              <div key={image.id} className="space-y-2">
                <img
                  src={image.image_url}
                  alt={image.caption || 'Gallery image'}
                  className="w-full h-48 object-cover rounded-lg"
                />
                {image.caption && (
                  <p className="text-sm text-gray-600">{image.caption}</p>
                )}
                <p className="text-xs text-gray-500">Uploaded by {image.uploaded_by_name}</p>
              </div>
            ))}
          </div>
          {images.length === 0 && (
            <div className="text-center py-8">
              <Image className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No images in this album yet.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhanced Add Images Dialog */}
      <Dialog open={showAddImages} onOpenChange={setShowAddImages}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Images to {selectedAlbum?.title}</DialogTitle>
          </DialogHeader>
          
          <Tabs value={uploadMethod} onValueChange={(value) => setUploadMethod(value as 'url' | 'file')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file">Upload Files</TabsTrigger>
              <TabsTrigger value="url">Add URLs</TabsTrigger>
            </TabsList>
            
            <TabsContent value="file" className="space-y-4">
              <div>
                <Label>Upload Image Files</Label>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <div className="space-y-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Select Images
                    </Button>
                    <p className="text-sm text-gray-600">
                      Or drag and drop image files here
                    </p>
                    <p className="text-xs text-gray-500">
                      Supports: JPG, PNG, GIF, WebP (Max 10MB per file)
                    </p>
                  </div>
                </div>

                {/* Selected Files Preview */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-3">
                    <Label>Selected Files ({selectedFiles.length})</Label>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                          <div className="flex items-center gap-3">
                            <Image className="w-5 h-5 text-blue-500" />
                            <div>
                              <p className="text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="url" className="space-y-4">
              <div>
                <Label htmlFor="image_urls">Image URLs (one per line)</Label>
                <Textarea
                  id="image_urls"
                  value={newImages.image_urls}
                  onChange={(e) => setNewImages({...newImages, image_urls: e.target.value})}
                  placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                  rows={6}
                />
              </div>
              <div>
                <Label htmlFor="captions">Captions (one per line, optional)</Label>
                <Textarea
                  id="captions"
                  value={newImages.captions}
                  onChange={(e) => setNewImages({...newImages, captions: e.target.value})}
                  placeholder="Caption for image 1&#10;Caption for image 2"
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowAddImages(false)}>
              Cancel
            </Button>
            <Button 
              onClick={addImages} 
              disabled={uploadingFiles || (uploadMethod === 'file' && selectedFiles.length === 0) || (uploadMethod === 'url' && !newImages.image_urls.trim())}
            >
              {uploadingFiles ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Images
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 
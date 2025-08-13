import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  ArrowLeft,
  Search,
  Trash2,
  Eye,
  Grid,
  List,
  AlertTriangle,
  FileImage,
  Folder,
  Calendar,
  HardDrive,
  RefreshCw,
  X,
  Star
} from "lucide-react";
import { toast } from "sonner";
import { galleryService } from "../services/galleryService";
import type { Gallery, Photo } from "../services/galleryService";

interface PhotoManagerProps {
  galleryId: string;
  onClose: () => void;
}

export function PhotoManager({ galleryId, onClose }: PhotoManagerProps) {
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedSubfolder, setSelectedSubfolder] = useState<string | undefined>();
  const [subfolders, setSubfolders] = useState<string[]>([]);

  useEffect(() => {
    loadGalleryData();
  }, [galleryId, selectedSubfolder]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    // Filter photos based on search term
    if (!searchTerm.trim()) {
      setFilteredPhotos(photos);
    } else {
      const filtered = photos.filter(photo =>
        photo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        photo.originalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        photo.subfolder?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPhotos(filtered);
    }
  }, [photos, searchTerm]);

  const loadGalleryData = async () => {
    try {
      setIsLoading(true);
      
      // Load gallery info
      const galleryData = await galleryService.getGallery(galleryId);
      if (!galleryData) {
        toast.error('Gallery not found');
        onClose();
        return;
      }
      setGallery(galleryData);

      // Load photos (filtered by subfolder if selected)
      const photoList = await galleryService.getPhotos(galleryId, selectedSubfolder);
      setPhotos(photoList);
      
      // Load subfolders for filtering
      const subfolderList = await galleryService.getGallerySubfolders(galleryId);
      setSubfolders(subfolderList.map(sf => sf.name));

      console.log(`✅ Loaded ${photoList.length} photos for gallery ${galleryData.name}`);
      
    } catch (error) {
      console.error('Error loading gallery data:', error);
      toast.error('Failed to load gallery data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPhoto = (photoId: string, selected: boolean) => {
    const newSelection = new Set(selectedPhotos);
    if (selected) {
      newSelection.add(photoId);
    } else {
      newSelection.delete(photoId);
    }
    setSelectedPhotos(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedPhotos.size === filteredPhotos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(filteredPhotos.map(p => p.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedPhotos.size === 0) return;

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedPhotos.size} selected photo(s)?\n\nThis will permanently remove:\n• All photo files from Supabase storage\n• All metadata from the database\n• Any related favorites and comments\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);
      const photosToDelete = photos.filter(p => selectedPhotos.has(p.id));
      
      let successCount = 0;
      let errorCount = 0;

      for (const photo of photosToDelete) {
        try {
          const success = await galleryService.deletePhoto(galleryId, photo.id);
          if (success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`Failed to delete photo ${photo.name}:`, error);
          errorCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(`Successfully deleted ${successCount} photo(s)`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to delete ${errorCount} photo(s)`);
      }

      // Reload photos and clear selection
      setSelectedPhotos(new Set());
      await loadGalleryData();
      
    } catch (error) {
      console.error('Error during bulk delete:', error);
      toast.error('Failed to delete photos');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = async (photo: Photo) => {
    const confirmed = confirm(
      `Are you sure you want to delete "${photo.originalName || photo.name}"?\n\nThis will permanently remove:\n• The photo file from storage\n• All metadata from the database\n• Any related favorites and comments\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const success = await galleryService.deletePhoto(galleryId, photo.id);
      if (success) {
        toast.success('Photo and file deleted successfully from storage');
        await loadGalleryData();
      } else {
        toast.error('Failed to delete photo or file');
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo or file');
    }
  };

  const handleSetFeaturedPhoto = async (photo: Photo) => {
    try {
      const success = await galleryService.setFeaturedPhoto(galleryId, photo.id);
      if (success) {
        toast.success(`"${photo.originalName || photo.name}" set as featured photo`);
        await loadGalleryData();
      } else {
        toast.error('Failed to set featured photo');
      }
    } catch (error) {
      console.error('Error setting featured photo:', error);
      toast.error('Failed to set featured photo');
    }
  };

  const handleRemoveFeaturedPhoto = async () => {
    try {
      const success = await galleryService.removeFeaturedPhoto(galleryId);
      if (success) {
        toast.success('Featured photo removed');
        await loadGalleryData();
      } else {
        toast.error('Failed to remove featured photo');
      }
    } catch (error) {
      console.error('Error removing featured photo:', error);
      toast.error('Failed to remove featured photo');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getPhotoDisplayName = (photo: Photo) => {
    return photo.originalName || photo.name;
  };

  const isFeaturedPhoto = (photo: Photo) => {
    return gallery?.featuredPhotoId === photo.id;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading photos...</p>
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Gallery Not Found</h1>
          <Button onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        // Close when clicking outside the modal
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-background rounded-lg shadow-2xl border w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b bg-card/50 px-6 py-4 shrink-0">
          <div className="flex flex-col space-y-4">
            {/* Top row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold flex items-center gap-2">
                    <FileImage className="h-5 w-5 text-primary" />
                    <span className="truncate">Manage Photos</span>
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="truncate max-w-[200px]">{gallery.name}</span>
                    <span>•</span>
                    <span>{filteredPhotos.length} photos</span>
                    {selectedSubfolder && (
                      <>
                        <span>•</span>
                        <Badge variant="outline">
                          <Folder className="h-3 w-3 mr-1" />
                          {selectedSubfolder}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                >
                  {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadGalleryData}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Featured Photo Status */}
            {gallery?.featuredPhotoUrl && (
              <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-orange-300 shrink-0">
                  <img
                    src={gallery.featuredPhotoUrl}
                    alt="Featured photo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-orange-600 fill-current" />
                    <span className="text-sm font-medium text-orange-800">Featured Photo Set</span>
                  </div>
                  <p className="text-xs text-orange-600 truncate">This photo will be shown in the admin gallery list</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRemoveFeaturedPhoto}
                  className="shrink-0 border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Filters and search */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search photos by name or subfolder..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Subfolder filter */}
              {subfolders.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSubfolder(undefined)}
                    className={`${!selectedSubfolder ? 'bg-primary text-primary-foreground' : ''} shrink-0`}
                  >
                    All Folders
                  </Button>
                  {subfolders.map((subfolder) => (
                    <Button
                      key={subfolder}
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSubfolder(subfolder)}
                      className={`${selectedSubfolder === subfolder ? 'bg-primary text-primary-foreground' : ''} shrink-0`}
                    >
                      <Folder className="h-4 w-4 mr-1" />
                      <span className="max-w-[100px] truncate">{subfolder}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Bulk actions */}
            {filteredPhotos.length > 0 && (
              <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPhotos.size === filteredPhotos.length && filteredPhotos.length > 0}
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">
                      Select All ({selectedPhotos.size}/{filteredPhotos.length})
                    </span>
                  </label>
                </div>
                
                {selectedPhotos.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelected}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedPhotos.size})
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
        {filteredPhotos.length === 0 ? (
          <div className="text-center py-16">
            {searchTerm ? (
              <>
                <p className="text-xl text-muted-foreground mb-4">
                  No photos match your search criteria
                </p>
                <Button variant="outline" onClick={() => setSearchTerm('')}>
                  Clear search
                </Button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileImage className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-semibold mb-4">No Photos Found</h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  This gallery doesn't contain any photos yet. Upload some photos from the admin panel to get started.
                </p>
              </>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredPhotos.map((photo) => (
              <div key={photo.id} className="group relative bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-all">
                {/* Selection checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedPhotos.has(photo.id)}
                    onChange={(e) => handleSelectPhoto(photo.id, e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                </div>

                {/* Featured badge */}
                {isFeaturedPhoto(photo) && (
                  <div className="absolute top-2 right-2 z-10">
                    <Badge className="bg-orange-600 text-white text-xs px-2 py-1">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Featured
                    </Badge>
                  </div>
                )}

                {/* Photo */}
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={photo.url}
                    alt={getPhotoDisplayName(photo)}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.open(photo.url, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSetFeaturedPhoto(photo)}
                      className={isFeaturedPhoto(photo) ? 'bg-orange-600 text-white' : ''}
                      title={isFeaturedPhoto(photo) ? 'Featured photo' : 'Set as featured'}
                    >
                      <Star className={`h-4 w-4 ${isFeaturedPhoto(photo) ? 'fill-current' : ''}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteSingle(photo)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm font-medium truncate" title={getPhotoDisplayName(photo)}>
                    {getPhotoDisplayName(photo)}
                  </p>
                  <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                    <span>{formatFileSize(photo.size || 0)}</span>
                    {photo.subfolder && (
                      <Badge variant="outline" className="text-xs">
                        {photo.subfolder}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {filteredPhotos.map((photo) => (
              <div key={photo.id} className="flex items-center gap-4 p-4 bg-card border rounded-lg hover:shadow-sm transition-shadow">
                <input
                  type="checkbox"
                  checked={selectedPhotos.has(photo.id)}
                  onChange={(e) => handleSelectPhoto(photo.id, e.target.checked)}
                  className="w-4 h-4 rounded shrink-0"
                />
                
                <div className="w-16 h-16 rounded overflow-hidden shrink-0">
                  <img
                    src={photo.url}
                    alt={getPhotoDisplayName(photo)}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{getPhotoDisplayName(photo)}</p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      {formatFileSize(photo.size || 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(photo.createdAt).toLocaleDateString()}
                    </span>
                    {photo.subfolder && (
                      <Badge variant="outline" className="text-xs">
                        <Folder className="h-3 w-3 mr-1" />
                        {photo.subfolder}
                      </Badge>
                    )}
                    {isFeaturedPhoto(photo) && (
                      <Badge className="bg-orange-600 text-white text-xs">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Featured
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(photo.url, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetFeaturedPhoto(photo)}
                    className={isFeaturedPhoto(photo) ? 'bg-orange-100 border-orange-300 text-orange-700' : ''}
                    title={isFeaturedPhoto(photo) ? 'Featured photo' : 'Set as featured'}
                  >
                    <Star className={`h-4 w-4 ${isFeaturedPhoto(photo) ? 'fill-current text-orange-600' : ''}`} />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteSingle(photo)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { AuthDialog } from "./AuthDialog";
import { Lightbox } from "./Lightbox";
import { SelectionSubmitButton } from "./SelectionSubmitButton";
import { UserNameDialog } from "./UserNameDialog";
import { 
  ArrowLeft, 
  Heart, 
  MessageSquare, 
  Search,
  Send,
  Filter,
  Folder,
  FolderOpen,
  Grid,
  Grid3X3,
  Tag,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { galleryService, SubfolderInfo } from "../services/galleryService";
import { favoritesService } from "../services/favoritesService";
import { userService } from "../services/userService";
import type { Gallery, Photo } from "../services/galleryService";
import type { FavoritePhoto, Comment } from "../services/favoritesService";

interface PhotoGalleryProps {
  galleryId: string;
}

export function PhotoGallery({ galleryId }: PhotoGalleryProps) {
  // Gallery state
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  
  // Subfolders and filtering
  const [subfolders, setSubfolders] = useState<SubfolderInfo[]>([]);
  const [selectedSubfolder, setSelectedSubfolder] = useState<string | undefined>(undefined);
  const [showSubfolderFilter, setShowSubfolderFilter] = useState(false);
  
  // Selection (shared across all devices) and comments
  const [selection, setSelection] = useState<Set<string>>(new Set()); // ALL shared favorites
  const [userSelection, setUserSelection] = useState<Set<string>>(new Set()); // Current user's favorites only
  const [favoritesList, setFavoritesList] = useState<FavoritePhoto[]>([]); // Favorite details
  const [comments, setComments] = useState<Comment[]>([]);
  const [photoCommentCounts, setPhotoCommentCounts] = useState<Record<string, number>>({});
  
  // Search
  const [searchTerm, setSearchTerm] = useState('');
  
  // Photo names display
  const [showPhotoNames, setShowPhotoNames] = useState(false);
  
  // View mode (masonry or grid) with persistence - default to grid
  const [viewMode, setViewMode] = useState<'masonry' | 'grid'>(() => {
    const saved = localStorage.getItem('gallery-view-mode');
    return (saved as 'masonry' | 'grid') || 'grid';
  });
  
  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  // User name dialog state
  const [showUserNameDialog, setShowUserNameDialog] = useState(false);
  const [pendingFavoriteAction, setPendingFavoriteAction] = useState<{photoId: string, action: 'add'} | null>(null);
  
  // Mobile subfolder dropdown state
  const [showSubfolderDropdown, setShowSubfolderDropdown] = useState(false);
  
  // Mobile search state
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  
  // Desktop search state
  const [showDesktopSearch, setShowDesktopSearch] = useState(false);

  // Handle view mode change
  const handleViewModeChange = (mode: 'masonry' | 'grid') => {
    setViewMode(mode);
    localStorage.setItem('gallery-view-mode', mode);
  };

  // Style for grid items
  const getGridItemStyle = (photo: Photo) => {
    // Both modes let images size themselves naturally
    return {};
  };

  // Group photos by subfolder for display
  const groupPhotosBySubfolder = (photos: Photo[]) => {
    const groups: Record<string, Photo[]> = {};
    
    photos.forEach(photo => {
      const folder = photo.subfolder || 'Photos principales';
      if (!groups[folder]) {
        groups[folder] = [];
      }
      groups[folder].push(photo);
    });
    
    return groups;
  };

  // Load gallery data
  useEffect(() => {
    loadGalleryData();
  }, [galleryId, selectedSubfolder]); // Reload when subfolder filter changes

  const loadGalleryData = async () => {
    try {
      setIsLoading(true);
      
      console.log(`🔍 Loading gallery data for: ${galleryId}${selectedSubfolder ? `, subfolder: ${selectedSubfolder}` : ''}`);
      
      // Load gallery info
      let galleryData = await galleryService.getGallery(galleryId);
      
      // If gallery not found and Supabase is configured, try to sync
      if (!galleryData && galleryService.isSupabaseConfigured()) {
        console.log('📡 Gallery not found locally, trying to sync from Supabase...');
        toast.loading('Synchronisation des galeries depuis le cloud...', { id: 'sync-toast' });
        
        try {
          const syncResult = await galleryService.syncFromSupabase();
          if (syncResult.success) {
            console.log(`✅ Sync successful, found ${syncResult.count} galleries`);
            toast.success(`${syncResult.count} galeries synchronisées`, { id: 'sync-toast' });
            
            // Try to load gallery again after sync
            galleryData = await galleryService.getGallery(galleryId);
          } else {
            console.warn(`⚠️ Sync failed: ${syncResult.error}`);
            toast.error(`Échec de la synchronisation: ${syncResult.error}`, { id: 'sync-toast' });
          }
        } catch (syncError) {
          console.error('❌ Sync error:', syncError);
          toast.error('Erreur lors de la synchronisation', { id: 'sync-toast' });
        }
      }
      
      if (!galleryData) {
        console.error(`❌ Gallery ${galleryId} not found after all attempts`);
        toast.error(`Galerie "${galleryId}" non trouvée`);
        return;
      }

      console.log(`✅ Gallery loaded: ${galleryData.name}`);
      console.log('🔍 Gallery data:', {
        id: galleryData.id,
        name: galleryData.name,
        hasPassword: !!galleryData.password,
        password: galleryData.password ? '[MASKED]' : 'null',
        isAuthenticated: galleryService.isGalleryAuthenticated(galleryId)
      });

      // Check if authentication is needed
      if (galleryData.password && !galleryService.isGalleryAuthenticated(galleryId)) {
        console.log('🔐 Gallery requires authentication');
        setNeedsAuth(true);
        return;
      }

      setGallery(galleryData);

      // Load subfolders
      console.log('📁 Loading subfolders...');
      const subfolderList = await galleryService.getGallerySubfolders(galleryId);
      setSubfolders(subfolderList);
      console.log(`✅ Loaded ${subfolderList.length} subfolders`);

      // Show subfolder filter if there are subfolders
      if (subfolderList.length > 0 && !showSubfolderFilter) {
        setShowSubfolderFilter(true);
      }

      // Load photos (filtered by subfolder if selected)
      console.log('📸 Loading photos...');
      const photoList = await galleryService.getPhotos(galleryId, selectedSubfolder);
      console.log(`✅ Loaded ${photoList.length} photos`);
      setPhotos(photoList);

      // Load shared selection (favorites from all devices)
      console.log('❤️ Loading shared selection...');
      const favoritesList = await favoritesService.getFavorites(galleryId);
      const selectedIds = new Set(favoritesList.map(f => f.photoId));
      console.log(`✅ Loaded ${favoritesList.length} shared favorites`);
      
      setSelection(selectedIds);
      setFavoritesList(favoritesList);
      
      // Filter current user's favorites
      const currentUser = userService.getCurrentSession();
      if (currentUser) {
        const userFavorites = favoritesList.filter(f => f.userId === currentUser.userId);
        const userSelectedIds = new Set(userFavorites.map(f => f.photoId));
        setUserSelection(userSelectedIds);
        console.log(`👤 User has ${userFavorites.length} favorites`);
      } else {
        setUserSelection(new Set());
      }

      // Load comments
      console.log('💬 Loading comments...');
      const commentsList = await favoritesService.getComments(galleryId);
      setComments(commentsList);
      console.log(`✅ Loaded ${commentsList.length} comments`);
      
      // Count comments per photo
      const commentCounts: Record<string, number> = {};
      commentsList.forEach(comment => {
        commentCounts[comment.photoId] = (commentCounts[comment.photoId] || 0) + 1;
      });
      setPhotoCommentCounts(commentCounts);

      console.log('🎉 Gallery data loading complete');

    } catch (error) {
      console.error('❌ Error loading gallery:', error);
      toast.error('Erreur lors du chargement de la galerie');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthentication = async (password: string): Promise<boolean> => {
    try {
      const isValid = await galleryService.authenticateGallery(galleryId, password);
      if (isValid) {
        setNeedsAuth(false);
        loadGalleryData();
      }
      return isValid;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  };

  const toggleSelection = async (photoId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    try {
      // Check if current USER has selected this photo
      const isUserSelected = userSelection.has(photoId);
      
      if (isUserSelected) {
        // User can only remove their own favorites
        await favoritesService.removeFromFavorites(galleryId, photoId);
        
        // Reload all data to get fresh state (like in FavoritesPage)
        await loadGalleryData();
        
        toast.success('Retiré de votre sélection');
      } else {
        // Check if user has a session, if not show dialog
        if (!userService.isUserLoggedIn()) {
          setPendingFavoriteAction({ photoId, action: 'add' });
          setShowUserNameDialog(true);
          return;
        }

        console.log('🔄 Before adding favorite - favoritesList length:', favoritesList.length);
        await favoritesService.addToFavorites(galleryId, photoId);
        
        console.log('🔄 After adding favorite, before reload - favoritesList length:', favoritesList.length);
        // Reload all data to get fresh state (like in FavoritesPage)
        await loadGalleryData();
        
        console.log('🔄 After reload - favoritesList length:', favoritesList.length);
        toast.success(`Ajouté à votre sélection`);
      }
      
    } catch (error) {
      console.error('Error updating selection:', error);
      toast.error('Échec de la mise à jour de la sélection');
    }
  };

  // User name dialog handlers
  const handleUserNameConfirm = async (userName: string) => {
    try {
      // Create user session
      const deviceId = await favoritesService.getDeviceId();
      userService.createSession(userName, deviceId);
      
      // Process pending favorite action
      if (pendingFavoriteAction) {
        const { photoId } = pendingFavoriteAction;
        
        const newFavorite = await favoritesService.addToFavorites(galleryId, photoId);
        setUserSelection(prev => new Set([...prev, photoId]));
        setSelection(prev => new Set([...prev, photoId]));
        setFavoritesList(prev => [...prev, newFavorite]);
        
        toast.success(`Ajouté à votre sélection`);
        
        // Clear pending action
        setPendingFavoriteAction(null);
      }
      
      setShowUserNameDialog(false);
    } catch (error) {
      console.error('Error creating user session:', error);
      toast.error('Erreur lors de la création du profil utilisateur');
    }
  };

  const handleUserNameCancel = () => {
    setPendingFavoriteAction(null);
    setShowUserNameDialog(false);
    toast.info('Ajout aux favoris annulé');
  };

  const submitComment = async (photoId: string, comment: string) => {
    if (!comment.trim()) return;

    try {
      // Check if user has a session for comments too
      if (!userService.isUserLoggedIn()) {
        toast.error('Veuillez d\'abord ajouter un favori pour vous identifier');
        return;
      }

      const newComment = await favoritesService.addComment(galleryId, photoId, comment.trim());
      
      // Update comments list
      setComments(prev => [...prev, newComment]);
      
      // Update comment counts
      setPhotoCommentCounts(prev => ({
        ...prev,
        [photoId]: (prev[photoId] || 0) + 1
      }));
      
      toast.success('Commentaire ajouté');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Échec de l\'ajout du commentaire');
    }
  };

  const openLightbox = (photoIndex: number) => {
    setLightboxIndex(photoIndex);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const navigateLightbox = useCallback((direction: 'prev' | 'next') => {
    if (lightboxIndex === null) return;
    
    const newIndex = direction === 'prev' 
      ? Math.max(0, lightboxIndex - 1)
      : Math.min(filteredPhotos.length - 1, lightboxIndex + 1);
    
    setLightboxIndex(newIndex);
  }, [lightboxIndex]);

  // Filter photos based on search
  const filteredPhotos = photos.filter(photo =>
    photo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    photo.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    photo.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get display name for photo (prioritize original name)
  const getPhotoDisplayName = (photo: Photo) => {
    return photo.originalName || photo.name;
  };

  // Handle subfolder filter change
  const handleSubfolderFilterChange = (subfolder: string | undefined) => {
    setSelectedSubfolder(subfolder);
    setSearchTerm(''); // Clear search when changing subfolder
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSubfolderDropdown || showMobileSearch || showDesktopSearch) {
        const target = event.target as Element;
        if (!target.closest('.relative')) {
          setShowSubfolderDropdown(false);
          // Close desktop search only if no search term
          if (showDesktopSearch && !searchTerm) {
            setShowDesktopSearch(false);
          }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSubfolderDropdown, showMobileSearch, showDesktopSearch, searchTerm]);

  // Auth dialog
  if (needsAuth) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">Galerie Protégée</h1>
            <p className="text-muted-foreground mb-6">
              Cette galerie est protégée par mot de passe. Veuillez saisir le mot de passe pour voir les photos.
            </p>
          </div>
        </div>
        
        <AuthDialog
          isOpen={needsAuth}
          onClose={() => window.appRouter.navigateTo('/')}
          onAuthenticate={handleAuthentication}
          type="gallery"
          galleryName={gallery?.name}
        />
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement de la galerie...</p>
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-semibold mb-4">Galerie Non Trouvée</h1>
          <p className="text-muted-foreground mb-6">
            La galerie "{galleryId}" n'existe pas ou n'est plus disponible.
          </p>
          
          {galleryService.isSupabaseConfigured() && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-blue-900 mb-2">Synchronisation Cloud</h3>
              <p className="text-sm text-blue-700 mb-3">
                La galerie pourrait exister dans le cloud mais n'a pas encore été synchronisée sur cet appareil.
              </p>
              <Button 
                onClick={() => {
                  loadGalleryData();
                }}
                size="sm"
                className="w-full"
              >
                🔄 Essayer de synchroniser
              </Button>
            </div>
          )}
          
          <div className="space-y-3">
            <Button 
              onClick={() => window.appRouter.navigateTo('/')}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </Button>
            
            {!galleryService.isSupabaseConfigured() && (
              <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                💡 Astuce : Pour accéder aux galeries sur plusieurs appareils, configurez Supabase dans le panneau d'administration.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Desktop Layout */}
      <div className="border-b backdrop-blur-sm sticky top-0 z-40 hidden md:block" style={{backgroundColor: '#f8f9fa'}}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            {/* Left: Back button and title */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.appRouter.navigateTo('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Accueil
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{gallery.name}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{filteredPhotos.length} photos</span>
                  {selectedSubfolder && (
                    <>
                      <span>•</span>
                      <Badge variant="outline" className="text-xs">
                        <Folder className="h-3 w-3 mr-1" />
                        {selectedSubfolder}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.appRouter.navigateTo(`/favorites/${galleryId}`)}
                className="flex items-center"
              >
                <Heart className="h-4 w-4 mr-2" />
                Ma sélection ({selection.size})
              </Button>
              
              <SelectionSubmitButton 
                galleryId={galleryId}
                galleryName={gallery.name}
                variant="default"
                size="sm"
              />
            </div>
          </div>

          {/* Compact controls row */}
          <div className="flex items-center gap-3">
            {/* Search toggle/field */}
            {!showDesktopSearch ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDesktopSearch(true)}
                title="Rechercher des photos"
              >
                <Search className="h-4 w-4" />
              </Button>
            ) : (
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                  autoFocus
                  onBlur={() => {
                    if (!searchTerm) {
                      setShowDesktopSearch(false);
                    }
                  }}
                />
              </div>
            )}

            {/* View mode selector */}
            <div className="flex items-center border rounded-md p-1">
              <Button
                variant={viewMode === 'masonry' ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewModeChange('masonry')}
                className="px-2 py-1 h-auto"
                title="Vue mosaïque"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 1H17C18.1046 1 19 1.89543 19 3V6M10 1H3C1.89543 1 1 1.89543 1 3V14M10 1V6M10 19H3C1.89543 19 1 18.1046 1 17V14M10 19H17C18.1046 19 19 18.1046 19 17V6M10 19V14M1 14H10M10 14V6M10 6H19" 
                    stroke="currentColor" 
                    strokeWidth="2"/>
                </svg>
              </Button>
              <Button
                variant={viewMode === 'grid' ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewModeChange('grid')}
                className="px-2 py-1 h-auto"
                title="Vue grille classique"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>

            {/* Show photo names toggle */}
            <Button
              variant={showPhotoNames ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPhotoNames(!showPhotoNames)}
              title="Afficher les noms des photos"
            >
              <Tag className="h-4 w-4 mr-2" />
              Noms
            </Button>

            {/* Subfolder filter (desktop) - inline */}
            {showSubfolderFilter && subfolders.length > 0 && (
              <>
                <div className="h-6 w-px bg-border"></div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSubfolder(undefined)}
                    className={`shrink-0 ${!selectedSubfolder ? 'bg-primary text-primary-foreground' : ''}`}
                  >
                    <Grid className="h-4 w-4 mr-1" />
                    Toutes
                  </Button>
                  
                  {subfolders.map((subfolder) => (
                    <Button
                      key={subfolder.name}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSubfolderFilterChange(subfolder.name)}
                      className={`shrink-0 ${selectedSubfolder === subfolder.name ? 'bg-primary text-primary-foreground' : ''}`}
                    >
                      <Folder className="h-4 w-4 mr-1" />
                      <span className="max-w-[120px] truncate">{subfolder.name}</span>
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {subfolder.photoCount}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Expanded search row when search is active and there are many subfolders */}
          {showDesktopSearch && searchTerm && showSubfolderFilter && subfolders.length > 4 && (
            <div className="mt-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher des photos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Header - Mobile Layout */}
      <div className="border-b backdrop-blur-sm sticky top-0 z-40 md:hidden" style={{backgroundColor: '#f8f9fa'}}>
        <div className="container mx-auto px-4 py-3">
          {/* Top row: Back button and title */}
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.appRouter.navigateTo('/')}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold truncate">{gallery.name}</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{filteredPhotos.length} photos</span>
                {selectedSubfolder && (
                  <>
                    <span>•</span>
                    <Badge variant="outline" className="text-xs">
                      <Folder className="h-3 w-3 mr-1" />
                      {selectedSubfolder}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Compact controls row */}
          <div className="flex items-center gap-2">
            {/* Search toggle button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="shrink-0"
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Selection button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.appRouter.navigateTo(`/favorites/${galleryId}`)}
              className="shrink-0"
            >
              <Heart className="h-4 w-4 mr-1" />
              {selection.size}
            </Button>

            {/* View toggles */}
            <div className="flex items-center border rounded-md p-1 shrink-0">
              <Button
                variant={viewMode === 'masonry' ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewModeChange('masonry')}
                className="px-1.5 py-1 h-auto"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 1H17C18.1046 1 19 1.89543 19 3V6M10 1H3C1.89543 1 1 1.89543 1 3V14M10 1V6M10 19H3C1.89543 19 1 18.1046 1 17V14M10 19H17C18.1046 19 19 18.1046 19 17V6M10 19V14M1 14H10M10 14V6M10 6H19" 
                    stroke="currentColor" 
                    strokeWidth="2"/>
                </svg>
              </Button>
              <Button
                variant={viewMode === 'grid' ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewModeChange('grid')}
                className="px-1.5 py-1 h-auto"
              >
                <Grid3X3 className="h-3 w-3" />
              </Button>
            </div>

            {/* Names toggle */}
            <Button
              variant={showPhotoNames ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPhotoNames(!showPhotoNames)}
              className="shrink-0"
            >
              <Tag className="h-4 w-4" />
            </Button>

            {/* Submit button */}
            <SelectionSubmitButton 
              galleryId={galleryId}
              galleryName={gallery.name}
              variant="default"
              size="sm"
              className="shrink-0"
              children="Soumettre"
            />
          </div>

          {/* Collapsible search */}
          {showMobileSearch && (
            <div className="mt-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher des photos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Subfolder filter (mobile) */}
          {showSubfolderFilter && subfolders.length > 0 && (
            <div className="mt-3 relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSubfolderDropdown(!showSubfolderDropdown)}
                className="w-full justify-between"
              >
                <div className="flex items-center">
                  <Folder className="h-4 w-4 mr-2" />
                  <span className="truncate">
                    {selectedSubfolder || 'Toutes les photos'}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${showSubfolderDropdown ? 'rotate-180' : ''}`} />
              </Button>
              
              {showSubfolderDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedSubfolder(undefined);
                      setShowSubfolderDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center ${!selectedSubfolder ? 'bg-primary/10 text-primary' : ''}`}
                  >
                    <Grid className="h-4 w-4 mr-2" />
                    Toutes les photos
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {filteredPhotos.length}
                    </Badge>
                  </button>
                  {subfolders.map((subfolder) => (
                    <button
                      key={subfolder.name}
                      onClick={() => {
                        handleSubfolderFilterChange(subfolder.name);
                        setShowSubfolderDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center ${selectedSubfolder === subfolder.name ? 'bg-primary/10 text-primary' : ''}`}
                    >
                      <Folder className="h-4 w-4 mr-2" />
                      <span className="truncate">{subfolder.name}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {subfolder.photoCount}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Photo Grid */}
      <div className="container mx-auto px-4 py-8">
        {filteredPhotos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground mb-4">
              {searchTerm ? 'Aucune photo ne correspond à votre recherche.' : 
               selectedSubfolder ? `Aucune photo dans le sous-dossier "${selectedSubfolder}".` :
               'Aucune photo dans cette galerie pour le moment.'}
            </p>
            {(searchTerm || selectedSubfolder) && (
              <div className="space-x-2">
                {searchTerm && (
                  <Button variant="outline" onClick={() => setSearchTerm('')}>
                    Effacer la recherche
                  </Button>
                )}
                {selectedSubfolder && (
                  <Button variant="outline" onClick={() => setSelectedSubfolder(undefined)}>
                    Voir toutes les photos
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : !selectedSubfolder ? (
          // Grouped view when showing all photos
          <>
            {(() => {
              const photoGroups = groupPhotosBySubfolder(filteredPhotos);
              const sortedSections = Object.keys(photoGroups).sort();
              
              return sortedSections.map((sectionName) => (
                <div key={sectionName} className="mb-8">
                  {/* Section Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">{sectionName}</h2>
                    <Badge variant="secondary" className="text-sm">
                      {photoGroups[sectionName].length} photos
                    </Badge>
                  </div>

                  {/* Section Photos */}
                  <div className={viewMode === 'masonry' ? 'masonry-grid' : 'classic-grid'}>
                    {photoGroups[sectionName].map((photo) => {
                      const originalIndex = filteredPhotos.findIndex(p => p.id === photo.id);
                      return (
                        <div 
                          key={photo.id} 
                          className={viewMode === 'masonry' ? 'masonry-item animate-fadeIn' : 'classic-grid-item animate-fadeIn'}
                          style={getGridItemStyle(photo)}
                        >
                          {/* Photo */}
                          <div className={viewMode === 'masonry' ? 'photo-container' : ''} onClick={() => openLightbox(originalIndex)}>
                            <img
                              src={photo.url}
                              alt={getPhotoDisplayName(photo)}
                              loading="lazy"
                              className={viewMode === 'masonry' ? 'photo-image' : 'classic-grid-image'}
                            />

                            {/* Photo name overlay */}
                            <div className={`photo-name-overlay ${showPhotoNames ? 'show-always' : ''}`}>
                              {getPhotoDisplayName(photo)}
                            </div>

                            {/* Selection indicator */}
                            {userService.isUserLoggedIn() ? (
                              <div className={`favorite-indicator ${userSelection.has(photo.id) ? 'is-favorite' : ''}`}>
                                <button
                                  className="w-full h-full flex items-center justify-center"
                                  onClick={(e) => toggleSelection(photo.id, e)}
                                  title={userSelection.has(photo.id) ? 'Retirer de votre sélection' : 'Ajouter à votre sélection'}
                                >
                                  <Heart 
                                    className={`h-5 w-5 transition-all ${
                                      userSelection.has(photo.id)
                                        ? 'fill-current text-white'
                                        : 'text-gray-600'
                                    }`} 
                                  />
                                </button>
                                
                                {selection.has(photo.id) && favoritesList.filter(f => f.photoId === photo.id).length > 1 && (
                                  <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                    {favoritesList.filter(f => f.photoId === photo.id).length}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="favorite-indicator">
                                <button
                                  className="w-full h-full flex items-center justify-center"
                                  onClick={(e) => toggleSelection(photo.id, e)}
                                  title="Cliquez pour vous identifier et ajouter aux favoris"
                                >
                                  <Heart className="h-5 w-5 text-gray-600" />
                                </button>
                                
                                {selection.has(photo.id) && favoritesList.filter(f => f.photoId === photo.id).length > 0 && (
                                  <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                    {favoritesList.filter(f => f.photoId === photo.id).length}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Comment indicator */}
                            {photoCommentCounts[photo.id] > 0 && (
                              <div className="comment-indicator">
                                <MessageSquare className="h-3 w-3" />
                                {photoCommentCounts[photo.id]}
                              </div>
                            )}

                            {/* Hover overlay with quick comment */}
                            <div className="photo-overlay">
                              <div></div>
                              <div className="quick-comment-form">
                                <input
                                  type="text"
                                  placeholder="Ajouter un commentaire..."
                                  className="quick-comment-input"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      const target = e.target as HTMLInputElement;
                                      if (target.value.trim()) {
                                        submitComment(photo.id, target.value);
                                        target.value = '';
                                      }
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                  className="quick-comment-submit"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement;
                                    if (input?.value.trim()) {
                                      submitComment(photo.id, input.value);
                                      input.value = '';
                                    }
                                  }}
                                >
                                  <Send className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </>
        ) : (
          // Classic single-folder view when a subfolder is selected
          <div className={viewMode === 'masonry' ? 'masonry-grid' : 'classic-grid'}>
            {filteredPhotos.map((photo, index) => (
              <div 
                key={photo.id} 
                className={viewMode === 'masonry' ? 'masonry-item animate-fadeIn' : 'classic-grid-item animate-fadeIn'}
                style={getGridItemStyle(photo)}
              >
                {/* Photo */}
                <div className={viewMode === 'masonry' ? 'photo-container' : ''} onClick={() => openLightbox(index)}>
                  <img
                    src={photo.url}
                    alt={getPhotoDisplayName(photo)}
                    loading="lazy"
                    className={viewMode === 'masonry' ? 'photo-image' : 'classic-grid-image'}
                  />

                  {/* Photo name overlay - NEW */}
                  <div className={`photo-name-overlay ${showPhotoNames ? 'show-always' : ''}`}>
                    {getPhotoDisplayName(photo)}
                  </div>

                  {/* Selection indicator - shows user's own selection */}
                  {/* Only show clickable heart if user is logged in */}
                  {userService.isUserLoggedIn() ? (
                    <div className={`favorite-indicator ${userSelection.has(photo.id) ? 'is-favorite' : ''}`}>
                      <button
                        className="w-full h-full flex items-center justify-center"
                        onClick={(e) => toggleSelection(photo.id, e)}
                        title={userSelection.has(photo.id) ? 'Retirer de votre sélection' : 'Ajouter à votre sélection'}
                      >
                        <Heart 
                          className={`h-5 w-5 transition-all ${
                            userSelection.has(photo.id)
                              ? 'fill-current text-white' // User selected - filled heart with white color
                              : 'text-gray-600' // Not selected by user - gray
                          }`} 
                        />
                      </button>
                      
                      {/* Global selection indicator - shows if others have selected, positioned in same div */}
                      {selection.has(photo.id) && favoritesList.filter(f => f.photoId === photo.id).length > 1 && (
                        <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                          {favoritesList.filter(f => f.photoId === photo.id).length}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Show non-clickable heart for non-logged users
                    <div className="favorite-indicator">
                      <button
                        className="w-full h-full flex items-center justify-center"
                        onClick={(e) => toggleSelection(photo.id, e)}
                        title="Cliquez pour vous identifier et ajouter aux favoris"
                      >
                        <Heart className="h-5 w-5 text-gray-600" />
                      </button>
                      
                      {/* Global selection indicator for non-logged users */}
                      {selection.has(photo.id) && favoritesList.filter(f => f.photoId === photo.id).length > 0 && (
                        <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                          {favoritesList.filter(f => f.photoId === photo.id).length}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Comment indicator */}
                  {photoCommentCounts[photo.id] > 0 && (
                    <div className="comment-indicator">
                      <MessageSquare className="h-3 w-3" />
                      {photoCommentCounts[photo.id]}
                    </div>
                  )}

                  {/* Subfolder indicator - only show in masonry view */}
                  {photo.subfolder && viewMode === 'masonry' && (
                    <div className="subfolder-indicator">
                      <Folder className="h-3 w-3 mr-1" />
                      {photo.subfolder}
                    </div>
                  )}

                  {/* Hover overlay with quick comment */}
                  <div className="photo-overlay">
                    <div></div>
                    <div className="quick-comment-form">
                      <input
                        type="text"
                        placeholder="Ajouter un commentaire..."
                        className="quick-comment-input"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const target = e.target as HTMLInputElement;
                            if (target.value.trim()) {
                              submitComment(photo.id, target.value);
                              target.value = '';
                            }
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        className="quick-comment-submit"
                        onClick={(e) => {
                          e.stopPropagation();
                          const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement;
                          if (input?.value.trim()) {
                            submitComment(photo.id, input.value);
                            input.value = '';
                          }
                        }}
                      >
                        <Send className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Lightbox
        photos={filteredPhotos}
        currentIndex={lightboxIndex}
        onClose={closeLightbox}
        onNavigate={navigateLightbox}
        favorites={userSelection} // User's favorites for heart indicator
        favoriteDetails={favoritesList} // Pass favorite details for user info
        commentCounts={photoCommentCounts}
        comments={comments} // Pass all comments for lightbox display
        onToggleFavorite={toggleSelection}
        onAddComment={submitComment}
      />

      {/* User Name Dialog */}
      <UserNameDialog
        open={showUserNameDialog}
        onConfirm={handleUserNameConfirm}
        onCancel={handleUserNameCancel}
      />
    </div>
  );
}
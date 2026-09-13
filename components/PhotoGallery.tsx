import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { AuthDialog } from "./AuthDialog";
import { Lightbox } from "./Lightbox";
import { SelectionSubmitButton } from "./SelectionSubmitButton";
import { UserNameDialog } from "./UserNameDialog";
import { ComparisonModal } from "./ComparisonModal";
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Search,
  Send,
  Filter,
  Folder,
  FolderOpen,
  FolderTree,
  Info,
  CornerDownRight,
  Grid,
  Grid3X3,
  Tag,
  ChevronDown,
  ChevronRight,
  GitCompare
} from "lucide-react";
import { toast } from "sonner";
import { galleryService, SubfolderInfo, flattenFolderSections, buildFolderSections, findFolderSection, folderFilterNames } from "../services/galleryService";
import { photoSrc } from "../services/imageService";
import { InstructionsPanel } from "./InstructionsPanel";
import { accentStyle, normalizeHex } from "../services/colorUtils";
import { favoritesService } from "../services/favoritesService";
import { userService } from "../services/userService";
import type { Gallery, Photo, FolderSection } from "../services/galleryService";
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
  const [folderSections, setFolderSections] = useState<FolderSection[]>([]); // hierarchy (groups + subfolders)
  const [showInstructions, setShowInstructions] = useState(false); // selection instructions panel
  const [visitorName, setVisitorName] = useState<string | null>(userService.getCurrentUserName());
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

  // Scroll indicators for subfolders
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Comparison mode state
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [comparisonSelection, setComparisonSelection] = useState<Set<string>>(new Set());
  const [showComparisonModal, setShowComparisonModal] = useState(false);

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

  // Sections in display order (gallery folder tree), depth-first. Group headers are included
  // even when the group holds no photo of its own; unknown sections go last, in natural order.
  const getOrderedSections = (sectionNames: string[]) => {
    return flattenFolderSections(
      buildFolderSections(sectionNames.map(name => ({ name, photoCount: 0 })), gallery?.folderTree)
    );
  };

  // Follow the visitor identity (name shown in the header, "ce n'est pas moi")
  useEffect(() => userService.onChange(session => setVisitorName(session?.userName || null)), []);

  const forgetVisitor = () => {
    userService.clearSession();
    setUserSelection(new Set());
    toast.info('Vous indiquerez votre prénom au prochain favori');
  };

  // Load gallery data
  useEffect(() => {
    loadGalleryData();
  }, [galleryId, selectedSubfolder]); // Reload when subfolder filter changes

  // Check for scrollbar on mount and resize
  useEffect(() => {
    const checkScroll = () => {
      if (scrollContainerRef.current && showSubfolderFilter && subfolders.length > 0) {
        const container = scrollContainerRef.current;
        const hasScroll = container.scrollWidth > container.clientWidth;
        const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
        setShowScrollIndicator(hasScroll && !isAtEnd);
      }
    };

    // Use setTimeout to ensure DOM is fully rendered before checking
    setTimeout(checkScroll, 100);
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [showSubfolderFilter, subfolders]);

  // Cleanup scroll interval on unmount
  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

  const loadGalleryData = async () => {
    try {
      setIsLoading(true);
      
      console.log(`🔍 Loading gallery data for: ${galleryId}${selectedSubfolder ? `, subfolder: ${selectedSubfolder}` : ''}`);
      
      // Load gallery info
      let galleryData = await galleryService.getGallery(galleryId);
      
      if (!galleryData) {
        console.error(`❌ Gallery ${galleryId} not found after all attempts`);
        toast.error(`Galerie "${galleryId}" non trouvée`);
        return;
      }

      console.log(`✅ Gallery loaded: ${galleryData.name}`);

      // Check if authentication is needed
      if (galleryData.hasPassword && !galleryService.isGalleryAuthenticated(galleryId)) {
        console.log('🔐 Gallery requires authentication');
        setNeedsAuth(true);
        return;
      }

      setGallery(galleryData);

      // Selection instructions: opened once per gallery and per browser, then via the header button
      if (galleryData.instructions && !localStorage.getItem(`gallery-${galleryId}-instructions-seen`)) {
        setShowInstructions(true);
      }

      // Load folder hierarchy (subfolders + groups, in display order)
      console.log('📁 Loading subfolders...');
      const sections = await galleryService.getGalleryFolderSections(galleryId);
      const subfolderList: SubfolderInfo[] = flattenFolderSections(sections)
        .filter(entry => entry.photoCount > 0)
        .map(entry => ({ name: entry.name, photoCount: entry.photoCount, lastUpdated: '', parent: entry.parent }));
      setFolderSections(sections);
      setSubfolders(subfolderList);
      console.log(`✅ Loaded ${subfolderList.length} subfolders`);

      // Show subfolder filter if there are subfolders
      if (subfolderList.length > 0 && !showSubfolderFilter) {
        setShowSubfolderFilter(true);
      }

      // Load photos (filtered by subfolder if selected; a group includes its children)
      console.log('📸 Loading photos...');
      const selectedSection = selectedSubfolder ? findFolderSection(sections, selectedSubfolder) : undefined;
      const photoFilter = selectedSection ? folderFilterNames(selectedSection) : selectedSubfolder;
      const photoList = await galleryService.getPhotos(galleryId, photoFilter);
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
        // Optimistic: update the three local sets, the database call runs behind
        const myId = userService.getCurrentUserId();
        const stillSelectedByOthers = favoritesList.some(f => f.photoId === photoId && f.userId !== myId);
        setUserSelection(prev => { const next = new Set(prev); next.delete(photoId); return next; });
        if (!stillSelectedByOthers) setSelection(prev => { const next = new Set(prev); next.delete(photoId); return next; });
        setFavoritesList(prev => prev.filter(f => !(f.photoId === photoId && f.userId === myId)));
        const removed = await favoritesService.removeFromFavorites(galleryId, photoId);
        if (!removed) {
          await loadGalleryData();
          throw new Error('remove failed');
        }
        toast.success('Retiré de votre sélection');
      } else {
        // Check if user has a session, if not show dialog
        if (!userService.isUserLoggedIn()) {
          setPendingFavoriteAction({ photoId, action: 'add' });
          setShowUserNameDialog(true);
          return;
        }

        const newFavorite = await favoritesService.addToFavorites(galleryId, photoId);
        setUserSelection(prev => new Set([...prev, photoId]));
        setSelection(prev => new Set([...prev, photoId]));
        setFavoritesList(prev => [...prev.filter(f => f.id !== newFavorite.id), newFavorite]);
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
      await userService.createSession(userName, deviceId);
      
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

  // Comparison mode handlers
  const toggleComparisonMode = () => {
    const newMode = !isComparisonMode;
    setIsComparisonMode(newMode);
    if (!newMode) {
      // Exit comparison mode - clear selection
      setComparisonSelection(new Set());
    } else {
      toast.info('Sélectionnez des photos à comparer');
    }
  };

  const toggleComparisonSelection = (photoId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    setComparisonSelection(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(photoId)) {
        newSelection.delete(photoId);
      } else {
        newSelection.add(photoId);
      }
      return newSelection;
    });
  };

  const openComparisonModal = () => {
    if (comparisonSelection.size === 0) {
      toast.error('Veuillez sélectionner au moins une photo à comparer');
      return;
    }
    setShowComparisonModal(true);
  };

  const closeComparisonModal = () => {
    setShowComparisonModal(false);
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

  // Sectioned view when showing everything or a whole group; flat view for a single subfolder
  const selectedSection = selectedSubfolder ? findFolderSection(folderSections, selectedSubfolder) : undefined;
  const showGroupedView = !selectedSubfolder || !!selectedSection?.isGroup;
  const sectionOrder = flattenFolderSections(folderSections).map(entry => entry.name);
  const sectionRank = new Map(sectionOrder.map((name, index) => [name, index]));

  // Filter photos based on search, then follow the displayed section order so that the
  // lightbox prev/next navigation matches what the visitor sees (sort is stable: name order
  // is preserved inside each section; sections unknown to the tree go last).
  const filteredPhotos = photos
    .filter(photo =>
      photo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      photo.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      photo.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) =>
      (sectionRank.get(a.subfolder || 'Photos principales') ?? Number.MAX_SAFE_INTEGER) -
      (sectionRank.get(b.subfolder || 'Photos principales') ?? Number.MAX_SAFE_INTEGER)
    );

  // Get display name for photo (prioritize original name)
  const getPhotoDisplayName = (photo: Photo) => {
    return photo.originalName || photo.name;
  };

  const closeInstructions = () => {
    setShowInstructions(false);
    try { localStorage.setItem(`gallery-${galleryId}-instructions-seen`, '1'); } catch { /* private mode */ }
  };
  const selectionQuota = gallery?.instructions?.quota?.max;

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
          onClose={() => {
            // Don't redirect when closing - let user try again or manually navigate away
            setNeedsAuth(false);
          }}
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

  const accent = normalizeHex(gallery.accentColor);

  return (
    <div className="min-h-screen bg-background" style={accentStyle(gallery.accentColor)}>
      {/* Hero: banner photo (or the accent color) carrying the gallery identity */}
      <div className="relative overflow-hidden text-white" style={{ backgroundColor: accent }}>
        {gallery.coverPhotoUrl && (
          <img src={gallery.coverPhotoUrl} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: gallery.coverPhotoUrl
              ? `linear-gradient(180deg, ${accent}33 0%, ${accent}D9 100%)`
              : `linear-gradient(135deg, ${accent} 0%, ${accent}CC 100%)`
          }}
        />
        <div className="relative container mx-auto px-4 pt-4 pb-6 md:pt-5 md:pb-8 min-h-[190px] md:min-h-[260px] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => window.appRouter.navigateTo('/')}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur px-3 py-1.5 text-sm transition-colors"
              aria-label="Retour à l'accueil"
            >
              <ArrowLeft className="h-4 w-4" />
              Accueil
            </button>
            {visitorName && (
              <span className="text-xs md:text-sm text-white/80 text-right">
                Bonjour {visitorName}
                <button
                  type="button"
                  onClick={forgetVisitor}
                  className="ml-1 underline underline-offset-2 hover:text-white"
                  aria-label="Ce n'est pas moi, changer de prénom"
                >
                  (ce n'est pas moi)
                </button>
              </span>
            )}
          </div>
          <div className="mt-6">
            {gallery.category && (
              <div className="text-[11px] md:text-xs uppercase tracking-[0.14em] text-white/70 mb-1">{gallery.category}</div>
            )}
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]">{gallery.name}</h1>
            {gallery.description && (
              <p className="mt-1.5 text-sm md:text-[15px] text-white/85 max-w-2xl">{gallery.description}</p>
            )}
            <div className="mt-2 flex items-center gap-2 text-sm text-white/80">
              <span>{photos.length} photos</span>
              {selectedSubfolder && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs">
                    <Folder className="h-3 w-3" />
                    {selectedSubfolder}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Header - Desktop Layout */}
      <div className="border-b backdrop-blur-sm sticky top-0 z-40 hidden md:block" style={{backgroundColor: '#f8f9fa'}}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            {/* Left: what is currently shown */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <span className="font-medium text-foreground">{filteredPhotos.length} photos</span>
              {selectedSubfolder && (
                <>
                  <span>•</span>
                  <Badge variant="outline" className="text-xs">
                    <Folder className="h-3 w-3 mr-1" />
                    {selectedSubfolder}
                  </Badge>
                </>
              )}
              {searchTerm && (
                <>
                  <span>•</span>
                  <span className="truncate">recherche « {searchTerm} »</span>
                </>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant={isComparisonMode ? "default" : "outline"}
                size="sm"
                onClick={toggleComparisonMode}
                className="flex items-center"
              >
                <GitCompare className="h-4 w-4 mr-2" />
                Comparer
              </Button>

              {gallery.instructions && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInstructions(true)}
                  className="flex items-center"
                  aria-label="Voir les consignes de sélection"
                >
                  <Info className="h-4 w-4 mr-2" />
                  Consignes
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.appRouter.navigateTo(`/favorites/${galleryId}`)}
                className="flex items-center"
              >
                <Heart className="h-4 w-4 mr-2" />
                {selectionQuota
                  ? `Ma sélection (${userSelection.size} / ${selectionQuota})`
                  : `Ma sélection (${selection.size})`}
              </Button>

              <SelectionSubmitButton
                galleryId={galleryId}
                galleryName={gallery.name}
                quota={selectionQuota}
                variant="default"
                size="sm"
              />
            </div>
          </div>

          {/* Compact controls row */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Search toggle/field */}
            {!showDesktopSearch ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDesktopSearch(true)}
                title="Rechercher des photos"
                aria-label="Rechercher des photos"
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
                aria-label="Vue mosaïque"
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
                aria-label="Vue grille classique"
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

            {/* Subfolder filter (desktop) - inline with scroll */}
            {showSubfolderFilter && subfolders.length > 0 && (
              <>
                <div className="h-6 w-px bg-border"></div>
                <div className="relative flex items-center flex-1 min-w-0">
                  <div
                    ref={scrollContainerRef}
                    className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1 min-w-0 scroll-smooth"
                    onScroll={(e) => {
                      const target = e.target as HTMLDivElement;
                      const hasMore = target.scrollWidth > target.clientWidth;
                      const isAtEnd = target.scrollLeft + target.clientWidth >= target.scrollWidth - 10;
                      setShowScrollIndicator(hasMore && !isAtEnd);
                    }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSubfolder(undefined)}
                      className={`shrink-0 ${!selectedSubfolder ? 'bg-primary text-primary-foreground' : ''}`}
                    >
                      <Grid className="h-4 w-4 mr-1" />
                      Toutes
                    </Button>

                    {folderSections.filter(section => section.photoCount > 0).map((section) => {
                      const isGroupActive = section.isGroup && (
                        selectedSubfolder === section.name || section.children.some(child => child.name === selectedSubfolder)
                      );
                      return (
                        <React.Fragment key={section.name}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSubfolderFilterChange(section.name)}
                            className={`shrink-0 ${selectedSubfolder === section.name ? 'bg-primary text-primary-foreground' : ''}`}
                          >
                            {section.isGroup ? <FolderTree className="h-4 w-4 mr-1" /> : <Folder className="h-4 w-4 mr-1" />}
                            <span className="max-w-[120px] truncate">{section.name}</span>
                            <Badge variant="secondary" className="ml-1 text-xs">
                              {section.photoCount}
                            </Badge>
                          </Button>
                          {/* Children of the active group, shown inline right after it */}
                          {isGroupActive && section.children.map((child) => (
                            <Button
                              key={child.name}
                              variant="outline"
                              size="sm"
                              onClick={() => handleSubfolderFilterChange(child.name)}
                              className={`shrink-0 border-dashed ${selectedSubfolder === child.name ? 'bg-primary text-primary-foreground' : ''}`}
                            >
                              <CornerDownRight className="h-3 w-3 mr-1 opacity-60" />
                              <span className="max-w-[120px] truncate">{child.name}</span>
                              <Badge variant="secondary" className="ml-1 text-xs">
                                {child.photoCount}
                              </Badge>
                            </Button>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Scroll indicator */}
                  {showScrollIndicator && (
                    <div
                      className="absolute -right-10 top-0 bottom-0 flex items-center pointer-events-auto"
                      onMouseEnter={() => {
                        if (scrollContainerRef.current && !isScrolling) {
                          setIsScrolling(true);
                          scrollIntervalRef.current = setInterval(() => {
                            if (scrollContainerRef.current) {
                              scrollContainerRef.current.scrollLeft += 4;
                              const target = scrollContainerRef.current;
                              if (target.scrollLeft + target.clientWidth >= target.scrollWidth - 10) {
                                if (scrollIntervalRef.current) {
                                  clearInterval(scrollIntervalRef.current);
                                  scrollIntervalRef.current = null;
                                  setIsScrolling(false);
                                }
                              }
                            }
                          }, 10);
                        }
                      }}
                      onMouseLeave={() => {
                        if (scrollIntervalRef.current) {
                          clearInterval(scrollIntervalRef.current);
                          scrollIntervalRef.current = null;
                          setIsScrolling(false);
                        }
                      }}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 hover:border-primary/30 transition-all cursor-pointer shadow-sm">
                        <ChevronRight className={`h-4 w-4 text-primary ${isScrolling ? 'animate-pulse' : ''}`} />
                      </div>
                    </div>
                  )}

                  {/* Fade overlay to indicate scrollable content */}
                  {showScrollIndicator && (
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
                  )}
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
          {/* Compact controls row */}
          <div className="flex items-center gap-2">
            {/* Comparison mode button */}
            <Button
              variant={isComparisonMode ? "default" : "outline"}
              size="sm"
              onClick={toggleComparisonMode}
              className="shrink-0"
              aria-label="Mode comparaison"
            >
              <GitCompare className="h-4 w-4" />
            </Button>

            {/* Search toggle button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="shrink-0"
              aria-label="Rechercher des photos"
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Selection button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.appRouter.navigateTo(`/favorites/${galleryId}`)}
              className="shrink-0"
              aria-label={`Ma sélection (${selection.size})`}
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
                aria-label="Vue mosaïque"
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
                aria-label="Vue grille classique"
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
              aria-label="Afficher les noms des photos"
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
              quota={selectionQuota}
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
                  {flattenFolderSections(folderSections).filter(entry => entry.photoCount > 0).map((entry) => (
                    <button
                      key={entry.name}
                      onClick={() => {
                        handleSubfolderFilterChange(entry.name);
                        setShowSubfolderDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center ${entry.depth > 0 ? 'pl-8' : ''} ${selectedSubfolder === entry.name ? 'bg-primary/10 text-primary' : ''}`}
                    >
                      {entry.depth > 0
                        ? <CornerDownRight className="h-3 w-3 mr-2 opacity-60" />
                        : entry.isGroup ? <FolderTree className="h-4 w-4 mr-2" /> : <Folder className="h-4 w-4 mr-2" />}
                      <span className="truncate">{entry.name}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {entry.photoCount}
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
        ) : showGroupedView ? (
          // Grouped view when showing all photos or a whole group
          <>
            {(() => {
              const photoGroups = groupPhotosBySubfolder(filteredPhotos);
              const sortedSections = getOrderedSections(Object.keys(photoGroups));

              return sortedSections.map((entry) => {
                const sectionName = entry.name;
                const sectionPhotos = photoGroups[sectionName] || [];
                const isSubSection = entry.depth > 0;

                // Group header only (the group holds no photo of its own)
                if (entry.isGroup && !isSubSection && sectionPhotos.length === 0) {
                  return (
                    <div key={sectionName} className="mt-2 mb-4 flex items-center gap-2">
                      <FolderTree className="h-5 w-5 text-gray-400" />
                      <h2 className="text-2xl font-semibold text-gray-900">{sectionName}</h2>
                    </div>
                  );
                }
                if (sectionPhotos.length === 0) return null;

                return (
                <div key={sectionName} className={isSubSection ? 'mb-8 pl-4 border-l-2 border-gray-100' : 'mb-8'}>
                  {/* Section Header */}
                  <div className="flex items-center gap-3 mb-4">
                    {entry.isGroup && <FolderTree className="h-5 w-5 text-gray-400" />}
                    <h2 className={`${isSubSection ? 'text-lg' : 'text-xl'} font-semibold text-gray-800`}>{sectionName}</h2>
                    <Badge variant="secondary" className="text-sm">
                      {sectionPhotos.length} photos
                    </Badge>
                  </div>

                  {/* Section Photos */}
                  <div className={viewMode === 'masonry' ? 'masonry-grid' : 'classic-grid'}>
                    {sectionPhotos.map((photo) => {
                      const originalIndex = filteredPhotos.findIndex(p => p.id === photo.id);
                      return (
                        <div 
                          key={photo.id} 
                          className={viewMode === 'masonry' ? 'masonry-item animate-fadeIn' : 'classic-grid-item animate-fadeIn'}
                          style={getGridItemStyle(photo)}
                        >
                          {/* Photo */}
                          <div
                            className={`${viewMode === 'masonry' ? 'photo-container' : ''} ${
                              isComparisonMode && comparisonSelection.has(photo.id) ? 'ring-4 ring-blue-500' : ''
                            }`}
                            onClick={(e) => {
                              if (isComparisonMode) {
                                toggleComparisonSelection(photo.id, e);
                              } else {
                                openLightbox(originalIndex);
                              }
                            }}
                            style={{ cursor: isComparisonMode ? 'pointer' : 'zoom-in' }}
                          >
                            <img
                              src={photoSrc(photo, 'grid')}
                              alt={getPhotoDisplayName(photo)}
                              loading="lazy"
                              className={viewMode === 'masonry' ? 'photo-image' : 'classic-grid-image'}
                            />

                            {/* Comparison mode checkbox indicator */}
                            {isComparisonMode && (
                              <div className="absolute top-2 left-2 z-10">
                                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                                  comparisonSelection.has(photo.id)
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'bg-white/80 border-gray-400'
                                }`}>
                                  {comparisonSelection.has(photo.id) && (
                                    <svg className="w-4 h-4 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                      <path d="M5 13l4 4L19 7"></path>
                                    </svg>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Photo name overlay */}
                            <div className={`photo-name-overlay ${showPhotoNames ? 'show-always' : ''}`}>
                              {getPhotoDisplayName(photo)}
                            </div>

                            {/* Selection indicator (favorites) - hide in comparison mode */}
                            {!isComparisonMode && userService.isUserLoggedIn() ? (
                              <div className={`favorite-indicator ${
                                userSelection.has(photo.id) ? 'is-favorite' :
                                selection.has(photo.id) ? 'is-favorite-other' : ''
                              }`}>
                                <button
                                  className="w-full h-full flex items-center justify-center"
                                  onClick={(e) => toggleSelection(photo.id, e)}
                                  title={userSelection.has(photo.id) ? 'Retirer de votre sélection' : 'Ajouter à votre sélection'}
                                  aria-label={userSelection.has(photo.id) ? 'Retirer de votre sélection' : 'Ajouter à votre sélection'}
                                >
                                  <Heart 
                                    className={`h-5 w-5 transition-all ${
                                      userSelection.has(photo.id)
                                        ? 'fill-current text-white'
                                        : selection.has(photo.id)
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
                            ) : !isComparisonMode ? (
                              <div className={`favorite-indicator ${
                                selection.has(photo.id) ? 'is-favorite-other' : ''
                              }`}>
                                <button
                                  className="w-full h-full flex items-center justify-center"
                                  onClick={(e) => toggleSelection(photo.id, e)}
                                  title="Cliquez pour vous identifier et ajouter aux favoris"
                                  aria-label="Cliquez pour vous identifier et ajouter aux favoris"
                                >
                                  <Heart className={`h-5 w-5 transition-all ${
                                    selection.has(photo.id) ? 'fill-current text-white' : 'text-gray-600'
                                  }`} />
                                </button>

                                {selection.has(photo.id) && favoritesList.filter(f => f.photoId === photo.id).length > 0 && (
                                  <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                    {favoritesList.filter(f => f.photoId === photo.id).length}
                                  </div>
                                )}
                              </div>
                            ) : null}

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
                                  aria-label="Envoyer le commentaire"
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
                );
              });
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
                <div
                  className={`${viewMode === 'masonry' ? 'photo-container' : ''} ${
                    isComparisonMode && comparisonSelection.has(photo.id) ? 'ring-4 ring-blue-500' : ''
                  }`}
                  onClick={(e) => {
                    if (isComparisonMode) {
                      toggleComparisonSelection(photo.id, e);
                    } else {
                      openLightbox(index);
                    }
                  }}
                  style={{ cursor: isComparisonMode ? 'pointer' : 'zoom-in' }}
                >
                  <img
                    src={photoSrc(photo, 'grid')}
                    alt={getPhotoDisplayName(photo)}
                    loading="lazy"
                    className={viewMode === 'masonry' ? 'photo-image' : 'classic-grid-image'}
                  />

                  {/* Comparison mode checkbox indicator */}
                  {isComparisonMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                        comparisonSelection.has(photo.id)
                          ? 'bg-blue-500 border-blue-500'
                          : 'bg-white/80 border-gray-400'
                      }`}>
                        {comparisonSelection.has(photo.id) && (
                          <svg className="w-4 h-4 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Photo name overlay - NEW */}
                  <div className={`photo-name-overlay ${showPhotoNames ? 'show-always' : ''}`}>
                    {getPhotoDisplayName(photo)}
                  </div>

                  {/* Selection indicator - shows user's own selection */}
                  {/* Only show clickable heart if user is logged in */}
                  {!isComparisonMode && userService.isUserLoggedIn() ? (
                    <div className={`favorite-indicator ${
                      userSelection.has(photo.id) ? 'is-favorite' : 
                      selection.has(photo.id) ? 'is-favorite-other' : ''
                    }`}>
                      <button
                        className="w-full h-full flex items-center justify-center"
                        onClick={(e) => toggleSelection(photo.id, e)}
                        title={userSelection.has(photo.id) ? 'Retirer de votre sélection' : 'Ajouter à votre sélection'}
                        aria-label={userSelection.has(photo.id) ? 'Retirer de votre sélection' : 'Ajouter à votre sélection'}
                      >
                        <Heart 
                          className={`h-5 w-5 transition-all ${
                            userSelection.has(photo.id)
                              ? 'fill-current text-white' // User selected - filled heart with white color
                              : selection.has(photo.id)
                              ? 'fill-current text-white' // Selected by others - also filled
                              : 'text-gray-600' // Not selected by anyone - gray
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
                  ) : !isComparisonMode ? (
                    // Show non-clickable heart for non-logged users
                    <div className={`favorite-indicator ${
                      selection.has(photo.id) ? 'is-favorite-other' : ''
                    }`}>
                      <button
                        className="w-full h-full flex items-center justify-center"
                        onClick={(e) => toggleSelection(photo.id, e)}
                        title="Cliquez pour vous identifier et ajouter aux favoris"
                        aria-label="Cliquez pour vous identifier et ajouter aux favoris"
                      >
                        <Heart className={`h-5 w-5 transition-all ${
                          selection.has(photo.id) ? 'fill-current text-white' : 'text-gray-600'
                        }`} />
                      </button>

                      {/* Global selection indicator for non-logged users */}
                      {selection.has(photo.id) && favoritesList.filter(f => f.photoId === photo.id).length > 0 && (
                        <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                          {favoritesList.filter(f => f.photoId === photo.id).length}
                        </div>
                      )}
                    </div>
                  ) : null}

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
                        aria-label="Envoyer le commentaire"
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
      {gallery?.instructions && (
        <InstructionsPanel instructions={gallery.instructions} open={showInstructions} onClose={closeInstructions} />
      )}

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
        sectionOrder={sectionOrder} // Section order (folder tree) for the position counter
        allPhotos={photos} // All photos for correct position calculation
      />

      {/* Comparison Modal */}
      {showComparisonModal && (
        <ComparisonModal
          photos={filteredPhotos}
          selectedPhotos={comparisonSelection}
          onClose={closeComparisonModal}
          favorites={userSelection}
          favoriteDetails={favoritesList}
          commentCounts={photoCommentCounts}
          comments={comments}
          onToggleFavorite={toggleSelection}
          onAddComment={submitComment}
        />
      )}

      {/* User Name Dialog */}
      <UserNameDialog
        open={showUserNameDialog}
        onConfirm={handleUserNameConfirm}
        onCancel={handleUserNameCancel}
      />

      {/* Fixed comparison button - Bottom right */}
      {isComparisonMode && comparisonSelection.size > 0 && (
        <button
          onClick={openComparisonModal}
          className="fixed bottom-6 right-6 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-full shadow-lg flex items-center gap-3 transition-all z-50 animate-in slide-in-from-bottom-5"
        >
          <GitCompare className="h-5 w-5" />
          <span className="font-medium">Voir la comparaison</span>
          <Badge variant="secondary" className="bg-white/20 text-white border-0">
            {comparisonSelection.size}
          </Badge>
        </button>
      )}
    </div>
  );
}
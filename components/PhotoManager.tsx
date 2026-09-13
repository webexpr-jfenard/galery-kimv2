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
  Star,
  GripVertical,
  Settings2,
  Save,
  FolderInput,
  FolderPlus,
  FolderTree,
  Sparkles,
  PanelTop
} from "lucide-react";
import { toast } from "sonner";
import { galleryService, buildFolderSections, folderTreeFromNames } from "../services/galleryService";
import { photoSrc } from "../services/imageService";
import type { Gallery, Photo, FolderNode, FolderSection } from "../services/galleryService";

interface PhotoManagerProps {
  galleryId: string;
  onClose: () => void;
}

// Folder order saved per browser before galleries.folder_tree existed (pre-2026-09)
const LEGACY_ORDER_KEY = (galleryId: string) => `gallery-${galleryId}-subfolder-order`;
const readLegacyOrder = (galleryId: string): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEGACY_ORDER_KEY(galleryId)) || 'null');
    return Array.isArray(parsed) ? parsed.filter((name): name is string => typeof name === 'string') : [];
  } catch {
    return [];
  }
};

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
  const [showFolderOrganizer, setShowFolderOrganizer] = useState(false);
  const [orderedSubfolders, setOrderedSubfolders] = useState<string[]>([]);
  const [subfolderParents, setSubfolderParents] = useState<Record<string, string | undefined>>({});
  const [subfolderCounts, setSubfolderCounts] = useState<Record<string, number>>({});
  const [folderTree, setFolderTree] = useState<FolderNode[]>([]); // working copy, persisted with "Sauvegarder"
  const [dragItem, setDragItem] = useState<{ parent: string | null; index: number } | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [isSavingTree, setIsSavingTree] = useState(false);
  const [thumbProgress, setThumbProgress] = useState<{ done: number; total: number } | null>(null);
  const [showFolderReassignModal, setShowFolderReassignModal] = useState(false);
  const [targetSubfolder, setTargetSubfolder] = useState<string | undefined>();
  const [newFolderName, setNewFolderName] = useState(''); // "Changer de dossier": create a folder on the fly
  const [isReassigning, setIsReassigning] = useState(false);

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
        toast.error('Galerie introuvable');
        onClose();
        return;
      }
      setGallery(galleryData);

      // Load photos (filtered by subfolder if selected)
      const photoList = await galleryService.getPhotos(galleryId, selectedSubfolder);
      setPhotos(photoList);
      
      // Load subfolders (already in display order, annotated with their group)
      const subfolderList = await galleryService.getGallerySubfolders(galleryId);
      const subfolderNames = subfolderList.map(sf => sf.name);
      setSubfolders(subfolderNames);
      setOrderedSubfolders(subfolderNames);
      setSubfolderParents(Object.fromEntries(subfolderList.map(sf => [sf.name, sf.parent])));
      setSubfolderCounts(Object.fromEntries(subfolderList.map(sf => [sf.name, sf.photoCount])));

      // Working copy of the folder tree. Galleries organized before the tree existed only
      // have a per-browser order in localStorage: seed the tree from it so a single
      // "Sauvegarder" shares that order with everyone.
      let tree = galleryData.folderTree || [];
      if (tree.length === 0) {
        const legacyOrder = readLegacyOrder(galleryId);
        if (legacyOrder.length > 0) tree = folderTreeFromNames(legacyOrder);
      }
      setFolderTree(tree);

      console.log(`✅ Loaded ${photoList.length} photos for gallery ${galleryData.name}`);
      
    } catch (error) {
      console.error('Error loading gallery data:', error);
      toast.error('Impossible de charger la galerie');
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
      `Supprimer ${selectedPhotos.size} photo(s) sélectionnée(s) ?\n\nCela supprimera définitivement les fichiers et métadonnées.\n\nCette action est irréversible.`
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
        toast.success(`Photo(s) supprimée(s)`);
      }
      if (errorCount > 0) {
        toast.error(`Échec de la suppression`);
      }

      // Reload photos and clear selection
      setSelectedPhotos(new Set());
      await loadGalleryData();
      
    } catch (error) {
      console.error('Error during bulk delete:', error);
      toast.error('Échec de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = async (photo: Photo) => {
    const confirmed = confirm(
      `Supprimer "${photo.originalName || photo.name}" ?\n\nCela supprimera définitivement les fichiers et métadonnées.\n\nCette action est irréversible.`
    );

    if (!confirmed) return;

    try {
      const success = await galleryService.deletePhoto(galleryId, photo.id);
      if (success) {
        toast.success('Photo(s) supprimée(s)');
        await loadGalleryData();
      } else {
        toast.error('Échec de la suppression');
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Échec de la suppression');
    }
  };

  const handleSetFeaturedPhoto = async (photo: Photo) => {
    try {
      const success = await galleryService.setFeaturedPhoto(galleryId, photo.id);
      if (success) {
        toast.success(`"${photo.originalName || photo.name}" définie comme photo principale`);
        await loadGalleryData();
      } else {
        toast.error('Échec de la suppression');
      }
    } catch (error) {
      console.error('Error setting featured photo:', error);
      toast.error('Échec de la suppression');
    }
  };

  const handleSetCoverPhoto = async (photo: Photo) => {
    const success = await galleryService.setCoverPhoto(galleryId, photo.id);
    if (success) {
      toast.success(`"${photo.originalName || photo.name}" définie comme bannière`);
      await loadGalleryData();
    } else {
      toast.error('Échec de la définition de la bannière');
    }
  };

  const handleRemoveCoverPhoto = async () => {
    const success = await galleryService.removeCoverPhoto(galleryId);
    if (success) {
      toast.success('Bannière retirée');
      await loadGalleryData();
    } else {
      toast.error('Échec du retrait de la bannière');
    }
  };

  const isCoverPhoto = (photo: Photo) => gallery?.coverPhotoId === photo.id;

  const handleRemoveFeaturedPhoto = async () => {
    try {
      const success = await galleryService.removeFeaturedPhoto(galleryId);
      if (success) {
        toast.success('Photo principale retirée');
        await loadGalleryData();
      } else {
        toast.error('Échec de la suppression');
      }
    } catch (error) {
      console.error('Error removing featured photo:', error);
      toast.error('Échec de la suppression');
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

  // ---- Folder organizer (order + groups), working copy = folderTree ----
  const organizerSections: FolderSection[] = buildFolderSections(
    subfolders.map(name => ({ name, photoCount: subfolderCounts[name] || 0 })),
    folderTree,
    { keepEmptyGroups: true }
  );
  const groupNames = organizerSections.filter(section => section.isGroup).map(section => section.name);

  const treeFromSections = (sections: FolderSection[]): FolderNode[] =>
    sections.map(section => section.isGroup
      ? { name: section.name, children: section.children.map(child => child.name) }
      : { name: section.name });

  const cloneSections = () => organizerSections.map(section => ({ ...section, children: [...section.children] }));

  const reorderSections = (parent: string | null, from: number, to: number) => {
    const sections = cloneSections();
    const list = parent === null ? sections : sections.find(section => section.name === parent)?.children;
    if (!list) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    setFolderTree(treeFromSections(sections));
  };

  const handleOrganizerDragOver = (e: React.DragEvent, parent: string | null, index: number) => {
    e.preventDefault();
    if (!dragItem || dragItem.parent !== parent || dragItem.index === index) return;
    reorderSections(parent, dragItem.index, index);
    setDragItem({ parent, index });
  };

  // Attach a subfolder to a group (or back to the root)
  const setFolderParent = (name: string, parent: string | null) => {
    const sections = cloneSections()
      .filter(section => section.name !== name)
      .map(section => ({ ...section, children: section.children.filter(child => child.name !== name) }));
    const count = subfolderCounts[name] || 0;
    const leaf: FolderSection = { name, photoCount: count, ownPhotoCount: count, isGroup: false, children: [] };
    if (parent === null) {
      sections.push(leaf);
    } else {
      const group = sections.find(section => section.name === parent);
      if (!group) return;
      group.children.push({ ...leaf, parent });
    }
    setFolderTree(treeFromSections(sections));
  };

  const createGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    const lower = name.toLowerCase();
    const taken = organizerSections.some(section =>
      section.name.toLowerCase() === lower || section.children.some(child => child.name.toLowerCase() === lower)
    );
    if (taken) {
      toast.error('Un dossier ou un groupe porte déjà ce nom');
      return;
    }
    setFolderTree([...treeFromSections(organizerSections), { name, children: [] }]);
    setNewGroupName('');
  };

  // Dissolve a group: its subfolders go back to the root (in place); its own photos stay in a plain folder
  const removeGroup = (name: string) => {
    const sections: FolderSection[] = [];
    organizerSections.forEach(section => {
      if (section.name !== name) {
        sections.push(section);
        return;
      }
      if (subfolderCounts[name]) sections.push({ ...section, isGroup: false, children: [] });
      section.children.forEach(child => sections.push({ ...child, parent: undefined }));
    });
    setFolderTree(treeFromSections(sections));
  };

  const persistFolderTree = async (tree: FolderNode[], successMessage: string) => {
    try {
      setIsSavingTree(true);
      const updated = await galleryService.updateGallery(galleryId, { folderTree: tree });
      if (!updated) {
        toast.error("Impossible d'enregistrer l'organisation des dossiers");
        return;
      }
      localStorage.removeItem(LEGACY_ORDER_KEY(galleryId));
      toast.success(successMessage);
      setShowFolderOrganizer(false);
      await loadGalleryData();
    } catch (error) {
      console.error('Error saving folder tree:', error);
      toast.error("Impossible d'enregistrer l'organisation des dossiers");
    } finally {
      setIsSavingTree(false);
    }
  };

  const saveFolderTree = () =>
    persistFolderTree(treeFromSections(organizerSections), 'Organisation des dossiers enregistrée pour tous les visiteurs');

  const resetFolderTree = () =>
    persistFolderTree([], 'Ordre alphabétique rétabli');

  const renderOrganizerRow = (section: FolderSection, parent: string | null, index: number) => {
    const isDragging = dragItem?.parent === parent && dragItem?.index === index;
    return (
      <div
        key={section.name}
        draggable
        onDragStart={() => setDragItem({ parent, index })}
        onDragOver={(e) => handleOrganizerDragOver(e, parent, index)}
        onDragEnd={() => setDragItem(null)}
        className={`flex items-center gap-2 p-3 border rounded-lg bg-white cursor-move hover:shadow-sm transition-all ${
          isDragging ? 'opacity-50' : ''
        } ${selectedSubfolder === section.name ? 'border-[#1F2A44]' : 'border-gray-200'}`}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        {section.isGroup
          ? <FolderTree className="h-4 w-4 text-gray-900 shrink-0" />
          : <Folder className="h-4 w-4 text-muted-foreground shrink-0" />}
        <span className="text-sm font-medium truncate flex-1">{section.name}</span>
        <Badge variant="secondary" className="text-xs">{section.photoCount}</Badge>
        {section.isGroup ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-gray-500 hover:text-gray-900"
            onClick={() => removeGroup(section.name)}
            title="Dissoudre le groupe : ses dossiers reviennent à la racine"
          >
            <X className="h-3 w-3 mr-1" />
            Dissoudre
          </Button>
        ) : groupNames.length > 0 && (
          <select
            value={parent || ''}
            onChange={(e) => setFolderParent(section.name, e.target.value || null)}
            className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700"
            title="Rattacher ce dossier à un groupe"
          >
            <option value="">Dans : racine</option>
            {groupNames.map(group => (
              <option key={group} value={group}>Dans : {group}</option>
            ))}
          </select>
        )}
      </div>
    );
  };

  const handleReassignToFolder = async () => {
    if (selectedPhotos.size === 0) return;

    // A typed name creates the folder (a folder exists as soon as a photo carries its name).
    // Reuse an existing folder when the name only differs by case.
    let target = targetSubfolder;
    const typedName = newFolderName.trim();
    if (typedName) {
      if (/[\\:*?"<>|]/.test(typedName)) {
        toast.error('Le nom du dossier ne peut pas contenir les caractères \\ : * ? " < > |');
        return;
      }
      target = subfolders.find(name => name.toLowerCase() === typedName.toLowerCase()) || typedName;
    }

    try {
      setIsReassigning(true);
      const photoIds = Array.from(selectedPhotos);

      const result = await galleryService.reassignPhotosToSubfolder(
        galleryId,
        photoIds,
        target
      );

      if (result.successful.length > 0) {
        const targetName = target || 'la racine';
        toast.success(`${result.successful.length} photo(s) déplacée(s) vers ${targetName}`);
      }

      if (result.failed.length > 0) {
        toast.error(`Échec du déplacement de ${result.failed.length} photo(s)`);
      }

      // Refresh photos and clear selection
      setSelectedPhotos(new Set());
      setShowFolderReassignModal(false);
      setTargetSubfolder(undefined);
      setNewFolderName('');
      await loadGalleryData();

    } catch (error) {
      console.error('Error reassigning photos:', error);
      toast.error('Échec du déplacement des photos');
    } finally {
      setIsReassigning(false);
    }
  };

  // Photos uploaded before September 2026 have no thumbnail: generate them from the originals
  const handleBackfillThumbnails = async () => {
    try {
      setThumbProgress({ done: 0, total: 0 });
      const result = await galleryService.backfillThumbnails(galleryId, (done, total) => setThumbProgress({ done, total }));
      if (result.failed.length > 0) {
        toast.warning(`${result.done} vignette(s) générée(s), ${result.failed.length} en échec`);
      } else if (result.done > 0) {
        toast.success(`${result.done} vignette(s) générée(s)`);
      } else {
        toast.info('Toutes les photos ont déjà une vignette');
      }
      await loadGalleryData();
    } catch (error) {
      console.error('Thumbnail backfill error:', error);
      toast.error('Génération des vignettes impossible');
    } finally {
      setThumbProgress(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Galerie introuvable</h1>
          <Button onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 font-['DM_Sans',sans-serif]"
      onClick={(e) => {
        // Close when clicking outside the modal
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-100 bg-white px-6 py-4 shrink-0">
          <div className="flex flex-col space-y-4">
            {/* Top row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold flex items-center gap-2">
                    <FileImage className="h-5 w-5 text-gray-900" />
                    <span className="truncate">Gérer les photos</span>
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
                {subfolders.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFolderOrganizer(!showFolderOrganizer)}
                    title="Organiser les dossiers (ordre et groupes)"
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                )}
                {photos.some(photo => !photo.thumbnailUrl) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackfillThumbnails}
                    disabled={!!thumbProgress}
                    title="Générer les vignettes manquantes (photos plus légères dans les galeries)"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span className="ml-1 text-xs">
                      {thumbProgress ? `${thumbProgress.done}/${thumbProgress.total || '…'}` : 'Vignettes'}
                    </span>
                  </Button>
                )}
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
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-50"
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
                    <span className="text-sm font-medium text-orange-800">Photo principale définie</span>
                  </div>
                  <p className="text-xs text-orange-600 truncate">Cette photo sera affichée dans la liste des galeries</p>
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

            {gallery?.coverPhotoUrl && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="w-20 h-12 rounded-lg overflow-hidden border-2 border-blue-300 shrink-0">
                  <img src={gallery.coverPhotoUrl} alt="Bannière" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <PanelTop className="h-4 w-4 text-blue-700" />
                    <span className="text-sm font-medium text-blue-900">Bannière définie</span>
                  </div>
                  <p className="text-xs text-blue-700 truncate">Cette photo s'affiche en tête de la galerie, derrière le titre</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRemoveCoverPhoto}
                  className="shrink-0 border-blue-300 text-blue-800 hover:bg-blue-100"
                  aria-label="Retirer la bannière"
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
                  placeholder="Rechercher par nom ou dossier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-lg border-gray-200 text-[14px] placeholder:text-gray-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              {/* Subfolder filter */}
              {subfolders.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSubfolder(undefined)}
                    className={`shrink-0 ${!selectedSubfolder ? 'bg-[#1F2A44] text-white border-[#1F2A44]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    Tous les dossiers
                  </Button>
                  {orderedSubfolders.map((subfolder) => (
                    <Button
                      key={subfolder}
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSubfolder(subfolder)}
                      className={`shrink-0 ${selectedSubfolder === subfolder ? 'bg-[#1F2A44] text-white border-[#1F2A44]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      <Folder className="h-4 w-4 mr-1" />
                      <span className="max-w-[100px] truncate">{subfolder}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Folder Organizer Panel */}
            {showFolderOrganizer && subfolders.length > 1 && (
              <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Organiser les dossiers
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetFolderTree}
                      disabled={isSavingTree}
                    >
                      Ordre alphabétique
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={saveFolderTree}
                      disabled={isSavingTree}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSavingTree ? 'Enregistrement…' : 'Sauvegarder'}
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground mb-3">
                  Glissez-déposez pour changer l'ordre d'affichage. Créez un groupe (ex. « Salles ») puis rattachez-y des dossiers
                  avec le menu « Dans ». L'organisation est enregistrée pour tous les visiteurs de la galerie.
                </div>

                {/* New group */}
                <div className="flex items-center gap-2 mb-4">
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        createGroup();
                      }
                    }}
                    placeholder="Nom du nouveau groupe (ex. Salles)"
                    className="max-w-xs text-sm"
                    maxLength={50}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={createGroup}
                    disabled={!newGroupName.trim()}
                  >
                    <FolderPlus className="h-4 w-4 mr-1" />
                    Créer un groupe
                  </Button>
                </div>

                {/* Scrollable: the modal header does not scroll, and a gallery can have dozens of folders */}
                <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                  {organizerSections.map((section, index) => (
                    <div key={section.name}>
                      {renderOrganizerRow(section, null, index)}
                      {section.isGroup && (
                        <div className="ml-8 mt-2 space-y-2">
                          {section.children.length === 0 && (
                            <div className="text-xs text-muted-foreground italic px-3 py-2 border border-dashed border-gray-200 rounded-lg">
                              Groupe vide : rattachez des dossiers avec le menu « Dans ».
                            </div>
                          )}
                          {section.children.map((child, childIndex) => renderOrganizerRow(child, section.name, childIndex))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bulk actions */}
            {filteredPhotos.length > 0 && (
              <div className="flex items-center justify-between bg-gray-50 border border-gray-100 p-3 rounded-lg">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPhotos.size === filteredPhotos.length && filteredPhotos.length > 0}
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">
                      Tout sélectionner ({selectedPhotos.size}/{filteredPhotos.length})
                    </span>
                  </label>
                </div>
                
                {selectedPhotos.size > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFolderReassignModal(true)}
                    >
                      <FolderInput className="h-4 w-4 mr-2" />
                      Changer de dossier ({selectedPhotos.size})
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelected}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer ({selectedPhotos.size})
                    </Button>
                  </div>
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
                  Aucune photo ne correspond à votre recherche
                </p>
                <Button variant="outline" onClick={() => setSearchTerm('')}>
                  Effacer la recherche
                </Button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileImage className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-semibold mb-4">Aucune photo</h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Cette galerie ne contient pas encore de photos.
                </p>
              </>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredPhotos.map((photo) => (
              <div key={photo.id} className="group relative bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all">
                {/* Selection checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedPhotos.has(photo.id)}
                    onChange={(e) => handleSelectPhoto(photo.id, e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                </div>

                {/* Featured / banner badges */}
                {(isFeaturedPhoto(photo) || isCoverPhoto(photo)) && (
                  <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
                    {isFeaturedPhoto(photo) && (
                      <Badge className="bg-orange-600 text-white text-xs px-2 py-1">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Principale
                      </Badge>
                    )}
                    {isCoverPhoto(photo) && (
                      <Badge className="bg-blue-700 text-white text-xs px-2 py-1">
                        <PanelTop className="h-3 w-3 mr-1" />
                        Bannière
                      </Badge>
                    )}
                  </div>
                )}

                {/* Photo */}
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={photoSrc(photo, 'grid')}
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
                      title={isFeaturedPhoto(photo) ? 'Photo principale (liste des galeries)' : 'Définir comme photo principale'}
                      aria-label="Définir comme photo principale"
                    >
                      <Star className={`h-4 w-4 ${isFeaturedPhoto(photo) ? 'fill-current' : ''}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSetCoverPhoto(photo)}
                      className={isCoverPhoto(photo) ? 'bg-blue-700 text-white' : ''}
                      title={isCoverPhoto(photo) ? 'Bannière de la galerie' : 'Définir comme bannière'}
                      aria-label="Définir comme bannière"
                    >
                      <PanelTop className="h-4 w-4" />
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
              <div key={photo.id} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-shadow">
                <input
                  type="checkbox"
                  checked={selectedPhotos.has(photo.id)}
                  onChange={(e) => handleSelectPhoto(photo.id, e.target.checked)}
                  className="w-4 h-4 rounded shrink-0"
                />
                
                <div className="w-16 h-16 rounded overflow-hidden shrink-0">
                  <img
                    src={photoSrc(photo, 'grid')}
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
                      {new Date(photo.uploadedAt).toLocaleDateString()}
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
                        Principale
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

      {/* Folder Reassign Modal */}
      {showFolderReassignModal && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 font-['DM_Sans',sans-serif]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowFolderReassignModal(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FolderInput className="h-5 w-5 text-gray-900" />
                Changer de dossier
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFolderReassignModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                Sélectionnez le dossier de destination pour les {selectedPhotos.size} photo(s) sélectionnée(s).
              </p>
            </div>

            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
              <Button
                variant="outline"
                className={`w-full justify-start ${targetSubfolder === undefined ? 'bg-[#1F2A44] text-white border-[#1F2A44]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                onClick={() => {
                  setTargetSubfolder(undefined);
                  setNewFolderName('');
                }}
              >
                <Folder className="h-4 w-4 mr-2" />
                Racine de la galerie
              </Button>
              {orderedSubfolders.map((subfolder) => (
                <Button
                  key={subfolder}
                  variant="outline"
                  className={`w-full justify-start ${targetSubfolder === subfolder ? 'bg-[#1F2A44] text-white border-[#1F2A44]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  onClick={() => {
                    setTargetSubfolder(subfolder);
                    setNewFolderName('');
                  }}
                >
                  <Folder className="h-4 w-4 mr-2" />
                  {subfolderParents[subfolder] ? `${subfolderParents[subfolder]} › ` : ''}{subfolder}
                  {selectedSubfolder === subfolder && (
                    <Badge variant="secondary" className="ml-auto">
                      Dossier actuel
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            {/* Create a folder on the fly */}
            <div className="mb-6">
              <label htmlFor="new-folder-name" className="block text-xs font-medium text-gray-600 mb-1">
                Ou créer un nouveau dossier
              </label>
              <Input
                id="new-folder-name"
                value={newFolderName}
                onChange={(e) => {
                  setNewFolderName(e.target.value);
                  setTargetSubfolder(e.target.value.trim() || undefined);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim() && !isReassigning) {
                    e.preventDefault();
                    handleReassignToFolder();
                  }
                }}
                placeholder="Nom du nouveau dossier"
                maxLength={50}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Il sera créé à la racine de la galerie. Pour le placer dans un groupe, utilisez ensuite « Organiser les dossiers ».
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowFolderReassignModal(false);
                  setTargetSubfolder(undefined);
                  setNewFolderName('');
                }}
                disabled={isReassigning}
              >
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={handleReassignToFolder}
                disabled={isReassigning || (targetSubfolder === selectedSubfolder && selectedSubfolder !== undefined)}
              >
                {isReassigning ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Déplacement...
                  </>
                ) : (
                  <>
                    <FolderInput className="h-4 w-4 mr-2" />
                    {newFolderName.trim() && !subfolders.some(name => name.toLowerCase() === newFolderName.trim().toLowerCase())
                      ? 'Créer et déplacer'
                      : 'Déplacer'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
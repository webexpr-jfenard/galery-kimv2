import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Alert, AlertDescription } from "./ui/alert";
import { AuthDialog } from "./AuthDialog";
import { PhotoManager } from "./PhotoManager";
import { GmailConfigDialog } from "./GmailConfigDialog";
import { CategorySelector } from "./CategorySelector";
import { GalleryCard } from "./GalleryCard";
import { GalleryEditDialog } from "./GalleryEditDialog";
import {
  Settings,
  Plus,
  BarChart3,
  ArrowLeft,
  Search,
  Folder,
  Key,
  Shield,
  LogOut,
  Database,
  Image,
  Upload,
  CheckCircle,
  FileImage,
  RefreshCw,
  Cloud,
  HardDrive,
  AlertCircle,
  FolderOpen,
  Mail,
  Calculator,
  Tag,
  List,
  LayoutGrid,
  ArrowUpAZ,
  ArrowDownAZ,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { galleryService } from "../services/galleryService";
import { authService } from "../services/authService";
import { supabaseService } from "../services/supabaseService";
import type { Gallery } from "../services/galleryService";

export function AdminPanel() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{ timeRemaining?: number }>({});

  // Gallery management state
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'category'>('list');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'date-newest' | 'date-oldest'>('date-newest');

  // Supabase connection state
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    isTableReady: false,
    localGalleries: 0,
    remoteGalleries: 0
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Create gallery form state
  const [newGallery, setNewGallery] = useState({
    name: '',
    description: '',
    bucketFolder: '',
    bucketName: 'photos',
    password: '',
    isPublic: true,
    allowComments: true,
    allowFavorites: true,
    category: ''
  });

  // Edit gallery state (modal)
  const [editingGallery, setEditingGallery] = useState<Gallery | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Photo management state
  const [managingPhotosGallery, setManagingPhotosGallery] = useState<string | null>(null);
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [showSupabaseConfig, setShowSupabaseConfig] = useState(false);

  // Upload state
  const [uploadingGallery, setUploadingGallery] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ completed: number; total: number } | null>(null);
  const [uploadSubfolders, setUploadSubfolders] = useState<Record<string, string | undefined>>({});
  const [showUploadSections, setShowUploadSections] = useState<Record<string, boolean>>({});

  const [stats, setStats] = useState({
    totalGalleries: 0,
    totalPhotos: 0,
    protectedGalleries: 0
  });

  // Check authentication on mount
  useEffect(() => {
    const isAuth = authService.isAdminAuthenticated();
    if (isAuth) {
      setIsAuthenticated(true);
      loadGalleries();
      loadStats();
      loadConnectionStatus();
      const sessionData = authService.getSessionInfo();
      setSessionInfo(sessionData);
    } else {
      setShowAuthDialog(true);
    }
  }, []);

  // Session timer with 5-minute warning
  useEffect(() => {
    if (!isAuthenticated) return;

    const timer = setInterval(() => {
      const sessionData = authService.getSessionInfo();
      setSessionInfo(sessionData);

      if (!sessionData.isAuthenticated) {
        handleLogout();
        return;
      }

      if (
        sessionData.timeRemaining &&
        sessionData.timeRemaining < 5 * 60 * 1000 &&
        sessionData.timeRemaining > 4 * 60 * 1000
      ) {
        toast.warning('Votre session expire dans 5 minutes');
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [isAuthenticated]);

  const handleAuthentication = async (password: string): Promise<boolean> => {
    const isValid = authService.authenticateAdmin(password);
    if (isValid) {
      setIsAuthenticated(true);
      setShowAuthDialog(false);
      loadGalleries();
      loadStats();
      loadConnectionStatus();
      const sessionData = authService.getSessionInfo();
      setSessionInfo(sessionData);
      toast.success('Connecté avec succès au panneau admin');
    } else {
      toast.error('Mot de passe administrateur invalide');
    }
    return isValid;
  };

  const handleLogout = () => {
    authService.clearAdminSession();
    setIsAuthenticated(false);
    setShowAuthDialog(true);
    setGalleries([]);
    setStats({ totalGalleries: 0, totalPhotos: 0, protectedGalleries: 0 });
    toast.success('Déconnecté avec succès');
  };

  const loadGalleries = async () => {
    try {
      setIsLoading(true);
      const galleryList = await galleryService.getGalleries();
      setGalleries(galleryList || []);
    } catch (error) {
      console.error('Error loading galleries:', error);
      toast.error('Échec du chargement des galeries');
      setGalleries([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const galleryList = await galleryService.getGalleries();
      let totalPhotos = 0;
      let protectedGalleries = 0;
      for (const gallery of galleryList || []) {
        const s = await galleryService.getGalleryStats(gallery.id);
        totalPhotos += s.photoCount;
        if (gallery.password) protectedGalleries++;
      }
      setStats({ totalGalleries: galleryList?.length || 0, totalPhotos, protectedGalleries });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadConnectionStatus = async () => {
    try {
      const isReady = galleryService.isSupabaseConfigured();
      setConnectionStatus({
        isConnected: isReady,
        isTableReady: isReady,
        localGalleries: galleries.length,
        remoteGalleries: galleries.length
      });
    } catch (error) {
      console.error('Error loading connection status:', error);
    }
  };

  const handleSyncFromSupabase = async () => {
    try {
      setIsSyncing(true);
      const result = await galleryService.syncFromSupabase();
      if (result.success) {
        toast.success(`${result.count} galeries synchronisées avec succès depuis Supabase`);
        await loadGalleries();
        await loadStats();
        await loadConnectionStatus();
      } else {
        toast.error(result.error || 'Échec de la synchronisation depuis Supabase');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Échec de la synchronisation depuis Supabase');
    } finally {
      setIsSyncing(false);
    }
  };

  const createGallery = async () => {
    if (!newGallery.name.trim()) {
      toast.error('Veuillez entrer un nom de galerie');
      return;
    }
    try {
      setIsCreating(true);
      const createdGallery = await galleryService.createGallery({
        name: newGallery.name,
        description: newGallery.description || undefined,
        bucketFolder: newGallery.bucketFolder || undefined,
        bucketName: newGallery.bucketName || 'photos',
        password: newGallery.password || undefined,
        isPublic: newGallery.isPublic,
        allowComments: newGallery.allowComments,
        allowFavorites: newGallery.allowFavorites,
        category: newGallery.category || undefined
      });
      setNewGallery({
        name: '',
        description: '',
        bucketFolder: '',
        bucketName: 'photos',
        password: '',
        isPublic: true,
        allowComments: true,
        allowFavorites: true,
        category: ''
      });
      toast.success(`Galerie "${createdGallery.name}" créée avec succès !`);
      await loadGalleries();
      await loadStats();
      await loadConnectionStatus();
    } catch (error) {
      console.error('Error creating gallery:', error);
      toast.error('Échec de la création de la galerie');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteGallery = async (id: string, name: string) => {
    const confirmed = confirm(
      `Êtes-vous sûr de vouloir supprimer "${name}" ?\n\nCela supprimera définitivement :\n- La galerie\n- Toutes les photos\n- Tous les favoris et commentaires\n\nCette action est irréversible.`
    );
    if (!confirmed) return;

    try {
      const success = await galleryService.deleteGallery(id);
      if (success) {
        toast.success(`Galerie "${name}" supprimée avec succès`);
        await loadGalleries();
        await loadStats();
        await loadConnectionStatus();
      } else {
        toast.error('Échec de la suppression de la galerie');
      }
    } catch (error) {
      console.error('Error deleting gallery:', error);
      toast.error('Échec de la suppression de la galerie');
    }
  };

  const openEditDialog = (gallery: Gallery) => {
    setEditingGallery(gallery);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async (galleryId: string, data: Partial<Gallery>) => {
    const updatedGallery = await galleryService.updateGallery(galleryId, data);
    if (updatedGallery) {
      toast.success(`Galerie "${updatedGallery.name}" mise à jour avec succès`);
      await loadGalleries();
      await loadConnectionStatus();
    } else {
      toast.error('Échec de la mise à jour de la galerie');
      throw new Error('Update failed');
    }
  };

  const handlePhotoUpload = async (galleryId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file =>
      supabaseService.constructor.isValidImageFile(file)
    );

    if (validFiles.length !== fileArray.length) {
      toast.error(`${fileArray.length - validFiles.length} fichiers ignorés (format d'image invalide)`);
    }
    if (validFiles.length === 0) {
      toast.error('Aucun fichier image valide sélectionné');
      return;
    }

    try {
      setUploadingGallery(galleryId);
      setUploadProgress({ completed: 0, total: validFiles.length });

      const selectedSubfolder = uploadSubfolders[galleryId];
      const result = await galleryService.uploadPhotos(galleryId, validFiles, {
        subfolder: selectedSubfolder,
        onProgress: (completed, total) => {
          setUploadProgress({ completed, total });
        }
      });

      if (result.successful.length > 0) {
        const subfolderMsg = selectedSubfolder ? ` dans le sous-dossier "${selectedSubfolder}"` : '';
        toast.success(`${result.successful.length} photos téléchargées avec succès${subfolderMsg}`);
      }
      if (result.failed.length > 0) {
        toast.error(`Échec du téléchargement de ${result.failed.length} photos`);
        console.error('Upload failures:', result.failed);
      }

      await loadGalleries();
      await loadStats();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Échec du téléchargement des photos');
    } finally {
      setUploadingGallery(null);
      setUploadProgress(null);
    }
  };

  const handleSubfolderChange = (galleryId: string, subfolder: string | undefined) => {
    setUploadSubfolders(prev => ({ ...prev, [galleryId]: subfolder }));
  };

  const toggleUploadSection = (galleryId: string) => {
    setShowUploadSections(prev => ({ ...prev, [galleryId]: !prev[galleryId] }));
  };

  // Filtered galleries - search applies in both list and category view
  const filteredGalleries = React.useMemo(() => {
    let filtered = galleries.filter(gallery => {
      const matchesSearch =
        gallery.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gallery.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gallery.bucketFolder?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gallery.category?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    switch (sortBy) {
      case 'name-asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name, 'fr', { sensitivity: 'base' }));
        break;
      case 'date-newest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'date-oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
    }

    return filtered;
  }, [galleries, searchTerm, sortBy]);

  // Group filtered galleries by category for category view
  const galleriesByCategory = React.useMemo(() => {
    const grouped = new Map<string, Gallery[]>();

    filteredGalleries.forEach(gallery => {
      const category = gallery.category || 'Sans catégorie';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(gallery);
    });

    return Array.from(grouped.entries()).sort(([a], [b]) => {
      if (a === 'Sans catégorie') return 1;
      if (b === 'Sans catégorie') return -1;
      return a.localeCompare(b, 'fr', { sensitivity: 'base' });
    });
  }, [filteredGalleries]);

  const formatTimeRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Auth screen
  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="h-10 w-10 text-orange-600" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Admin Panel</h1>
            <p className="text-muted-foreground mb-8">
              Accédez au panneau admin pour gérer les galeries, voir les statistiques et configurer les paramètres.
            </p>
            <div className="bg-card border rounded-lg p-6 mb-6 text-left">
              <h3 className="font-semibold mb-3">Fonctionnalités admin :</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Créer et gérer des galeries photos</li>
                <li>• Intégration du stockage cloud Supabase</li>
                <li>• Télécharger et organiser les photos par sous-dossier</li>
                <li>• Définir une protection par mot de passe pour les galeries</li>
                <li>• Voir les statistiques et analyses</li>
                <li>• Synchroniser les galeries entre appareils</li>
              </ul>
            </div>
            <Button onClick={() => setShowAuthDialog(true)} size="lg">
              <Shield className="h-5 w-5 mr-2" />
              Accéder au panneau admin
            </Button>
          </div>
        </div>

        <AuthDialog
          isOpen={showAuthDialog}
          onClose={() => setShowAuthDialog(false)}
          onAuthenticate={handleAuthentication}
          type="admin"
          title="Authentification Admin"
          description="Entrez le mot de passe administrateur pour accéder au panneau de gestion."
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background-light">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 lg:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2 lg:gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.appRouter.navigateTo('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-1 lg:mr-2" />
                <span className="hidden sm:inline">Retour à l'accueil</span>
                <span className="sm:hidden">Accueil</span>
              </Button>
              <div>
                <h1 className="text-xl lg:text-3xl font-bold flex items-center gap-2 lg:gap-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Shield className="h-4 w-4 lg:h-6 lg:w-6 text-orange-600" />
                  </div>
                  Panneau Admin
                </h1>
                <p className="text-sm lg:text-base text-muted-foreground">
                  Gérer les galeries et les paramètres système
                  {sessionInfo.timeRemaining && (
                    <span className="ml-2 text-xs">
                      • Session expire dans {formatTimeRemaining(sessionInfo.timeRemaining)}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 lg:gap-3">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                <Settings className="h-3 w-3 mr-1" />
                Accès Admin
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Supabase Connecté
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSupabaseConfig(true)}
                title="Configuration Supabase"
              >
                <Database className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1 lg:mr-2" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Quick Access Buttons */}
        <div className="mb-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => window.appRouter.navigateTo('/admin/quote-calculator')}
            className="flex items-center gap-2"
          >
            <Calculator className="h-4 w-4" />
            Calculateur de Devis
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowEmailConfig(true)}
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Config Gmail
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Galeries</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalGalleries}</div>
              <p className="text-xs text-muted-foreground">Synchronisé avec le cloud</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
              <Image className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPhotos}</div>
              <p className="text-xs text-muted-foreground">Depuis le stockage Supabase</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Protégées</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.protectedGalleries}</div>
              <p className="text-xs text-muted-foreground">Protégées par mot de passe</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stockage</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Cloud</div>
              <p className="text-xs text-muted-foreground">Stockage Supabase</p>
            </CardContent>
          </Card>
        </div>

        {/* Galleries List */}
        <Card className="bg-background-light">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Galeries ({filteredGalleries.length})
                </CardTitle>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Sort Selector */}
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-newest">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Plus récent
                      </div>
                    </SelectItem>
                    <SelectItem value="date-oldest">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Plus ancien
                      </div>
                    </SelectItem>
                    <SelectItem value="name-asc">
                      <div className="flex items-center gap-2">
                        <ArrowUpAZ className="h-4 w-4" />
                        A → Z
                      </div>
                    </SelectItem>
                    <SelectItem value="name-desc">
                      <div className="flex items-center gap-2">
                        <ArrowDownAZ className="h-4 w-4" />
                        Z → A
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                  <Button
                    size="sm"
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('list')}
                    className="h-8"
                  >
                    <List className="h-4 w-4 mr-1" />
                    Liste
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === 'category' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('category')}
                    className="h-8"
                  >
                    <LayoutGrid className="h-4 w-4 mr-1" />
                    Par catégorie
                  </Button>
                </div>

                {/* Create Gallery Dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="whitespace-nowrap">
                      <Plus className="h-4 w-4 mr-2" />
                      Créer une galerie
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Créer une nouvelle galerie
                      </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="dialog-name" className="text-sm font-medium">
                          Nom de la galerie *
                        </Label>
                        <Input
                          id="dialog-name"
                          placeholder="ex: Mariage - Jean & Marie"
                          value={newGallery.name}
                          onChange={(e) => setNewGallery(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>

                      <CategorySelector
                        value={newGallery.category || undefined}
                        onChange={(category) => setNewGallery(prev => ({ ...prev, category: category || '' }))}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="dialog-bucketFolder" className="flex items-center gap-2 text-sm font-medium">
                            <Folder className="h-4 w-4" />
                            Dossier Bucket
                          </Label>
                          <Input
                            id="dialog-bucketFolder"
                            placeholder="ex: mariage-jean-marie-2024"
                            value={newGallery.bucketFolder}
                            onChange={(e) => setNewGallery(prev => ({ ...prev, bucketFolder: e.target.value }))}
                          />
                          <p className="text-xs text-muted-foreground">
                            Laisser vide pour génération automatique
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dialog-bucketName" className="text-sm font-medium">
                            Nom du Bucket
                          </Label>
                          <Input
                            id="dialog-bucketName"
                            placeholder="photos"
                            value={newGallery.bucketName}
                            onChange={(e) => setNewGallery(prev => ({ ...prev, bucketName: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dialog-password" className="flex items-center gap-2 text-sm font-medium">
                          <Key className="h-4 w-4" />
                          Protection par mot de passe
                        </Label>
                        <Input
                          id="dialog-password"
                          type="password"
                          placeholder="Laisser vide pour galerie publique"
                          value={newGallery.password}
                          onChange={(e) => setNewGallery(prev => ({ ...prev, password: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dialog-description" className="text-sm font-medium">Description</Label>
                        <Textarea
                          id="dialog-description"
                          placeholder="Description optionnelle de la galerie..."
                          value={newGallery.description}
                          onChange={(e) => setNewGallery(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="dialog-isPublic" className="text-sm font-medium">Galerie Publique</Label>
                          <Switch
                            id="dialog-isPublic"
                            checked={newGallery.isPublic}
                            onCheckedChange={(checked) => setNewGallery(prev => ({ ...prev, isPublic: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="dialog-allowComments" className="text-sm font-medium">Autoriser les commentaires</Label>
                          <Switch
                            id="dialog-allowComments"
                            checked={newGallery.allowComments}
                            onCheckedChange={(checked) => setNewGallery(prev => ({ ...prev, allowComments: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="dialog-allowFavorites" className="text-sm font-medium">Autoriser les favoris</Label>
                          <Switch
                            id="dialog-allowFavorites"
                            checked={newGallery.allowFavorites}
                            onCheckedChange={(checked) => setNewGallery(prev => ({ ...prev, allowFavorites: checked }))}
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <Button onClick={createGallery} disabled={isCreating} className="w-full">
                          {isCreating ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Création...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Créer la galerie
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Search */}
                <div className="relative w-full sm:w-80">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher des galeries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Chargement des galeries...
              </div>
            ) : viewMode === 'category' ? (
              <div className="space-y-6">
                {galleriesByCategory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'Aucune galerie ne correspond à votre recherche.' : 'Aucune galerie créée pour le moment.'}
                  </div>
                ) : (
                  galleriesByCategory.map(([category, categoryGalleries]) => (
                    <div key={category} className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Tag className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">{category}</h3>
                        <Badge variant="secondary" className="ml-2">
                          {categoryGalleries.length}
                        </Badge>
                      </div>
                      <div className="space-y-4">
                        {categoryGalleries.map((gallery) => (
                          <GalleryCard
                            key={gallery.id}
                            gallery={gallery}
                            isUploading={uploadingGallery === gallery.id}
                            uploadProgress={uploadingGallery === gallery.id ? uploadProgress : null}
                            showUploadSection={!!showUploadSections[gallery.id]}
                            selectedSubfolder={uploadSubfolders[gallery.id]}
                            onEdit={openEditDialog}
                            onDelete={deleteGallery}
                            onManagePhotos={setManagingPhotosGallery}
                            onView={(id) => window.appRouter.navigateTo(`/gallery/${id}`)}
                            onToggleUpload={toggleUploadSection}
                            onSubfolderChange={handleSubfolderChange}
                            onPhotoUpload={handlePhotoUpload}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : filteredGalleries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'Aucune galerie ne correspond à votre recherche.' : 'Aucune galerie créée pour le moment.'}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredGalleries.map((gallery) => (
                  <GalleryCard
                    key={gallery.id}
                    gallery={gallery}
                    isUploading={uploadingGallery === gallery.id}
                    uploadProgress={uploadingGallery === gallery.id ? uploadProgress : null}
                    showUploadSection={!!showUploadSections[gallery.id]}
                    selectedSubfolder={uploadSubfolders[gallery.id]}
                    onEdit={openEditDialog}
                    onDelete={deleteGallery}
                    onManagePhotos={setManagingPhotosGallery}
                    onView={(id) => window.appRouter.navigateTo(`/gallery/${id}`)}
                    onToggleUpload={toggleUploadSection}
                    onSubfolderChange={handleSubfolderChange}
                    onPhotoUpload={handlePhotoUpload}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Gallery Dialog */}
      <GalleryEditDialog
        gallery={editingGallery}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditingGallery(null);
        }}
        onSave={handleSaveEdit}
      />

      {/* Photo Manager Modal */}
      {managingPhotosGallery && (
        <PhotoManager
          galleryId={managingPhotosGallery}
          onClose={() => setManagingPhotosGallery(null)}
        />
      )}

      {showEmailConfig && (
        <GmailConfigDialog
          isOpen={showEmailConfig}
          onClose={() => setShowEmailConfig(false)}
        />
      )}

      {/* Supabase Configuration Modal */}
      {showSupabaseConfig && (
        <Dialog open={showSupabaseConfig} onOpenChange={setShowSupabaseConfig}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 109 113" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(#paint0_linear)" />
                  <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(#paint1_linear)" fillOpacity="0.2" />
                  <path d="M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.041L54.4849 72.2922H9.83113C1.64038 72.2922 -2.92775 62.8321 2.1655 56.4175L45.317 2.07103Z" fill="#3ECF8E" />
                  <defs>
                    <linearGradient id="paint0_linear" x1="53.9738" y1="54.974" x2="94.1635" y2="71.8295" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#249361" />
                      <stop offset="1" stopColor="#3ECF8E" />
                    </linearGradient>
                    <linearGradient id="paint1_linear" x1="36.1558" y1="30.578" x2="54.4844" y2="65.0806" gradientUnits="userSpaceOnUse">
                      <stop />
                      <stop offset="1" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
                Configuration Supabase
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Connecté</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {connectionStatus.isTableReady ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                      )}
                      <span className="text-sm">
                        Base de données {connectionStatus.isTableReady ? 'Prête' : 'Configuration requise'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Local: {connectionStatus.localGalleries} galeries</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Cloud: {connectionStatus.remoteGalleries} galeries</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleSyncFromSupabase} disabled={isSyncing} variant="outline">
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Synchronisation...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Synchroniser depuis le Cloud
                    </>
                  )}
                </Button>
                <Button onClick={loadConnectionStatus} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Rafraîchir le statut
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Votre application est connectée au stockage cloud Supabase pour la synchronisation des galeries et la gestion des photos.</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

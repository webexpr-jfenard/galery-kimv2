import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { galleryService } from "../../services/galleryService";
import { authService } from "../../services/authService";
import { supabaseService } from "../../services/supabaseService";
import type { Gallery } from "../../services/galleryService";

import { AdminLayout } from "./AdminLayout";
import { AdminLogin } from "./AdminLogin";
import { GalleryStats } from "./GalleryStats";
import { GalleryToolbar } from "./GalleryToolbar";
import { GalleryListItem } from "./GalleryListItem";
import { GalleryGridCard } from "./GalleryGridCard";
import { CreateGalleryDialog } from "./CreateGalleryDialog";
import { GalleryEditDialog } from "../GalleryEditDialog";
import { PhotoManager } from "../PhotoManager";
import { GmailConfigDialog } from "../GmailConfigDialog";
import { UploadZone } from "./UploadZone";
import { SettingsPage } from "./SettingsPage";
import { QuoteCalculator } from "../QuoteCalculator";

import { RefreshCw, FolderOpen } from "lucide-react";

export function AdminPanel() {
  // Auth
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{ timeRemaining?: number }>({});

  // Navigation
  const [currentPage, setCurrentPage] = useState("galleries");

  // Gallery state
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "date-newest" | "date-oldest">("date-newest");

  // Create dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Edit dialog
  const [editingGallery, setEditingGallery] = useState<Gallery | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Photo management
  const [managingPhotosGallery, setManagingPhotosGallery] = useState<string | null>(null);

  // Upload - separate "show zone" from "is uploading"
  const [showUploadForGallery, setShowUploadForGallery] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ completed: number; total: number } | null>(null);
  const [uploadSubfolders, setUploadSubfolders] = useState<Record<string, string | undefined>>({});

  // Config dialogs
  const [showEmailConfig, setShowEmailConfig] = useState(false);

  // Stats
  const [stats, setStats] = useState({ totalGalleries: 0, totalPhotos: 0, protectedGalleries: 0 });

  // Supabase
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false, isTableReady: false, localGalleries: 0, remoteGalleries: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Init
  useEffect(() => {
    const isAuth = authService.isAdminAuthenticated();
    if (isAuth) {
      setIsAuthenticated(true);
      loadGalleries();
      loadStats();
      loadConnectionStatus();
      setSessionInfo(authService.getSessionInfo());
    }
  }, []);

  // Session timer
  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setInterval(() => {
      const data = authService.getSessionInfo();
      setSessionInfo(data);
      if (!data.isAuthenticated) handleLogout();
      if (data.timeRemaining && data.timeRemaining < 5 * 60 * 1000 && data.timeRemaining > 4 * 60 * 1000) {
        toast.warning("Session expire dans 5 minutes");
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [isAuthenticated]);

  // Auth handlers
  const handleAuthentication = async (password: string): Promise<boolean> => {
    const isValid = authService.authenticateAdmin(password);
    if (isValid) {
      setIsAuthenticated(true);
      loadGalleries();
      loadStats();
      loadConnectionStatus();
      setSessionInfo(authService.getSessionInfo());
      toast.success("Connecté avec succès");
    }
    return isValid;
  };

  const handleLogout = () => {
    authService.clearAdminSession();
    setIsAuthenticated(false);
    setGalleries([]);
    setStats({ totalGalleries: 0, totalPhotos: 0, protectedGalleries: 0 });
    toast.success("Déconnecté");
  };

  // Data loaders
  const loadGalleries = async () => {
    try {
      setIsLoading(true);
      const list = await galleryService.getGalleries();
      setGalleries(list || []);
    } catch (error) {
      console.error("Error loading galleries:", error);
      toast.error("Échec du chargement des galeries");
      setGalleries([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const list = await galleryService.getGalleries();
      let totalPhotos = 0;
      let protectedGalleries = 0;
      for (const gallery of list || []) {
        const s = await galleryService.getGalleryStats(gallery.id);
        totalPhotos += s.photoCount;
        if (gallery.password) protectedGalleries++;
      }
      setStats({ totalGalleries: list?.length || 0, totalPhotos, protectedGalleries });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadConnectionStatus = async () => {
    try {
      const isReady = galleryService.isSupabaseConfigured();
      setConnectionStatus({
        isConnected: isReady, isTableReady: isReady,
        localGalleries: galleries.length, remoteGalleries: galleries.length,
      });
    } catch (error) {
      console.error("Error loading connection status:", error);
    }
  };

  // Gallery CRUD
  const handleCreateGallery = async (data: {
    name: string; description: string; bucketFolder: string; bucketName: string;
    password: string; isPublic: boolean; allowComments: boolean; allowFavorites: boolean; category: string;
  }) => {
    try {
      setIsCreating(true);
      const created = await galleryService.createGallery({
        name: data.name,
        description: data.description || undefined,
        bucketFolder: data.bucketFolder || undefined,
        bucketName: data.bucketName || "photos",
        password: data.password || undefined,
        isPublic: data.isPublic,
        allowComments: data.allowComments,
        allowFavorites: data.allowFavorites,
        category: data.category || undefined,
      });
      toast.success(`Galerie "${created.name}" créée`);
      setShowCreateDialog(false);
      await loadGalleries();
      await loadStats();
    } catch (error) {
      console.error("Error creating gallery:", error);
      toast.error("Échec de la création");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteGallery = async (id: string, name: string) => {
    const confirmed = confirm(
      `Supprimer "${name}" ?\n\nCela supprimera définitivement la galerie, toutes les photos, favoris et commentaires.\n\nCette action est irréversible.`
    );
    if (!confirmed) return;
    try {
      const success = await galleryService.deleteGallery(id);
      if (success) {
        toast.success(`"${name}" supprimée`);
        await loadGalleries();
        await loadStats();
      } else {
        toast.error("Échec de la suppression");
      }
    } catch (error) {
      console.error("Error deleting gallery:", error);
      toast.error("Échec de la suppression");
    }
  };

  const handleSaveEdit = async (galleryId: string, data: Partial<Gallery>) => {
    const updated = await galleryService.updateGallery(galleryId, data);
    if (updated) {
      toast.success(`"${updated.name}" mise à jour`);
      await loadGalleries();
    } else {
      toast.error("Échec de la mise à jour");
      throw new Error("Update failed");
    }
  };

  // Upload
  const handleToggleUpload = (galleryId: string) => {
    setShowUploadForGallery(prev => prev === galleryId ? null : galleryId);
  };

  const handlePhotoUpload = async (galleryId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter((f) => (supabaseService.constructor as any).isValidImageFile(f));

    if (validFiles.length !== fileArray.length) {
      toast.error(`${fileArray.length - validFiles.length} fichiers ignorés (format invalide)`);
    }
    if (validFiles.length === 0) {
      toast.error("Aucun fichier image valide");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress({ completed: 0, total: validFiles.length });
      const subfolder = uploadSubfolders[galleryId];
      const result = await galleryService.uploadPhotos(galleryId, validFiles, {
        subfolder,
        onProgress: (completed, total) => setUploadProgress({ completed, total }),
      });
      if (result.successful.length > 0) {
        const msg = subfolder ? ` dans "${subfolder}"` : "";
        toast.success(`${result.successful.length} photos uploadées${msg}`);
      }
      if (result.failed.length > 0) {
        toast.error(`${result.failed.length} échecs`);
      }
      await loadGalleries();
      await loadStats();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Échec de l'upload");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Sync
  const handleSyncFromSupabase = async () => {
    try {
      setIsSyncing(true);
      const result = await galleryService.syncFromSupabase();
      if (result.success) {
        toast.success(`${result.count} galeries synchronisées`);
        await loadGalleries();
        await loadStats();
        await loadConnectionStatus();
      } else {
        toast.error(result.error || "Échec de la synchronisation");
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Échec de la synchronisation");
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtered + sorted galleries
  const filteredGalleries = useMemo(() => {
    let filtered = galleries.filter((g) => {
      const term = searchTerm.toLowerCase();
      return (
        g.name.toLowerCase().includes(term) ||
        g.id.toLowerCase().includes(term) ||
        g.bucketFolder?.toLowerCase().includes(term) ||
        g.category?.toLowerCase().includes(term)
      );
    });

    switch (sortBy) {
      case "name-asc":
        filtered.sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
        break;
      case "name-desc":
        filtered.sort((a, b) => b.name.localeCompare(a.name, "fr", { sensitivity: "base" }));
        break;
      case "date-newest":
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "date-oldest":
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
    }
    return filtered;
  }, [galleries, searchTerm, sortBy]);

  // Auth screen
  if (!isAuthenticated) {
    return <AdminLogin onAuthenticate={handleAuthentication} />;
  }

  // Page content
  const renderPage = () => {
    switch (currentPage) {
      case "quotes":
        return <QuoteCalculator />;

      case "settings":
        return (
          <SettingsPage
            connectionStatus={connectionStatus}
            isSyncing={isSyncing}
            onSync={handleSyncFromSupabase}
            onRefreshStatus={loadConnectionStatus}
            onOpenEmailConfig={() => setShowEmailConfig(true)}
          />
        );

      default:
        return (
          <div className="space-y-6">
            {/* Stats bar */}
            <GalleryStats
              totalGalleries={stats.totalGalleries}
              totalPhotos={stats.totalPhotos}
              protectedGalleries={stats.protectedGalleries}
            />

            {/* Toolbar */}
            <GalleryToolbar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onCreateClick={() => setShowCreateDialog(true)}
              totalCount={filteredGalleries.length}
            />

            {/* Gallery list/grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                <span className="text-[14px]">Chargement...</span>
              </div>
            ) : filteredGalleries.length === 0 ? (
              <div className="text-center py-16">
                <FolderOpen className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-[14px] text-gray-400">
                  {searchTerm
                    ? "Aucune galerie ne correspond à votre recherche."
                    : "Aucune galerie pour le moment."}
                </p>
              </div>
            ) : viewMode === "list" ? (
              <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
                {filteredGalleries.map((gallery) => (
                  <React.Fragment key={gallery.id}>
                    <GalleryListItem
                      gallery={gallery}
                      onEdit={(g) => { setEditingGallery(g); setIsEditDialogOpen(true); }}
                      onDelete={handleDeleteGallery}
                      onManagePhotos={setManagingPhotosGallery}
                      onView={(id) => window.appRouter.navigateTo(`/gallery/${id}`)}
                      onToggleUpload={handleToggleUpload}
                    />
                    {showUploadForGallery === gallery.id && (
                      <div className="px-4 py-3 bg-[#FAFAFA]">
                        <UploadZone
                          galleryId={gallery.id}
                          isUploading={isUploading}
                          uploadProgress={uploadProgress}
                          selectedSubfolder={uploadSubfolders[gallery.id]}
                          onSubfolderChange={(sf) =>
                            setUploadSubfolders((prev) => ({ ...prev, [gallery.id]: sf }))
                          }
                          onPhotoUpload={handlePhotoUpload}
                          onClose={() => { if (!isUploading) setShowUploadForGallery(null); }}
                        />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGalleries.map((gallery) => (
                  <div key={gallery.id}>
                    <GalleryGridCard
                      gallery={gallery}
                      onEdit={(g) => { setEditingGallery(g); setIsEditDialogOpen(true); }}
                      onDelete={handleDeleteGallery}
                      onManagePhotos={setManagingPhotosGallery}
                      onView={(id) => window.appRouter.navigateTo(`/gallery/${id}`)}
                      onToggleUpload={handleToggleUpload}
                    />
                    {showUploadForGallery === gallery.id && (
                      <div className="mt-2">
                        <UploadZone
                          galleryId={gallery.id}
                          isUploading={isUploading}
                          uploadProgress={uploadProgress}
                          selectedSubfolder={uploadSubfolders[gallery.id]}
                          onSubfolderChange={(sf) =>
                            setUploadSubfolders((prev) => ({ ...prev, [gallery.id]: sf }))
                          }
                          onPhotoUpload={handlePhotoUpload}
                          onClose={() => { if (!isUploading) setShowUploadForGallery(null); }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <>
      <AdminLayout
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
        sessionTimeRemaining={sessionInfo.timeRemaining}
      >
        {renderPage()}
      </AdminLayout>

      {/* Dialogs */}
      <CreateGalleryDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreate={handleCreateGallery}
        isCreating={isCreating}
      />

      <GalleryEditDialog
        gallery={editingGallery}
        isOpen={isEditDialogOpen}
        onClose={() => { setIsEditDialogOpen(false); setEditingGallery(null); }}
        onSave={handleSaveEdit}
      />

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
    </>
  );
}

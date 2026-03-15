import React, { useCallback, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { SubfolderSelector } from "./SubfolderSelector";
import {
  Eye,
  FileImage,
  Upload,
  Edit,
  Trash2,
  ChevronDown,
  Folder,
  Key,
  Star,
  RefreshCw,
  Tag
} from "lucide-react";
import type { Gallery } from "../services/galleryService";

interface UploadProgress {
  completed: number;
  total: number;
}

interface GalleryCardProps {
  gallery: Gallery;
  isUploading: boolean;
  uploadProgress: UploadProgress | null;
  showUploadSection: boolean;
  selectedSubfolder: string | undefined;
  onEdit: (gallery: Gallery) => void;
  onDelete: (id: string, name: string) => void;
  onManagePhotos: (galleryId: string) => void;
  onView: (galleryId: string) => void;
  onToggleUpload: (galleryId: string) => void;
  onSubfolderChange: (galleryId: string, subfolder: string | undefined) => void;
  onPhotoUpload: (galleryId: string, files: FileList | null) => void;
}

export function GalleryCard({
  gallery,
  isUploading,
  uploadProgress,
  showUploadSection,
  selectedSubfolder,
  onEdit,
  onDelete,
  onManagePhotos,
  onView,
  onToggleUpload,
  onSubfolderChange,
  onPhotoUpload
}: GalleryCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        onPhotoUpload(gallery.id, files);
      }
    },
    [gallery.id, onPhotoUpload]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onPhotoUpload(gallery.id, e.target.files);
      // Reset input so the same files can be re-selected if needed
      e.target.value = '';
    },
    [gallery.id, onPhotoUpload]
  );

  return (
    <div className="border rounded-lg p-4 lg:p-6 space-y-4 bg-background">
      {/* Gallery info row */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex gap-4 flex-1 min-w-0">
          {/* Thumbnail */}
          {gallery.featuredPhotoUrl ? (
            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-lg overflow-hidden border-2 border-orange-300 shrink-0 relative">
              <img
                src={gallery.featuredPhotoUrl}
                alt={`Photo vedette de ${gallery.name}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-1 right-1">
                <Badge className="bg-orange-600 text-white text-xs px-1 py-0.5">
                  <Star className="h-2 w-2 mr-0.5 fill-current" />
                </Badge>
              </div>
            </div>
          ) : (
            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-lg bg-muted border-2 border-dashed border-muted-foreground/30 shrink-0 flex items-center justify-center">
              <FileImage className="h-8 w-8 lg:h-10 lg:w-10 text-muted-foreground/50" />
            </div>
          )}

          {/* Metadata */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold truncate">{gallery.name}</h3>
              <div className="flex gap-2 shrink-0">
                {gallery.category && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    <Tag className="h-3 w-3 mr-1" />
                    {gallery.category}
                  </Badge>
                )}
                {gallery.password && (
                  <Badge variant="secondary">
                    <Key className="h-3 w-3 mr-1" />
                    Protégée
                  </Badge>
                )}
                <Badge variant="outline">
                  ID: {gallery.id}
                </Badge>
              </div>
            </div>

            {gallery.description && (
              <p className="text-sm text-muted-foreground mb-2">{gallery.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>{gallery.photoCount || 0} photos</span>
              {gallery.bucketFolder && (
                <span className="flex items-center gap-1">
                  <Folder className="h-3 w-3" />
                  {gallery.bucketFolder}
                </span>
              )}
              <span>{gallery.isPublic ? 'Publique' : 'Privée'}</span>
              <span>Créée le {new Date(gallery.createdAt).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onView(gallery.id)}
            title="Voir la galerie"
          >
            <Eye className="h-4 w-4 mr-2" />
            Voir
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onManagePhotos(gallery.id)}
            title="Gérer les photos"
          >
            <FileImage className="h-4 w-4 mr-2" />
            Gérer les photos
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onToggleUpload(gallery.id)}
            title="Ajouter des photos"
          >
            <Upload className="h-4 w-4" />
            <ChevronDown
              className={`h-4 w-4 ml-1 transition-transform ${showUploadSection ? 'rotate-180' : ''}`}
            />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => onEdit(gallery)}
            title="Modifier"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => onDelete(gallery.id, gallery.name)}
            className="text-destructive hover:text-destructive"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Upload Section */}
      {showUploadSection && (
        <div className="border-t pt-4">
          <div className="space-y-4">
            {/* Drag-and-drop zone */}
            <div
              className={`rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                isDragOver
                  ? 'border-primary bg-primary/5'
                  : isUploading
                  ? 'border-muted bg-muted/50 cursor-not-allowed'
                  : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={isUploading ? undefined : handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <Upload
                  className={`h-8 w-8 mb-2 ${
                    isDragOver ? 'text-primary' : 'text-muted-foreground/50'
                  }`}
                />
                <p className="text-sm font-medium text-muted-foreground">
                  {isUploading
                    ? 'Téléchargement en cours...'
                    : 'Glissez vos photos ici ou cliquez pour sélectionner'}
                </p>
                {selectedSubfolder && !isUploading && (
                  <p className="text-xs text-blue-600 mt-1">
                    Destination : sous-dossier &quot;{selectedSubfolder}&quot;
                  </p>
                )}
                {!selectedSubfolder && !isUploading && (
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Destination : racine de la galerie
                  </p>
                )}
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
              disabled={isUploading}
            />

            {/* Subfolder selector */}
            <SubfolderSelector
              galleryId={gallery.id}
              selectedSubfolder={selectedSubfolder}
              onSubfolderChange={(subfolder) => onSubfolderChange(gallery.id, subfolder)}
              disabled={isUploading}
            />

            {/* Upload progress */}
            {isUploading && uploadProgress && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Téléchargement {uploadProgress.completed}/{uploadProgress.total}
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(uploadProgress.completed / uploadProgress.total) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

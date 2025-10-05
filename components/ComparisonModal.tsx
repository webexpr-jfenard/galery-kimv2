import React, { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  X,
  Heart,
  Maximize2,
  Minimize2
} from "lucide-react";
import type { Photo } from "../services/galleryService";
import type { FavoritePhoto } from "../services/favoritesService";

interface ComparisonModalProps {
  photos: Photo[];
  selectedPhotos: Set<string>;
  onClose: () => void;
  favorites: Set<string>;
  favoriteDetails: FavoritePhoto[];
  commentCounts: Record<string, number>;
  comments: any[];
  onToggleFavorite: (photoId: string) => void;
  onAddComment: (photoId: string, comment: string) => void;
}

export function ComparisonModal({
  photos,
  selectedPhotos,
  onClose,
  favorites,
  favoriteDetails,
  onToggleFavorite
}: ComparisonModalProps) {
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  // Get photos to display (only selected ones)
  const displayPhotos = photos.filter(p => selectedPhotos.has(p.id));

  // Get photo display name
  const getPhotoDisplayName = (photo: Photo) => {
    return photo.originalName || photo.name;
  };

  if (displayPhotos.length === 0) {
    return null;
  }

  const isAnyExpanded = expandedPhoto !== null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Mode Comparaison
          </h2>
          <Badge variant="secondary" className="text-sm">
            {displayPhotos.length} photo{displayPhotos.length > 1 ? 's' : ''}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-gray-900 hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        <div className={`grid gap-6 ${
          isAnyExpanded ? 'grid-cols-1' :
          displayPhotos.length === 1 ? 'grid-cols-1' :
          displayPhotos.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
          displayPhotos.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}>
          {displayPhotos.map((photo) => {
            const isExpanded = expandedPhoto === photo.id;
            const isFavorite = favorites.has(photo.id);
            const photoFavorites = favoriteDetails.filter(f => f.photoId === photo.id);

            // Don't render non-expanded photos when one is expanded
            if (isAnyExpanded && !isExpanded) {
              return null;
            }

            return (
              <div
                key={photo.id}
                className="bg-white rounded-lg shadow-sm border overflow-hidden"
              >
                {/* Photo Container */}
                <div className="relative bg-gray-100 flex items-center justify-center"
                  style={{
                    height: isExpanded ? 'calc(100vh - 180px)' : '400px',
                    maxHeight: isExpanded ? 'calc(100vh - 180px)' : '400px'
                  }}
                >
                  <img
                    src={photo.url}
                    alt={getPhotoDisplayName(photo)}
                    className="w-full h-full object-contain"
                  />

                  {/* Expand/Collapse Button */}
                  <button
                    onClick={() => setExpandedPhoto(isExpanded ? null : photo.id)}
                    className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-lg shadow-md transition-colors"
                    title={isExpanded ? "Réduire" : "Agrandir"}
                  >
                    {isExpanded ? (
                      <Minimize2 className="h-4 w-4 text-gray-700" />
                    ) : (
                      <Maximize2 className="h-4 w-4 text-gray-700" />
                    )}
                  </button>
                </div>

                {/* Photo Info - Compact */}
                <div className="p-4 space-y-2">
                  {/* Photo Name & Favorite in one row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-gray-900 truncate flex-1">
                      {getPhotoDisplayName(photo)}
                    </div>

                    {/* Favorite Button - Compact */}
                    <Button
                      variant={isFavorite ? "default" : "outline"}
                      size="sm"
                      onClick={() => onToggleFavorite(photo.id)}
                      className="flex items-center gap-1.5 shrink-0"
                    >
                      <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                      {photoFavorites.length > 0 && (
                        <span className="text-xs">{photoFavorites.length}</span>
                      )}
                    </Button>
                  </div>

                  {/* Favorite Users List - Compact */}
                  {photoFavorites.length > 0 && (
                    <div className="text-xs text-gray-500">
                      {photoFavorites.map(f => f.userName).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

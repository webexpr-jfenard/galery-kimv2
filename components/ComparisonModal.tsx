import React, { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  X,
  Heart,
  Maximize2,
  Minimize2,
  GripVertical
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

  // Get photos to display (only selected ones) and maintain order
  const initialPhotos = photos.filter(p => selectedPhotos.has(p.id));
  const [orderedPhotos, setOrderedPhotos] = useState<Photo[]>(initialPhotos);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Get photo display name
  const getPhotoDisplayName = (photo: Photo) => {
    return photo.originalName || photo.name;
  };

  // Handle drag and drop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newPhotos = [...orderedPhotos];
    const draggedPhoto = newPhotos[draggedIndex];
    newPhotos.splice(draggedIndex, 1);
    newPhotos.splice(index, 0, draggedPhoto);

    setOrderedPhotos(newPhotos);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (orderedPhotos.length === 0) {
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
            {orderedPhotos.length} photo{orderedPhotos.length > 1 ? 's' : ''}
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
      <div className="flex-1 overflow-auto bg-gray-50">
        {isAnyExpanded ? (
          // Expanded view - single photo
          <div className="h-full p-6">
            {orderedPhotos.map((photo) => {
              const isExpanded = expandedPhoto === photo.id;
              if (!isExpanded) return null;

              const isFavorite = favorites.has(photo.id);
              const photoFavorites = favoriteDetails.filter(f => f.photoId === photo.id);

              return (
                <div key={photo.id} className="h-full">
                  {/* Photo Container - Full height with overlays */}
                  <div className="h-full relative bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden group">
                    <img
                      src={photo.url}
                      alt={getPhotoDisplayName(photo)}
                      className="max-w-full max-h-full object-contain"
                    />

                    {/* Photo Name Overlay - Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="text-white font-medium drop-shadow-lg">
                        {getPhotoDisplayName(photo)}
                      </div>
                      {photoFavorites.length > 0 && (
                        <div className="text-white/80 text-xs mt-1">
                          {photoFavorites.map(f => f.userName).join(', ')}
                        </div>
                      )}
                    </div>

                    {/* Top Right Controls */}
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      {/* Favorite Button - Style like gallery */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(photo.id);
                        }}
                        className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all ${
                          isFavorite
                            ? 'bg-green-500/95 hover:bg-green-600'
                            : 'bg-white/95 hover:bg-white'
                        }`}
                        style={{
                          backdropFilter: 'blur(8px)'
                        }}
                        title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      >
                        <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current text-white' : 'text-gray-600'}`} />
                      </button>

                      {/* Favorite Count Badge */}
                      {photoFavorites.length > 1 && (
                        <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                          {photoFavorites.length}
                        </div>
                      )}

                      {/* Collapse Button */}
                      <button
                        onClick={() => setExpandedPhoto(null)}
                        className="w-9 h-9 rounded-full flex items-center justify-center bg-white/95 hover:bg-white shadow-md transition-all ml-2"
                        style={{
                          backdropFilter: 'blur(8px)'
                        }}
                        title="Réduire"
                      >
                        <Minimize2 className="h-4 w-4 text-gray-700" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Horizontal scroll view - multiple photos aligned to top
          <div className="p-6 h-full">
            <div className="flex gap-6 overflow-x-auto h-full items-start">
              {orderedPhotos.map((photo, index) => {
                const isFavorite = favorites.has(photo.id);
                const photoFavorites = favoriteDetails.filter(f => f.photoId === photo.id);

                return (
                  <div
                    key={photo.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex-shrink-0 bg-white rounded-lg shadow-sm border overflow-hidden transition-all inline-block ${
                      draggedIndex === index ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Drag Handle */}
                    <div className="bg-gray-50 px-3 py-2 border-b flex items-center gap-2 cursor-move">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-gray-500">Glisser pour réorganiser</span>
                    </div>

                    {/* Photo Container - Height fills available space, width auto */}
                    <div
                      className="relative bg-gray-100 group"
                      style={{
                        height: 'calc(100vh - 280px)',
                        maxHeight: 'calc(100vh - 280px)'
                      }}
                    >
                      <img
                        src={photo.url}
                        alt={getPhotoDisplayName(photo)}
                        className="h-full w-auto object-contain mx-auto"
                      />

                      {/* Photo Name Overlay - Bottom */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="text-white font-medium text-sm drop-shadow-lg">
                          {getPhotoDisplayName(photo)}
                        </div>
                        {photoFavorites.length > 0 && (
                          <div className="text-white/80 text-xs mt-1">
                            {photoFavorites.map(f => f.userName).join(', ')}
                          </div>
                        )}
                      </div>

                      {/* Top Right Controls */}
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        {/* Favorite Button - Style like gallery */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(photo.id);
                          }}
                          className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all ${
                            isFavorite
                              ? 'bg-green-500/95 hover:bg-green-600'
                              : 'bg-white/95 hover:bg-white'
                          }`}
                          style={{
                            backdropFilter: 'blur(8px)'
                          }}
                          title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        >
                          <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current text-white' : 'text-gray-600'}`} />
                        </button>

                        {/* Favorite Count Badge */}
                        {photoFavorites.length > 1 && (
                          <div className="absolute -bottom-1 -right-1 bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                            {photoFavorites.length}
                          </div>
                        )}

                        {/* Expand Button */}
                        <button
                          onClick={() => setExpandedPhoto(photo.id)}
                          className="w-9 h-9 rounded-full flex items-center justify-center bg-white/95 hover:bg-white shadow-md transition-all ml-2"
                          style={{
                            backdropFilter: 'blur(8px)'
                          }}
                          title="Agrandir"
                        >
                          <Maximize2 className="h-4 w-4 text-gray-700" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

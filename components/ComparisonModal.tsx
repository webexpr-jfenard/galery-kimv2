import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  X,
  Heart,
  MessageSquare,
  Send,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2
} from "lucide-react";
import type { Photo } from "../services/galleryService";
import type { FavoritePhoto, Comment } from "../services/favoritesService";
import { userService } from "../services/userService";

interface ComparisonModalProps {
  photos: Photo[];
  selectedPhotos: Set<string>;
  onClose: () => void;
  favorites: Set<string>;
  favoriteDetails: FavoritePhoto[];
  commentCounts: Record<string, number>;
  comments: Comment[];
  onToggleFavorite: (photoId: string) => void;
  onAddComment: (photoId: string, comment: string) => void;
}

export function ComparisonModal({
  photos,
  selectedPhotos,
  onClose,
  favorites,
  favoriteDetails,
  commentCounts,
  comments,
  onToggleFavorite,
  onAddComment
}: ComparisonModalProps) {
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});

  // Get photos to display (only selected ones)
  const displayPhotos = photos.filter(p => selectedPhotos.has(p.id));

  // Get photo display name
  const getPhotoDisplayName = (photo: Photo) => {
    return photo.originalName || photo.name;
  };

  // Handle comment submit
  const handleCommentSubmit = (photoId: string) => {
    const comment = commentInputs[photoId]?.trim();
    if (comment) {
      onAddComment(photoId, comment);
      setCommentInputs(prev => ({ ...prev, [photoId]: '' }));
    }
  };

  // Get photo comments
  const getPhotoComments = (photoId: string) => {
    return comments.filter(c => c.photoId === photoId);
  };

  // Toggle comments visibility
  const toggleComments = (photoId: string) => {
    setShowComments(prev => ({ ...prev, [photoId]: !prev[photoId] }));
  };

  if (displayPhotos.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-white">
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
          className="text-white hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className={`grid gap-4 h-full ${
          displayPhotos.length === 1 ? 'grid-cols-1' :
          displayPhotos.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
          displayPhotos.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}>
          {displayPhotos.map((photo) => {
            const isExpanded = expandedPhoto === photo.id;
            const isFavorite = favorites.has(photo.id);
            const photoFavorites = favoriteDetails.filter(f => f.photoId === photo.id);
            const photoCommentsCount = commentCounts[photo.id] || 0;
            const photoCommentsList = getPhotoComments(photo.id);
            const showPhotoComments = showComments[photo.id] || false;

            return (
              <div
                key={photo.id}
                className={`relative bg-gray-900 rounded-lg overflow-hidden transition-all ${
                  isExpanded ? 'col-span-full row-span-full' : ''
                }`}
              >
                {/* Photo */}
                <div className="relative aspect-video bg-black flex items-center justify-center">
                  <img
                    src={photo.url}
                    alt={getPhotoDisplayName(photo)}
                    className="max-w-full max-h-full object-contain"
                  />

                  {/* Expand/Collapse Button */}
                  <button
                    onClick={() => setExpandedPhoto(isExpanded ? null : photo.id)}
                    className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
                    title={isExpanded ? "Réduire" : "Agrandir"}
                  >
                    {isExpanded ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Photo Info & Actions */}
                <div className="p-4 space-y-3">
                  {/* Photo Name */}
                  <div className="text-white font-medium truncate">
                    {getPhotoDisplayName(photo)}
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-2">
                    {/* Favorite Button */}
                    <Button
                      variant={isFavorite ? "default" : "outline"}
                      size="sm"
                      onClick={() => onToggleFavorite(photo.id)}
                      className="flex items-center gap-2"
                    >
                      <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                      {photoFavorites.length > 0 && (
                        <span className="text-xs">{photoFavorites.length}</span>
                      )}
                    </Button>

                    {/* Comments Button */}
                    <Button
                      variant={showPhotoComments ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleComments(photo.id)}
                      className="flex items-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      {photoCommentsCount > 0 && (
                        <span className="text-xs">{photoCommentsCount}</span>
                      )}
                    </Button>
                  </div>

                  {/* Comment Input */}
                  {userService.isUserLoggedIn() && (
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Ajouter un commentaire..."
                        value={commentInputs[photo.id] || ''}
                        onChange={(e) => setCommentInputs(prev => ({
                          ...prev,
                          [photo.id]: e.target.value
                        }))}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleCommentSubmit(photo.id);
                          }
                        }}
                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                      />
                      <Button
                        size="icon"
                        onClick={() => handleCommentSubmit(photo.id)}
                        disabled={!commentInputs[photo.id]?.trim()}
                        className="shrink-0"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Comments List */}
                  {showPhotoComments && photoCommentsList.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {photoCommentsList.map((comment) => (
                        <div
                          key={comment.id}
                          className="bg-gray-800 rounded-lg p-3 text-sm"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-white">
                              {comment.userName}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(comment.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-gray-300">{comment.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Favorite Users List */}
                  {photoFavorites.length > 0 && (
                    <div className="text-xs text-gray-400">
                      Aimé par: {photoFavorites.map(f => f.userName).join(', ')}
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

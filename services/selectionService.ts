import { favoritesService } from './favoritesService';
import { galleryService } from './galleryService';
import { userService } from './userService';
import { gmailService } from './gmailService';

export interface SelectionResult {
  success: boolean;
  /** true when the photographer's e-mail notification was accepted by the server */
  notified?: boolean;
  notificationError?: string;
  messageId?: string;
  fileName?: string;
  /** Local object URL of the selection file, for the visitor's own download */
  blobUrl?: string;
  error?: string;
}

interface SelectionExport {
  galleryId: string;
  galleryName: string;
  exportDate: string;
  selectedPhotos: {
    photoId: string;
    photoName: string;
    originalName: string;
    url: string;
    comments: string[];
  }[];
  totalSelected: number;
  clientInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  multiUserData?: {
    photoId: string;
    users: { userName?: string; userId?: string }[];
    comments: { comment: string; userName?: string }[];
  }[];
}

class SelectionService {
  // Generate selection summary text
  private generateSelectionText(exportData: SelectionExport): string {
    const lines: string[] = [];
    
    lines.push('='.repeat(60));
    lines.push('SÉLECTION CLIENT - GALERIE PHOTO');
    lines.push('='.repeat(60));
    lines.push('');
    
    lines.push(`Galerie: ${exportData.galleryName}`);
    lines.push(`ID Galerie: ${exportData.galleryId}`);
    lines.push(`Date d'export: ${exportData.exportDate}`);
    lines.push(`Total photos sélectionnées: ${exportData.totalSelected}`);
    lines.push('');
    
    if (exportData.clientInfo && (exportData.clientInfo.name || exportData.clientInfo.email)) {
      lines.push('INFORMATIONS CLIENT:');
      lines.push('-'.repeat(30));
      if (exportData.clientInfo.name) {
        lines.push(`Nom: ${exportData.clientInfo.name}`);
      }
      if (exportData.clientInfo.email) {
        lines.push(`Email: ${exportData.clientInfo.email}`);
      }
      if (exportData.clientInfo.phone) {
        lines.push(`Téléphone: ${exportData.clientInfo.phone}`);
      }
      lines.push('');
    }
    
    lines.push('PHOTOS SÉLECTIONNÉES:');
    lines.push('-'.repeat(30));
    
    exportData.selectedPhotos.forEach((photo, index) => {
      lines.push(`${index + 1}. ${photo.photoName}`);
      if (photo.originalName !== photo.photoName) {
        lines.push(`   Fichier original: ${photo.originalName}`);
      }
      lines.push(`   URL: ${photo.url}`);
      
      if (photo.comments && photo.comments.length > 0) {
        lines.push(`   Commentaires:`);
        photo.comments.forEach(comment => {
          lines.push(`   - ${comment}`);
        });
      }
      lines.push('');
    });

    if (exportData.multiUserData && exportData.multiUserData.length > 0) {
      lines.push('DÉTAILS PAR UTILISATEUR:');
      lines.push('-'.repeat(30));
      
      exportData.multiUserData.forEach(photoData => {
        const photo = exportData.selectedPhotos.find(p => p.photoId === photoData.photoId);
        if (photo) {
          lines.push(`Photo: ${photo.photoName}`);
          
          if (photoData.users.length > 0) {
            lines.push(`Sélectionnée par: ${photoData.users.map(u => u.userName || 'Utilisateur anonyme').join(', ')}`);
          }
          
          if (photoData.comments.length > 0) {
            lines.push(`Commentaires détaillés:`);
            photoData.comments.forEach(c => {
              lines.push(`- ${c.comment} (${c.userName || 'Anonyme'})`);
            });
          }
          lines.push('');
        }
      });
    }
    
    lines.push('='.repeat(60));
    lines.push('Fin de la sélection');
    lines.push('='.repeat(60));
    
    return lines.join('\n');
  }

  // Main export function
  async exportSelection(
    galleryId: string,
    clientName?: string,
    clientEmail?: string,
    clientPhone?: string,
    isCompleteSelection: boolean = false
  ): Promise<SelectionResult> {
    try {
      console.log('Starting selection export for gallery:', galleryId);

      // Get gallery info
      const gallery = await galleryService.getGallery(galleryId);
      const galleryName = gallery?.name || galleryId;

      // Get all favorites for this gallery
      const favorites = await favoritesService.getFavorites(galleryId);
      
      if (!favorites || favorites.length === 0) {
        return {
          success: false,
          error: 'Aucune photo sélectionnée trouvée pour cette galerie'
        };
      }

      // Filter by current user if not complete selection
      const currentUserId = userService.getCurrentUserId();
      const filteredFavorites = isCompleteSelection 
        ? favorites 
        : currentUserId 
          ? favorites.filter(f => f.userId === currentUserId)
          : favorites;

      if (filteredFavorites.length === 0) {
        return {
          success: false,
          error: isCompleteSelection 
            ? 'Aucune photo sélectionnée dans cette galerie'
            : 'Aucune photo sélectionnée par vous dans cette galerie'
        };
      }

      console.log(`Found ${filteredFavorites.length} selected photos (${isCompleteSelection ? 'complete' : 'personal'})`);

      // Get all comments for this gallery
      const allComments = await favoritesService.getComments(galleryId);
      
      // Filter comments by user if not complete selection
      const filteredComments = isCompleteSelection 
        ? allComments 
        : currentUserId
          ? allComments.filter(c => c.userId === currentUserId)
          : allComments;
      
      // Group data by photo for multi-user view
      const photoGroups = new Map<string, {
        users: { userName?: string; userId?: string }[];
        comments: { comment: string; userName?: string }[];
      }>();

      filteredFavorites.forEach(fav => {
        if (!photoGroups.has(fav.photoId)) {
          photoGroups.set(fav.photoId, { users: [], comments: [] });
        }
        const group = photoGroups.get(fav.photoId)!;

        // Add user if not already present
        const userExists = group.users.some(u => u.userId === fav.userId);
        if (!userExists) {
          group.users.push({
            userName: fav.userName || undefined,
            userId: fav.userId
          });
        }
      });

      // Add comments to photo groups
      filteredComments.forEach(comment => {
        if (photoGroups.has(comment.photoId)) {
          photoGroups.get(comment.photoId)!.comments.push({
            comment: comment.comment,
            userName: comment.userName || undefined
          });
        }
      });

      // Get gallery photos to match with favorites
      const galleryPhotos = await galleryService.getPhotos(galleryId);
      console.log('📸 Gallery photos loaded:', galleryPhotos.length);
      
      // Process each unique photo
      const uniquePhotos = Array.from(new Set(filteredFavorites.map(f => f.photoId)));
      const selectedPhotos: SelectionExport['selectedPhotos'] = [];

      for (const photoId of uniquePhotos) {
        const firstFav = filteredFavorites.find(f => f.photoId === photoId);
        if (!firstFav) continue;

        // Find the photo details from gallery photos - match by photo ID
        const photoDetails = galleryPhotos.find(p => p.id === photoId);
        const photoName = photoDetails?.originalName || photoDetails?.name || photoId.split('/').pop() || photoId;
        console.log(`📸 Photo ${photoId}: name="${photoName}", details:`, photoDetails);

        // Get all comments for this photo
        const photoComments = filteredComments
          .filter(c => c.photoId === photoId)
          .map(c => c.userName ? `${c.comment} (${c.userName})` : c.comment);

        selectedPhotos.push({
          photoId: photoId,
          photoName: photoName,
          originalName: photoDetails?.originalName || photoName,
          url: photoDetails?.url || photoId,
          comments: photoComments
        });
      }

      // Prepare export data
      const exportData: SelectionExport = {
        galleryId,
        galleryName: galleryName,
        exportDate: new Date().toLocaleString('fr-FR'),
        selectedPhotos,
        totalSelected: uniquePhotos.length,
        clientInfo: (clientName || clientEmail || clientPhone) ? {
          name: clientName,
          email: clientEmail,
          phone: clientPhone
        } : undefined,
        multiUserData: Array.from(photoGroups.entries()).map(([photoId, data]) => ({
          photoId,
          users: data.users,
          comments: data.comments
        }))
      };

      // Generate text content
      const textContent = this.generateSelectionText(exportData);
      
      // File name unique per selection (type, gallery, instant)
      const selectionType = isCompleteSelection ? 'complete' : 'personal';
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `selection-${selectionType}-${galleryId}-${stamp}.txt`;

      // Local copy for the visitor (download button). The file itself travels as an
      // e-mail attachment: nothing is written to the public bucket anymore.
      const blobUrl = URL.createObjectURL(new Blob([textContent], { type: 'text/plain; charset=utf-8' }));

      const emailResult = await gmailService.notifySelection({
        galleryId,
        galleryName,
        userName: clientName || userService.getCurrentUserName() || 'Visiteur',
        userEmail: clientEmail || undefined,
        selectionType,
        photoCount: uniquePhotos.length,
        fileName,
        textContent
      });
      if (!emailResult.success) {
        console.warn('Selection notification failed:', emailResult.error);
      }

      return {
        success: true,
        notified: emailResult.success,
        notificationError: emailResult.success ? undefined : emailResult.error,
        messageId: emailResult.messageId,
        fileName,
        blobUrl
      };

    } catch (error) {
      console.error('Export selection error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'export de la sélection'
      };
    }
  }

  // Clear all selections for a gallery
  async clearSelection(galleryId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const deleteResult = await favoritesService.clearAllFavorites(galleryId);

      if (deleteResult) {
        return { success: true };
      } else {
        return {
          success: false,
          error: 'Erreur lors de la suppression des sélections'
        };
      }
    } catch (error) {
      console.error('Error clearing selection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la suppression'
      };
    }
  }

  // Get selection count for a gallery
  async getSelectionCount(galleryId: string): Promise<number> {
    try {
      const favorites = await favoritesService.getFavorites(galleryId);
      return favorites ? favorites.length : 0;
    } catch (error) {
      console.error('Error getting selection count:', error);
      return 0;
    }
  }

  // Validate client information
  validateClientInfo(name?: string, email?: string, phone?: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Email validation if provided
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push('Format d\'email invalide');
      }
    }

    // Phone validation if provided (basic French format)
    if (phone && phone.trim()) {
      const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
      const cleanPhone = phone.replace(/[\s.-]/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        errors.push('Numéro de téléphone invalide');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Export selection with client information (alias for backward compatibility)
  async exportSelectionWithClientInfo(
    galleryId: string,
    galleryName: string,
    clientName?: string,
    clientEmail?: string,
    clientPhone?: string,
    isCompleteSelection: boolean = false
  ): Promise<SelectionResult> {
    // Just call the main export function
    return this.exportSelection(galleryId, clientName, clientEmail, clientPhone, isCompleteSelection);
  }

  // Submit selection without client info (alias for backward compatibility)
  async submitSelection(galleryId: string, galleryName: string, isCompleteSelection: boolean = false): Promise<SelectionResult> {
    return this.exportSelection(galleryId, undefined, undefined, undefined, isCompleteSelection);
  }

  // Quick export without client info (alias for backward compatibility)
  async quickExportSelection(galleryId: string, galleryName: string, isCompleteSelection: boolean = false): Promise<SelectionResult> {
    return this.exportSelection(galleryId, undefined, undefined, undefined, isCompleteSelection);
  }
}

export const selectionService = new SelectionService();
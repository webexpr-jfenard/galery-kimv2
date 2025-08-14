import { supabaseService } from './supabaseService';
import { favoritesService } from './favoritesService';
import { GmailService, type GmailConfig } from './gmailService';
import type { FavoritePhoto, Comment } from './favoritesService';

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
  private readonly SELECTIONS_BUCKET = 'photos'; // Bucket pour les sélections exportées

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

  // Upload selection file to Supabase
  private async uploadSelection(fileName: string, textContent: string): Promise<{ success: boolean; downloadUrl?: string; fileName: string; isTemporary?: boolean }> {
    try {
      const supabaseClient = supabaseService.getClient();
      if (!supabaseClient) {
        throw new Error('Supabase client not available');
      }

      // Try to upload to Supabase storage
      const blob = new Blob([textContent], { type: 'text/plain; charset=utf-8' });
      const file = new File([blob], fileName, { type: 'text/plain' });

      // Use selections folder in the main bucket to avoid RLS issues
      const filePath = `selections/${fileName}`;
      
      const { data, error } = await supabaseClient.storage
        .from(this.SELECTIONS_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.warn('Supabase upload failed, using blob URL fallback:', error);
        // Fallback: create blob URL for temporary download
        const blob = new Blob([textContent], { type: 'text/plain; charset=utf-8' });
        const downloadUrl = URL.createObjectURL(blob);
        return { success: true, fileName, downloadUrl, isTemporary: true };
      }

      // Get public URL
      const { data: publicUrlData } = supabaseClient.storage
        .from(this.SELECTIONS_BUCKET)
        .getPublicUrl(filePath);

      return {
        success: true,
        downloadUrl: publicUrlData.publicUrl,
        fileName
      };

    } catch (error) {
      console.error('Upload error:', error);
      
      // Fallback to blob URL
      const blob = new Blob([textContent], { type: 'text/plain; charset=utf-8' });
      const downloadUrl = URL.createObjectURL(blob);
      return { success: true, fileName, downloadUrl, isTemporary: true };
    }
  }

  // Main export function
  async exportSelection(
    galleryId: string,
    clientName?: string,
    clientEmail?: string,
    clientPhone?: string
  ): Promise<{ success: boolean; downloadUrl?: string; fileName?: string; error?: string; messageId?: string }> {
    try {
      console.log('Starting selection export for gallery:', galleryId);

      // Get all favorites for this gallery
      const favorites = await favoritesService.getAllFavorites(galleryId);
      
      if (!favorites || favorites.length === 0) {
        return {
          success: false,
          error: 'Aucune photo sélectionnée trouvée pour cette galerie'
        };
      }

      console.log(`Found ${favorites.length} selected photos`);

      // Get all comments for this gallery
      const allComments = await favoritesService.getAllComments(galleryId);
      
      // Group data by photo for multi-user view
      const photoGroups = new Map<string, {
        users: { userName?: string; userId?: string }[];
        comments: { comment: string; userName?: string }[];
      }>();

      favorites.forEach(fav => {
        if (!photoGroups.has(fav.photo_id)) {
          photoGroups.set(fav.photo_id, { users: [], comments: [] });
        }
        const group = photoGroups.get(fav.photo_id)!;
        
        // Add user if not already present
        const userExists = group.users.some(u => u.userId === fav.user_id);
        if (!userExists) {
          group.users.push({
            userName: fav.user_name || undefined,
            userId: fav.user_id
          });
        }
      });

      // Add comments to photo groups
      allComments.forEach(comment => {
        if (photoGroups.has(comment.photo_id)) {
          photoGroups.get(comment.photo_id)!.comments.push({
            comment: comment.comment,
            userName: comment.user_name || undefined
          });
        }
      });

      // Process each unique photo
      const uniquePhotos = Array.from(new Set(favorites.map(f => f.photo_id)));
      const selectedPhotos: SelectionExport['selectedPhotos'] = [];

      for (const photoId of uniquePhotos) {
        const firstFav = favorites.find(f => f.photo_id === photoId);
        if (!firstFav) continue;

        // Get all comments for this photo
        const photoComments = allComments
          .filter(c => c.photo_id === photoId)
          .map(c => c.user_name ? `${c.comment} (${c.user_name})` : c.comment);

        selectedPhotos.push({
          photoId: photoId,
          photoName: firstFav.photo_name,
          originalName: firstFav.original_name || firstFav.photo_name,
          url: firstFav.photo_url,
          comments: photoComments
        });
      }

      // Prepare export data
      const exportData: SelectionExport = {
        galleryId,
        galleryName: galleryId, // Using galleryId as name for now
        exportDate: new Date().toLocaleString('fr-FR'),
        selectedPhotos,
        totalSelected: favorites.length,
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
      
      // Create filename
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `selection-${galleryId}-${timestamp}.txt`;

      // Upload file
      const uploadResult = await this.uploadSelection(fileName, textContent);
      
      if (!uploadResult.success) {
        throw new Error('Failed to create selection file');
      }

      console.log('Selection file created:', uploadResult.fileName);

      // Send Gmail notification
      const gmailConfig = this.getGmailConfig();
      if (gmailConfig && gmailConfig.enableNotifications) {
        console.log('Sending Gmail notification...');
        
        const gmailService = new GmailService(gmailConfig);
        const emailResult = await gmailService.sendSelectionNotification(
          galleryId,
          clientName || '',
          selectedPhotos,
          uploadResult.downloadUrl!
        );

        if (emailResult.success) {
          console.log('Gmail notification sent successfully');
          return {
            success: true,
            downloadUrl: uploadResult.downloadUrl,
            fileName: uploadResult.fileName,
            messageId: emailResult.messageId
          };
        } else {
          console.warn('Gmail notification failed:', emailResult.error);
          // Continue with success even if email fails
        }
      }

      return {
        success: true,
        downloadUrl: uploadResult.downloadUrl,
        fileName: uploadResult.fileName
      };

    } catch (error) {
      console.error('Export selection error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de l\'export de la sélection'
      };
    }
  }

  // Get Gmail configuration from localStorage
  private getGmailConfig(): GmailConfig | null {
    try {
      const saved = localStorage.getItem('gmail-config');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load Gmail config:', error);
    }
    return null;
  }

  // Clear all selections for a gallery
  async clearSelection(galleryId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const deleteResult = await favoritesService.clearAllFavorites(galleryId);
      
      if (deleteResult.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: deleteResult.error || 'Erreur lors de la suppression des sélections'
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
      const favorites = await favoritesService.getAllFavorites(galleryId);
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
    clientPhone?: string
  ): Promise<{ success: boolean; downloadUrl?: string; fileName?: string; error?: string; messageId?: string }> {
    // Just call the main export function
    return this.exportSelection(galleryId, clientName, clientEmail, clientPhone);
  }

  // Submit selection without client info (alias for backward compatibility)
  async submitSelection(galleryId: string, galleryName: string): Promise<{ success: boolean; downloadUrl?: string; fileName?: string; error?: string; messageId?: string }> {
    return this.exportSelection(galleryId);
  }

  // Quick export without client info (alias for backward compatibility)
  async quickExportSelection(galleryId: string, galleryName: string): Promise<{ success: boolean; downloadUrl?: string; fileName?: string; error?: string; messageId?: string }> {
    return this.exportSelection(galleryId);
  }
}

export const selectionService = new SelectionService();
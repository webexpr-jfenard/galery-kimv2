import { supabaseService } from './supabaseService';
import { favoritesService } from './favoritesService';
import { emailService } from './emailService';
import type { FavoritePhoto, Comment } from './favoritesService';
import type { SelectionNotification } from './emailService';

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
      if (exportData.clientInfo.name) lines.push(`Nom: ${exportData.clientInfo.name}`);
      if (exportData.clientInfo.email) lines.push(`Email: ${exportData.clientInfo.email}`);
      if (exportData.clientInfo.phone) lines.push(`Téléphone: ${exportData.clientInfo.phone}`);
      lines.push('');
    }
    
    lines.push('PHOTOS SÉLECTIONNÉES:');
    lines.push('-'.repeat(30));
    
    exportData.selectedPhotos.forEach((photo, index) => {
      lines.push(`${index + 1}. ${photo.originalName || photo.photoName}`);
      lines.push(`   ID: ${photo.photoId}`);
      lines.push(`   URL: ${photo.url}`);
      
      // Show users who selected this photo (if multi-user data available)
      if (exportData.multiUserData) {
        const photoData = exportData.multiUserData.find(p => p.photoId === photo.photoId);
        if (photoData && photoData.users.length > 0) {
          lines.push('   Sélectionnée par:');
          photoData.users.forEach(user => {
            const userName = user.userName || 'Utilisateur anonyme';
            lines.push(`   - ${userName}`);
          });
        }
      }
      
      if (photo.comments.length > 0) {
        lines.push('   Commentaires:');
        photo.comments.forEach(comment => {
          lines.push(`   - ${comment}`);
        });
      }
      lines.push('');
    });
    
    lines.push('='.repeat(60));
    lines.push('Fichier généré automatiquement par le système de galerie photo');
    lines.push(`Généré le: ${new Date().toLocaleString('fr-FR')}`);
    lines.push('='.repeat(60));
    
    return lines.join('\n');
  }

  // Export selection to Supabase storage
  async exportSelection(
    galleryId: string,
    galleryName: string,
    clientInfo?: { name?: string; email?: string; phone?: string }
  ): Promise<{ success: boolean; error?: string; fileName?: string; downloadUrl?: string }> {
    try {
      console.log('📋 Exporting selection for gallery:', galleryId);

      // Get selected photos (favorites) - includes ALL favorites from ALL users
      const allFavorites = await favoritesService.getFavorites(galleryId);
      
      if (allFavorites.length === 0) {
        return { success: false, error: 'Aucune photo sélectionnée à exporter' };
      }

      // Group favorites by photo ID to get unique photos with user info
      const photoSelections: Record<string, {
        photoId: string;
        users: { userName?: string; userId?: string }[];
        firstSelected: string;
      }> = {};

      allFavorites.forEach(fav => {
        if (!photoSelections[fav.photoId]) {
          photoSelections[fav.photoId] = {
            photoId: fav.photoId,
            users: [],
            firstSelected: fav.createdAt
          };
        }
        
        // Add user who selected this photo
        photoSelections[fav.photoId].users.push({
          userName: fav.userName,
          userId: fav.userId
        });
        
        // Keep earliest selection date
        if (fav.createdAt < photoSelections[fav.photoId].firstSelected) {
          photoSelections[fav.photoId].firstSelected = fav.createdAt;
        }
      });

      // Get all comments for the gallery
      const comments = await favoritesService.getComments(galleryId);
      
      // Group comments by photo ID
      const commentsByPhoto: Record<string, Array<{ comment: string; userName?: string }>> = {};
      comments.forEach(comment => {
        if (!commentsByPhoto[comment.photoId]) {
          commentsByPhoto[comment.photoId] = [];
        }
        commentsByPhoto[comment.photoId].push({
          comment: comment.comment,
          userName: comment.userName
        });
      });

      // Get photo details from gallery service
      const { galleryService } = await import('./galleryService');
      const photos = await galleryService.getPhotos(galleryId);
      
      // Create photo lookup map
      const photoMap = new Map(photos.map(photo => [photo.id, photo]));

      // Prepare export data with unique photos
      const selectedPhotos = Object.values(photoSelections).map(selection => {
        const photo = photoMap.get(selection.photoId);
        const photoComments = commentsByPhoto[selection.photoId] || [];
        
        return {
          photoId: selection.photoId,
          photoName: photo?.name || 'Photo sans nom',
          originalName: photo?.originalName || photo?.name || 'Photo sans nom',
          url: photo?.url || '',
          users: selection.users,
          comments: photoComments.map(c => 
            c.userName ? `${c.userName}: ${c.comment}` : c.comment
          )
        };
      });

      const exportData: SelectionExport = {
        galleryId,
        galleryName,
        exportDate: new Date().toLocaleDateString('fr-FR'),
        selectedPhotos: selectedPhotos.map(photo => ({
          photoId: photo.photoId,
          photoName: photo.photoName,
          originalName: photo.originalName,
          url: photo.url,
          comments: photo.comments
        })),
        totalSelected: selectedPhotos.length,
        clientInfo,
        multiUserData: selectedPhotos.map(photo => ({
          photoId: photo.photoId,
          users: photo.users,
          comments: (commentsByPhoto[photo.photoId] || []).map(c => ({
            comment: c.comment,
            userName: c.userName
          }))
        }))
      };

      // Generate text content
      const textContent = this.generateSelectionText(exportData);
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const clientName = clientInfo?.name ? `-${clientInfo.name.replace(/[^a-zA-Z0-9]/g, '')}` : '';
      const fileName = `selection-${galleryId}${clientName}-${timestamp}.txt`;
      const filePath = `${galleryId}/${fileName}`;

      // Upload to Supabase
      const uploadResult = await supabaseService.uploadTextFile(
        this.SELECTIONS_BUCKET,
        filePath,
        textContent,
        { upsert: true }
      );

      if (!uploadResult.success) {
        return { 
          success: false, 
          error: uploadResult.error || 'Échec de l\'upload du fichier de sélection' 
        };
      }

      // Get download URL
      const downloadUrl = supabaseService.getPublicUrl(this.SELECTIONS_BUCKET, filePath);

      console.log('✅ Selection exported successfully:', fileName);

      // Send email notification if configured
      if (emailService.isConfigured() && downloadUrl) {
        try {
          const notification: SelectionNotification = {
            galleryId,
            galleryName,
            selectionCount: selectedPhotos.length,
            clientInfo,
            downloadUrl,
            fileName,
            exportDate: new Date().toLocaleDateString('fr-FR')
          };

          const emailResult = await emailService.sendNotification(notification);
          
          if (emailResult.success && emailResult.mailtoLink) {
            console.log('📧 Email notification prepared - opening email client...');
            // Open default email client with pre-filled email
            window.open(emailResult.mailtoLink);
          } else if (emailResult.error) {
            console.warn('⚠️ Email notification failed:', emailResult.error);
          }
        } catch (emailError) {
          console.warn('⚠️ Email notification error:', emailError);
          // Don't fail the export if email fails
        }
      }
      
      return {
        success: true,
        fileName,
        downloadUrl: downloadUrl || undefined
      };

    } catch (error) {
      console.error('❌ Error exporting selection:', error);
      return { 
        success: false, 
        error: 'Erreur lors de l\'export de la sélection' 
      };
    }
  }

  // Get selection history for a gallery
  async getSelectionHistory(galleryId: string): Promise<{
    success: boolean;
    selections: { name: string; created_at: string; url: string }[];
    error?: string;
  }> {
    try {
      if (!supabaseService.isReady()) {
        return { success: false, selections: [], error: 'Supabase non configuré' };
      }

      const files = await supabaseService.listFiles(this.SELECTIONS_BUCKET, galleryId);
      
      const selections = files
        .filter(file => file.name.endsWith('.txt'))
        .map(file => ({
          name: file.name,
          created_at: file.created_at,
          url: supabaseService.getPublicUrl(this.SELECTIONS_BUCKET, `${galleryId}/${file.name}`) || ''
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return { success: true, selections };
    } catch (error) {
      console.error('Error getting selection history:', error);
      return { 
        success: false, 
        selections: [], 
        error: 'Erreur lors de la récupération de l\'historique' 
      };
    }
  }

  // Quick export without client info
  async quickExportSelection(galleryId: string, galleryName: string): Promise<{ 
    success: boolean; 
    error?: string; 
    fileName?: string;
    downloadUrl?: string;
  }> {
    return await this.exportSelection(galleryId, galleryName);
  }

  // Export with client information form
  async exportSelectionWithClientInfo(
    galleryId: string,
    galleryName: string,
    clientName?: string,
    clientEmail?: string,
    clientPhone?: string
  ): Promise<{ success: boolean; error?: string; fileName?: string; downloadUrl?: string }> {
    const clientInfo = {
      name: clientName?.trim(),
      email: clientEmail?.trim(),
      phone: clientPhone?.trim()
    };

    // Remove empty fields
    Object.keys(clientInfo).forEach(key => {
      if (!clientInfo[key as keyof typeof clientInfo]) {
        delete clientInfo[key as keyof typeof clientInfo];
      }
    });

    return await this.exportSelection(galleryId, galleryName, clientInfo);
  }

  // Generate filename preview
  generateFileName(galleryId: string, clientName?: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const clientPart = clientName ? `-${clientName.replace(/[^a-zA-Z0-9]/g, '')}` : '';
    return `selection-${galleryId}${clientPart}-${timestamp}.txt`;
  }

  // Validate client info
  validateClientInfo(name?: string, email?: string, phone?: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.push('Format d\'email invalide');
      }
    }

    if (phone && phone.trim()) {
      const phoneRegex = /^[\d\s\-\+\(\)\.]{8,}$/;
      if (!phoneRegex.test(phone.trim().replace(/\s/g, ''))) {
        errors.push('Format de téléphone invalide');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const selectionService = new SelectionService();
export type { SelectionExport };
/**
 * Favorites and comments, shared by every visitor of a gallery.
 *
 * Rows live in Supabase only. Ownership is enforced by the database: the visitor's
 * secret token travels as the x-user-token header (see supabaseService/userService) and
 * RLS only lets a browser insert or delete rows whose user_id matches its own token.
 * Admins (Supabase Auth accounts listed in admin_users) can delete anything.
 */
import { supabaseService } from './supabaseService';
import { userService } from './userService';

export interface FavoritePhoto {
  id: string;
  galleryId: string;
  photoId: string;
  deviceId: string;
  userId?: string;
  userName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  galleryId: string;
  photoId: string;
  deviceId: string;
  userId?: string;
  userName?: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

const FAVORITES_TABLE = 'favorites';
const COMMENTS_TABLE = 'comments';
const DEVICE_ID_KEY = 'gallery-device-id';

const mapFavorite = (row: any): FavoritePhoto => ({
  id: row.id,
  galleryId: row.gallery_id,
  photoId: row.photo_id,
  deviceId: row.device_id,
  userId: row.user_id,
  userName: row.user_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapComment = (row: any): Comment => ({
  id: row.id,
  galleryId: row.gallery_id,
  photoId: row.photo_id,
  deviceId: row.device_id,
  userId: row.user_id,
  userName: row.user_name,
  comment: row.comment,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

class FavoritesService {
  private readonly deviceId: string;

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
  }

  private getOrCreateDeviceId(): string {
    try {
      let deviceId = localStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
      }
      return deviceId;
    } catch {
      return `device_${Date.now()}`;
    }
  }

  private get client() {
    return supabaseService.client;
  }

  private requireUser() {
    const session = userService.getCurrentSession();
    if (!session) throw new Error('Utilisateur non connecté');
    return session;
  }

  // ---------- Favorites ----------

  /** Every favorite of the gallery, all visitors included (shared selection). */
  async getFavorites(galleryId: string): Promise<FavoritePhoto[]> {
    const { data, error } = await this.client
      .from(FAVORITES_TABLE)
      .select('*')
      .eq('gallery_id', galleryId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching favorites:', error);
      throw error;
    }
    return (data || []).map(mapFavorite);
  }

  async addToFavorites(galleryId: string, photoId: string): Promise<FavoritePhoto> {
    const user = this.requireUser();
    const { data: existing } = await this.client
      .from(FAVORITES_TABLE)
      .select('*')
      .eq('gallery_id', galleryId)
      .eq('photo_id', photoId)
      .eq('user_id', user.userId)
      .limit(1);
    if (existing && existing.length > 0) return mapFavorite(existing[0]);

    const { data, error } = await this.client
      .from(FAVORITES_TABLE)
      .insert([{
        gallery_id: galleryId,
        photo_id: photoId,
        device_id: this.deviceId,
        user_id: user.userId,
        user_name: user.userName
      }])
      .select()
      .single();
    if (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }
    return mapFavorite(data);
  }

  /** Removes the current visitor's favorite for this photo (RLS refuses anyone else's). */
  async removeFromFavorites(galleryId: string, photoId: string): Promise<boolean> {
    const user = this.requireUser();
    const { error } = await this.client
      .from(FAVORITES_TABLE)
      .delete()
      .eq('gallery_id', galleryId)
      .eq('photo_id', photoId)
      .eq('user_id', user.userId);
    if (error) {
      console.error('Error removing favorite:', error);
      return false;
    }
    return true;
  }

  /** Removes every favorite of the current visitor in the gallery ("Effacer ma sélection"). */
  async clearUserFavorites(galleryId: string): Promise<boolean> {
    const user = this.requireUser();
    const { error } = await this.client
      .from(FAVORITES_TABLE)
      .delete()
      .eq('gallery_id', galleryId)
      .eq('user_id', user.userId);
    if (error) {
      console.error('Error clearing user favorites:', error);
      return false;
    }
    return true;
  }

  /** Admin only (RLS): removes every favorite of the gallery. */
  async clearAllFavorites(galleryId: string): Promise<boolean> {
    const { error } = await this.client.from(FAVORITES_TABLE).delete().eq('gallery_id', galleryId);
    if (error) {
      console.error('Error clearing favorites:', error);
      return false;
    }
    return true;
  }

  // ---------- Comments ----------

  async getComments(galleryId: string): Promise<Comment[]> {
    const { data, error } = await this.client
      .from(COMMENTS_TABLE)
      .select('*')
      .eq('gallery_id', galleryId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
    return (data || []).map(mapComment);
  }

  async addComment(galleryId: string, photoId: string, comment: string): Promise<Comment> {
    const user = this.requireUser();
    const { data, error } = await this.client
      .from(COMMENTS_TABLE)
      .insert([{
        gallery_id: galleryId,
        photo_id: photoId,
        device_id: this.deviceId,
        user_id: user.userId,
        user_name: user.userName,
        comment
      }])
      .select()
      .single();
    if (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
    return mapComment(data);
  }

  /** Removes one of the current visitor's comments (RLS refuses anyone else's). */
  async removeComment(commentId: string): Promise<boolean> {
    const user = this.requireUser();
    const { error } = await this.client
      .from(COMMENTS_TABLE)
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.userId);
    if (error) {
      console.error('Error removing comment:', error);
      return false;
    }
    return true;
  }

  /** Admin only (RLS): removes every comment of the gallery. */
  async clearAllComments(galleryId: string): Promise<boolean> {
    const { error } = await this.client.from(COMMENTS_TABLE).delete().eq('gallery_id', galleryId);
    if (error) {
      console.error('Error clearing comments:', error);
      return false;
    }
    return true;
  }

  // ---------- Per-photo cleanup (admin, when a photo is deleted) ----------

  async clearPhotoFavorites(galleryId: string, photoId: string): Promise<boolean> {
    const { error } = await this.client.from(FAVORITES_TABLE).delete().eq('gallery_id', galleryId).eq('photo_id', photoId);
    if (error) console.error('Error clearing photo favorites:', error);
    return !error;
  }

  async clearPhotoComments(galleryId: string, photoId: string): Promise<boolean> {
    const { error } = await this.client.from(COMMENTS_TABLE).delete().eq('gallery_id', galleryId).eq('photo_id', photoId);
    if (error) console.error('Error clearing photo comments:', error);
    return !error;
  }

  async clearPhotoData(galleryId: string, photoId: string): Promise<boolean> {
    const [favorites, comments] = await Promise.all([
      this.clearPhotoFavorites(galleryId, photoId),
      this.clearPhotoComments(galleryId, photoId)
    ]);
    return favorites && comments;
  }

  // ---------- Misc ----------

  async getDeviceId(): Promise<string> {
    return this.deviceId;
  }
}

export const favoritesService = new FavoritesService();

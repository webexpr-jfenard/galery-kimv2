/**
 * Service de gestion des utilisateurs pour les favoris
 * Demande le nom au premier ajout en favori et le stocke en session
 */

export interface UserSession {
  userId: string;
  userName: string;
  deviceId: string;
  createdAt: string;
}

class UserService {
  private readonly USER_SESSION_KEY = 'gallery-user-session';
  private currentSession: UserSession | null = null;

  constructor() {
    this.loadSession();
  }

  /**
   * Charge la session utilisateur depuis localStorage
   */
  private loadSession(): void {
    try {
      const stored = localStorage.getItem(this.USER_SESSION_KEY);
      if (stored) {
        this.currentSession = JSON.parse(stored);
        console.log('👤 Session utilisateur chargée:', this.currentSession?.userName);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la session:', error);
      this.currentSession = null;
    }
  }

  /**
   * Sauvegarde la session utilisateur
   */
  private saveSession(session: UserSession): void {
    try {
      localStorage.setItem(this.USER_SESSION_KEY, JSON.stringify(session));
      this.currentSession = session;
      console.log('✅ Session utilisateur sauvegardée:', session.userName);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la session:', error);
    }
  }

  /**
   * Crée une nouvelle session utilisateur
   */
  public createSession(userName: string, deviceId: string): UserSession {
    const session: UserSession = {
      userId: `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      userName: userName.trim(),
      deviceId,
      createdAt: new Date().toISOString()
    };

    this.saveSession(session);
    return session;
  }

  /**
   * Récupère la session courante
   */
  public getCurrentSession(): UserSession | null {
    return this.currentSession;
  }

  /**
   * Vérifie si un utilisateur est connecté
   */
  public isUserLoggedIn(): boolean {
    return this.currentSession !== null;
  }

  /**
   * Récupère le nom de l'utilisateur courant
   */
  public getCurrentUserName(): string | null {
    return this.currentSession?.userName || null;
  }

  /**
   * Récupère l'ID de l'utilisateur courant
   */
  public getCurrentUserId(): string | null {
    return this.currentSession?.userId || null;
  }

  /**
   * Met à jour le nom d'utilisateur
   */
  public updateUserName(newName: string): boolean {
    if (!this.currentSession) {
      return false;
    }

    try {
      this.currentSession.userName = newName.trim();
      this.saveSession(this.currentSession);
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du nom:', error);
      return false;
    }
  }

  /**
   * Supprime la session utilisateur (déconnexion)
   */
  public clearSession(): void {
    try {
      localStorage.removeItem(this.USER_SESSION_KEY);
      this.currentSession = null;
      console.log('🚪 Session utilisateur supprimée');
    } catch (error) {
      console.error('Erreur lors de la suppression de la session:', error);
    }
  }

  /**
   * Valide un nom d'utilisateur
   */
  public validateUserName(name: string): { valid: boolean; message?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, message: 'Le nom ne peut pas être vide' };
    }

    if (name.trim().length < 2) {
      return { valid: false, message: 'Le nom doit contenir au moins 2 caractères' };
    }

    if (name.trim().length > 50) {
      return { valid: false, message: 'Le nom ne peut pas dépasser 50 caractères' };
    }

    // Vérifier les caractères autorisés (lettres, chiffres, espaces, tirets, apostrophes)
    const validNamePattern = /^[a-zA-ZÀ-ÿ0-9\s\-']+$/;
    if (!validNamePattern.test(name.trim())) {
      return { valid: false, message: 'Le nom contient des caractères non autorisés' };
    }

    return { valid: true };
  }

  /**
   * Récupère des statistiques sur l'utilisateur
   */
  public getUserStats(): {
    isLoggedIn: boolean;
    userName?: string;
    sessionCreated?: string;
    daysSinceCreation?: number;
  } {
    if (!this.currentSession) {
      return { isLoggedIn: false };
    }

    const createdAt = new Date(this.currentSession.createdAt);
    const daysSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    return {
      isLoggedIn: true,
      userName: this.currentSession.userName,
      sessionCreated: this.currentSession.createdAt,
      daysSinceCreation
    };
  }
}

export const userService = new UserService();
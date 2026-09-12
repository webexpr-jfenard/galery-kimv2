/**
 * Visitor identity for favorites and comments.
 *
 * A visitor is identified by a secret random token that never leaves this browser
 * except as the `x-user-token` request header (injected by supabaseService). The
 * database derives user_id = sha256(token) (see request_user_id() in Postgres), so a
 * favorite or comment can only be written or removed by the browser holding the token.
 * user_id itself is public and harmless: it cannot be reversed into the token.
 */

export interface UserSession {
  token: string;     // secret, never displayed nor stored server-side
  userId: string;    // sha256(token) as hex, what the database stores in user_id
  userName: string;
  deviceId: string;
  createdAt: string;
}

const USER_SESSION_KEY = 'gallery-user-session';

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

type Listener = (session: UserSession | null) => void;

class UserService {
  private currentSession: UserSession | null = null;
  private listeners = new Set<Listener>();

  constructor() {
    this.loadSession();
  }

  private loadSession(): void {
    try {
      const stored = localStorage.getItem(USER_SESSION_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      // Sessions created before the token scheme (2026-09) cannot prove ownership of
      // anything: drop them, the visitor is simply asked for their first name again.
      if (parsed && typeof parsed.token === 'string' && typeof parsed.userId === 'string') {
        this.currentSession = parsed as UserSession;
      } else {
        localStorage.removeItem(USER_SESSION_KEY);
      }
    } catch {
      this.currentSession = null;
    }
  }

  private saveSession(session: UserSession | null): void {
    try {
      if (session) {
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(USER_SESSION_KEY);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la session:', error);
    }
    this.currentSession = session;
    this.listeners.forEach(listener => listener(session));
  }

  /** Creates the visitor identity (token + derived user id) and stores it in this browser. */
  public async createSession(userName: string, deviceId: string): Promise<UserSession> {
    const token = randomToken();
    const session: UserSession = {
      token,
      userId: await sha256Hex(token),
      userName: userName.trim(),
      deviceId,
      createdAt: new Date().toISOString()
    };
    this.saveSession(session);
    return session;
  }

  public getCurrentSession(): UserSession | null {
    return this.currentSession;
  }

  public isUserLoggedIn(): boolean {
    return this.currentSession !== null;
  }

  public getCurrentUserName(): string | null {
    return this.currentSession?.userName || null;
  }

  public getCurrentUserId(): string | null {
    return this.currentSession?.userId || null;
  }

  /** Secret token sent as the x-user-token header; null when the visitor has no identity yet. */
  public getToken(): string | null {
    return this.currentSession?.token || null;
  }

  public updateUserName(newName: string): boolean {
    if (!this.currentSession) return false;
    this.saveSession({ ...this.currentSession, userName: newName.trim() });
    return true;
  }

  /** Forgets the identity in this browser ("ce n'est pas moi"). Existing favorites stay attached to the old id. */
  public clearSession(): void {
    this.saveSession(null);
  }

  public onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public validateUserName(name: string): { valid: boolean; message?: string } {
    const trimmed = (name || '').trim();
    if (trimmed.length === 0) return { valid: false, message: 'Le nom ne peut pas être vide' };
    if (trimmed.length < 2) return { valid: false, message: 'Le nom doit contenir au moins 2 caractères' };
    if (trimmed.length > 50) return { valid: false, message: 'Le nom ne peut pas dépasser 50 caractères' };
    if (!/^[a-zA-ZÀ-ÿ0-9\s\-']+$/.test(trimmed)) {
      return { valid: false, message: 'Le nom contient des caractères non autorisés' };
    }
    return { valid: true };
  }
}

export const userService = new UserService();

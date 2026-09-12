/**
 * Admin authentication, backed by Supabase Auth.
 *
 * An admin is a Supabase Auth user (e-mail + password, created by hand in the Supabase
 * dashboard, signups disabled) whose id is listed in the `admin_users` table. Every
 * write policy in the database and on the storage bucket checks that membership through
 * is_admin_user(); nothing secret ships in the client bundle anymore.
 */
import type { Session } from '@supabase/supabase-js';
import { supabaseService } from './supabaseService';

export interface AdminSessionInfo {
  isAuthenticated: boolean;
  email?: string;
  expiresAt?: number; // ms since epoch
}

type Listener = (isAuthenticated: boolean) => void;

const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: 'E-mail ou mot de passe incorrect.',
  email_not_confirmed: "Cette adresse n'a pas encore été confirmée.",
  over_request_rate_limit: 'Trop de tentatives, réessayez dans quelques minutes.',
};

class AuthService {
  private session: Session | null = null;
  private isAdmin = false;
  private recoveryPending = false;
  private listeners = new Set<Listener>();
  private readonly ready: Promise<void>;

  constructor() {
    this.ready = this.init();
  }

  private get auth() {
    return supabaseService.client.auth;
  }

  private async init(): Promise<void> {
    try {
      const { data } = await this.auth.getSession();
      await this.applySession(data.session);
      this.auth.onAuthStateChange((event: string, session: Session | null) => {
        if (event === 'PASSWORD_RECOVERY') this.recoveryPending = true;
        // supabase-js asks not to call the client synchronously from this callback
        setTimeout(() => { void this.applySession(session); }, 0);
      });
    } catch (error) {
      console.error('Auth init error:', error);
      await this.applySession(null);
    }
  }

  private async applySession(session: Session | null): Promise<void> {
    this.session = session;
    this.isAdmin = session ? await this.isListedAdmin(session.user.id) : false;
    this.listeners.forEach(listener => listener(this.isAdmin));
  }

  private async isListedAdmin(userId: string): Promise<boolean> {
    const { data, error } = await supabaseService.client
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.error('admin_users lookup failed:', error);
      return false;
    }
    return !!data;
  }

  /** Resolves once the persisted session (if any) has been restored. */
  whenReady(): Promise<void> {
    return this.ready;
  }

  async signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
    const { data, error } = await this.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      return { ok: false, error: AUTH_ERRORS[error.code || ''] || error.message };
    }
    await this.applySession(data.session);
    if (!this.isAdmin) {
      await this.auth.signOut();
      return { ok: false, error: "Ce compte n'est pas autorisé à administrer les galeries." };
    }
    return { ok: true };
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.applySession(null);
  }

  /** Sends the reset e-mail; the link comes back to the admin page in recovery mode. */
  async resetPassword(email: string): Promise<{ ok: boolean; error?: string }> {
    const { error } = await this.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/#/admin`
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  isPasswordRecoveryPending(): boolean {
    return this.recoveryPending;
  }

  async updatePassword(newPassword: string): Promise<{ ok: boolean; error?: string }> {
    const { error } = await this.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: error.message };
    this.recoveryPending = false;
    return { ok: true };
  }

  isAdminAuthenticated(): boolean {
    return this.isAdmin;
  }

  getSessionInfo(): AdminSessionInfo {
    return {
      isAuthenticated: this.isAdmin,
      email: this.session?.user.email,
      expiresAt: this.session?.expires_at ? this.session.expires_at * 1000 : undefined
    };
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const authService = new AuthService();

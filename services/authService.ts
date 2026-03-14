interface AdminSession {
  isAuthenticated: boolean;
  timestamp: number;
  expiresAt: number;
}

class AuthService {
  private readonly ADMIN_SESSION_KEY = 'admin-session';
  private readonly CUSTOM_PASSWORD_KEY = 'admin-custom-password';
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Rate limiting
  private failedAttempts = 0;
  private lockoutUntil: number | null = null;
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  private getAdminPassword(): string {
    // Check for custom password first (set via changeAdminPassword)
    const custom = localStorage.getItem(this.CUSTOM_PASSWORD_KEY);
    if (custom) return custom;
    // Then env var
    const envPassword = (import.meta as any).env?.VITE_ADMIN_PASSWORD;
    if (envPassword) return envPassword;
    // Fallback
    return 'admin123';
  }

  // Admin Authentication
  authenticateAdmin(password: string): boolean {
    try {
      // Check lockout
      if (this.lockoutUntil && Date.now() < this.lockoutUntil) {
        const remaining = Math.ceil((this.lockoutUntil - Date.now()) / 60000);
        console.warn(`Account locked. Try again in ${remaining} minutes.`);
        return false;
      }

      const isValid = password === this.getAdminPassword();

      if (isValid) {
        this.failedAttempts = 0;
        this.lockoutUntil = null;
        this.setAdminSession();
      } else {
        this.failedAttempts++;
        if (this.failedAttempts >= this.MAX_ATTEMPTS) {
          this.lockoutUntil = Date.now() + this.LOCKOUT_DURATION;
          this.failedAttempts = 0;
        }
      }

      return isValid;
    } catch (error) {
      console.error('Error authenticating admin:', error);
      return false;
    }
  }

  isAdminAuthenticated(): boolean {
    try {
      const session = this.getAdminSession();
      if (!session) return false;
      
      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        this.clearAdminSession();
        return false;
      }
      
      return session.isAuthenticated;
    } catch (error) {
      console.error('Error checking admin auth:', error);
      return false;
    }
  }

  private setAdminSession(): void {
    try {
      const session: AdminSession = {
        isAuthenticated: true,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.SESSION_DURATION
      };
      
      localStorage.setItem(this.ADMIN_SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Error setting admin session:', error);
    }
  }

  private getAdminSession(): AdminSession | null {
    try {
      const stored = localStorage.getItem(this.ADMIN_SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error getting admin session:', error);
      return null;
    }
  }

  clearAdminSession(): void {
    try {
      localStorage.removeItem(this.ADMIN_SESSION_KEY);
    } catch (error) {
      console.error('Error clearing admin session:', error);
    }
  }

  getSessionInfo(): { isAuthenticated: boolean; expiresAt?: number; timeRemaining?: number } {
    try {
      const session = this.getAdminSession();
      if (!session) {
        return { isAuthenticated: false };
      }

      const timeRemaining = session.expiresAt - Date.now();
      
      return {
        isAuthenticated: session.isAuthenticated && timeRemaining > 0,
        expiresAt: session.expiresAt,
        timeRemaining: Math.max(0, timeRemaining)
      };
    } catch (error) {
      return { isAuthenticated: false };
    }
  }

  extendSession(): boolean {
    try {
      if (!this.isAdminAuthenticated()) return false;
      
      this.setAdminSession(); // Refresh the session
      return true;
    } catch (error) {
      console.error('Error extending session:', error);
      return false;
    }
  }

  // Password validation helper
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!password || password.length === 0) {
      errors.push('Password is required');
    }
    
    if (password.length < 4) {
      errors.push('Password must be at least 4 characters long');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Change admin password (requires current password)
  changeAdminPassword(currentPassword: string, newPassword: string): boolean {
    try {
      if (currentPassword !== this.getAdminPassword()) return false;
      const validation = AuthService.validatePassword(newPassword);
      if (!validation.isValid) return false;
      localStorage.setItem(this.CUSTOM_PASSWORD_KEY, newPassword);
      return true;
    } catch (error) {
      console.error('Error changing admin password:', error);
      return false;
    }
  }
}

export const authService = new AuthService();
export type { AdminSession };
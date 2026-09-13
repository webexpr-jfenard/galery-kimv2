/**
 * Site-wide settings stored in `site_settings` (public read, admin write).
 * Today: the photographer's contact details shown in every gallery header.
 */
import { supabaseService } from './supabaseService';
import { PHOTOGRAPHER as DEFAULTS } from './siteConfig';

export interface Photographer {
  name: string;
  email: string;
  phone: string;
  instagram: string; // full URL
  website: string;
}

export interface PhotographerLinks extends Photographer {
  phoneHref: string;       // tel: link (French numbers get +33)
  instagramHandle: string; // @kimredler
}

const KEY = 'photographer';

export function withLinks(p: Photographer): PhotographerLinks {
  const digits = p.phone.replace(/[^\d+]/g, '');
  const phoneHref = digits.startsWith('0') && digits.length === 10 ? `tel:+33${digits.slice(1)}` : `tel:${digits}`;
  const handleMatch = p.instagram.match(/instagram\.com\/([^/?#]+)/i);
  const instagramHandle = handleMatch ? `@${handleMatch[1]}` : p.instagram.replace(/^https?:\/\//, '');
  return { ...p, phoneHref, instagramHandle };
}

function normalize(raw: any): Photographer {
  const str = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v.trim() : fallback);
  return {
    name: str(raw?.name, DEFAULTS.name),
    email: str(raw?.email, DEFAULTS.email),
    phone: str(raw?.phone, DEFAULTS.phone),
    instagram: str(raw?.instagram, DEFAULTS.instagram),
    website: str(raw?.website, DEFAULTS.website),
  };
}

class SiteSettingsService {
  private photographerPromise: Promise<Photographer> | null = null;

  /** Cached for the page lifetime; falls back to siteConfig defaults on any error. */
  getPhotographer(force = false): Promise<Photographer> {
    if (!this.photographerPromise || force) {
      this.photographerPromise = supabaseService.client
        .from('site_settings')
        .select('value')
        .eq('key', KEY)
        .maybeSingle()
        .then(({ data, error }: { data: any; error: any }) => {
          if (error) console.error('site_settings read failed:', error);
          return normalize(data?.value);
        })
        .catch(() => normalize(null));
    }
    return this.photographerPromise;
  }

  async savePhotographer(p: Photographer): Promise<boolean> {
    const value = normalize(p);
    const { error } = await supabaseService.client
      .from('site_settings')
      .upsert({ key: KEY, value, updated_at: new Date().toISOString() });
    if (error) {
      console.error('site_settings write failed:', error);
      return false;
    }
    this.photographerPromise = Promise.resolve(value);
    return true;
  }
}

export const siteSettingsService = new SiteSettingsService();

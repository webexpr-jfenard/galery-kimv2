/**
 * Selection instructions ("Comment sélectionner vos photos ?").
 *
 * Templates live in the `instruction_templates` table and are edited in the admin
 * (#/admin, page Consignes). A gallery stores its own editable copy in
 * `galleries.instructions` (null = no instructions shown). The quota is a hint only:
 * the client is warned, never blocked.
 */
import { supabaseService } from './supabaseService';

export type InstructionIcon = 'camera' | 'eye' | 'heart' | 'check' | 'sliders' | 'star' | 'info';
export const INSTRUCTION_ICONS: { id: InstructionIcon; label: string }[] = [
  { id: 'camera', label: 'Appareil photo' },
  { id: 'eye', label: 'Œil' },
  { id: 'heart', label: 'Cœur' },
  { id: 'check', label: 'Validation' },
  { id: 'sliders', label: 'Retouche' },
  { id: 'star', label: 'Étoile' },
  { id: 'info', label: 'Information' },
];

export interface InstructionStep {
  icon: InstructionIcon;
  title: string;
  text: string;
  highlight?: string;
}

export interface Instructions {
  title: string;
  quota: { max: number } | null;
  intro: { title: string; text: string } | null;
  steps: InstructionStep[];
  help: { title: string; text: string } | null;
}

export interface InstructionTemplate {
  id: string;
  name: string;
  sortOrder: number;
  content: Instructions;
  updatedAt: string;
}

const TABLE = 'instruction_templates';
const ICON_IDS = new Set<string>(INSTRUCTION_ICONS.map(i => i.id));

const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);

/** Validates whatever is stored in JSON into a well-formed Instructions object (or null). */
export function normalizeInstructions(raw: unknown): Instructions | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, any>;
  const block = (b: any) => (b && typeof b === 'object' && (str(b.title) || str(b.text)))
    ? { title: str(b.title), text: str(b.text) }
    : null;
  const steps: InstructionStep[] = Array.isArray(r.steps)
    ? r.steps
        .filter((s: any) => s && typeof s === 'object')
        .map((s: any) => ({
          icon: (ICON_IDS.has(s.icon) ? s.icon : 'info') as InstructionIcon,
          title: str(s.title),
          text: str(s.text),
          highlight: str(s.highlight) || undefined
        }))
    : [];
  const max = r.quota && Number.isInteger(r.quota.max) && r.quota.max > 0 ? r.quota.max : null;
  return {
    title: str(r.title, 'Comment sélectionner vos photos ?'),
    quota: max ? { max } : null,
    intro: block(r.intro),
    steps,
    help: block(r.help)
  };
}

export function emptyInstructions(): Instructions {
  return {
    title: 'Comment sélectionner vos photos ?',
    quota: null,
    intro: { title: 'À savoir avant de commencer', text: '' },
    steps: [{ icon: 'heart', title: 'Sélectionnez vos photos', text: 'Cliquez sur le cœur ♡ pour ajouter une photo à vos favoris.' }],
    help: { title: "Besoin d'aide ?", text: '' }
  };
}

/** Replaces the {quota} placeholder with the number of photos to pick. */
export function applyQuota(text: string, quota: Instructions['quota']): string {
  return text.replace(/\{quota\}/g, quota ? String(quota.max) : '');
}

const mapTemplate = (row: any): InstructionTemplate => ({
  id: row.id,
  name: row.name,
  sortOrder: row.sort_order ?? 0,
  content: normalizeInstructions(row.content) || emptyInstructions(),
  updatedAt: row.updated_at
});

class InstructionsService {
  async listTemplates(): Promise<InstructionTemplate[]> {
    const { data, error } = await supabaseService.client
      .from(TABLE)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) {
      console.error('Error loading instruction templates:', error);
      throw error;
    }
    return (data || []).map(mapTemplate);
  }

  async saveTemplate(template: Pick<InstructionTemplate, 'id' | 'name' | 'content'> & { sortOrder?: number }): Promise<InstructionTemplate> {
    const { data, error } = await supabaseService.client
      .from(TABLE)
      .upsert({
        id: template.id,
        name: template.name.trim(),
        sort_order: template.sortOrder ?? 0,
        content: template.content,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) {
      console.error('Error saving instruction template:', error);
      throw error;
    }
    return mapTemplate(data);
  }

  async createTemplate(name: string, content: Instructions, sortOrder = 99): Promise<InstructionTemplate> {
    const id = name.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'modele';
    return this.saveTemplate({ id: `${id}-${Date.now().toString(36)}`, name, content, sortOrder });
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const { error } = await supabaseService.client.from(TABLE).delete().eq('id', id);
    if (error) console.error('Error deleting instruction template:', error);
    return !error;
  }
}

export const instructionsService = new InstructionsService();

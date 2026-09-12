import { supabaseService } from './supabaseService';
import { favoritesService } from './favoritesService';
import { createThumbnail, thumbnailPathFor } from './imageService';
import { normalizeInstructions, type Instructions } from './instructionsService';
import type { StorageFile } from './supabaseService';

// Folder hierarchy and display order, stored in galleries.folder_tree (JSONB).
// Photo subfolders stay flat in photos.subfolder; a node with `children` is a group
// (it may also hold photos of its own). Two levels max.
export interface FolderNode {
  name: string;
  children?: string[];
}

export interface Gallery {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  password?: string; // write-only: a new password to set (updateGallery/createGallery); never read back
  hasPassword?: boolean; // maintained by the database (set_gallery_password)
  bucketFolder?: string; // Supabase bucket folder path
  bucketName?: string; // Supabase bucket name (default: 'photos')
  photoCount?: number;
  viewCount?: number;
  allowComments?: boolean;
  allowFavorites?: boolean;
  featuredPhotoUrl?: string; // URL of the featured photo for gallery preview
  featuredPhotoId?: string; // ID of the featured photo
  category?: string; // Client name or category for organization
  folderTree?: FolderNode[]; // Ordered subfolder hierarchy (see FolderNode)
  instructions?: Instructions | null; // Selection instructions shown to visitors (null = none)
}

export interface Photo {
  id: string;
  galleryId: string;
  name: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  description?: string;
  uploadedAt: string;
  size: number;
  width?: number;
  height?: number;
  mimeType: string;
  isSelected?: boolean;
  bucketPath?: string; // Full path in Supabase bucket
  supabaseFile?: StorageFile; // Original Supabase file metadata
  subfolder?: string; // NEW: Subfolder for organization
}

export interface SubfolderInfo {
  name: string;
  photoCount: number;
  lastUpdated: string;
  parent?: string; // Group this subfolder belongs to, if any
}

// A resolved node of the folder tree, with photo counts.
export interface FolderSection {
  name: string;
  photoCount: number; // own photos + children photos
  ownPhotoCount: number;
  parent?: string;
  isGroup: boolean;
  children: FolderSection[];
}

// Depth-first, display-ordered view of FolderSection[]
export interface FolderDisplayEntry {
  name: string;
  depth: number;
  isGroup: boolean;
  parent?: string;
  photoCount: number;
}

const naturalCompare = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

// Normalize whatever is stored in folder_tree: drop duplicates, empty names, non-strings.
export function sanitizeFolderTree(tree: unknown): FolderNode[] {
  if (!Array.isArray(tree)) return [];
  const seen = new Set<string>();
  const result: FolderNode[] = [];
  for (const raw of tree) {
    const name = typeof raw === 'string' ? raw : (raw && typeof raw.name === 'string' ? raw.name : '');
    if (!name.trim() || seen.has(name)) continue;
    seen.add(name);
    const node: FolderNode = { name };
    if (raw && Array.isArray(raw.children)) {
      node.children = raw.children.filter((c: unknown): c is string => {
        if (typeof c !== 'string' || !c.trim() || seen.has(c)) return false;
        seen.add(c);
        return true;
      });
    }
    result.push(node);
  }
  return result;
}

// Combine the real subfolders (from photos) with the stored tree.
// Tree order wins; subfolders missing from the tree are appended at root in natural order.
// Empty groups are dropped unless keepEmptyGroups is set (the admin organizer needs them).
export function buildFolderSections(
  subfolders: Array<{ name: string; photoCount: number }>,
  tree?: FolderNode[] | null,
  options?: { keepEmptyGroups?: boolean }
): FolderSection[] {
  const counts = new Map(subfolders.map(s => [s.name, s.photoCount]));
  const placed = new Set<string>();
  const sections: FolderSection[] = [];

  for (const node of sanitizeFolderTree(tree)) {
    const isGroup = Array.isArray(node.children);
    if (!isGroup && !counts.has(node.name)) continue; // stale leaf (folder emptied)

    const children: FolderSection[] = [];
    for (const childName of node.children || []) {
      if (!counts.has(childName)) continue; // stale child
      placed.add(childName);
      const count = counts.get(childName)!;
      children.push({ name: childName, photoCount: count, ownPhotoCount: count, parent: node.name, isGroup: false, children: [] });
    }

    const own = counts.get(node.name) || 0;
    if (isGroup && own === 0 && children.length === 0 && !options?.keepEmptyGroups) continue;

    placed.add(node.name);
    sections.push({
      name: node.name,
      photoCount: own + children.reduce((sum, c) => sum + c.photoCount, 0),
      ownPhotoCount: own,
      isGroup,
      children
    });
  }

  subfolders
    .filter(s => !placed.has(s.name))
    .sort((a, b) => naturalCompare(a.name, b.name))
    .forEach(s => sections.push({ name: s.name, photoCount: s.photoCount, ownPhotoCount: s.photoCount, isGroup: false, children: [] }));

  return sections;
}

export function flattenFolderSections(sections: FolderSection[]): FolderDisplayEntry[] {
  const out: FolderDisplayEntry[] = [];
  for (const s of sections) {
    out.push({ name: s.name, depth: 0, isGroup: s.isGroup, photoCount: s.photoCount });
    for (const c of s.children) {
      out.push({ name: c.name, depth: 1, isGroup: false, parent: s.name, photoCount: c.photoCount });
    }
  }
  return out;
}

export function findFolderSection(sections: FolderSection[], name: string): FolderSection | undefined {
  for (const s of sections) {
    if (s.name === name) return s;
    const child = s.children.find(c => c.name === name);
    if (child) return child;
  }
  return undefined;
}

// Subfolder names to query when a section is selected as filter (a group includes its children)
export function folderFilterNames(section: FolderSection): string[] {
  return section.isGroup ? [section.name, ...section.children.map(c => c.name)] : [section.name];
}

// Build a flat tree from a plain ordered list of names (legacy localStorage format)
export function folderTreeFromNames(names: string[]): FolderNode[] {
  return sanitizeFolderTree(names.map(name => ({ name })));
}

class GalleryService {
  private readonly LOCAL_STORAGE_KEY = 'photo-galleries'; // For migration only
  private readonly PHOTOS_KEY = 'gallery-photos';
  private readonly AUTH_KEY = 'gallery-auth-sessions';
  private readonly DEFAULT_BUCKET = 'photos'; // Default Supabase bucket name
  private readonly GALLERIES_TABLE = 'galleries'; // Supabase table name
  private readonly PHOTOS_TABLE = 'photos'; // Supabase photos table
  
  private migrationComplete = false;

  // Natural sort function that handles numbers correctly
  private naturalSort = (a: string, b: string): number => {
    return a.localeCompare(b, undefined, { 
      numeric: true, 
      sensitivity: 'base' 
    });
  };

  // Order real subfolders according to the gallery's folder tree (groups without photos are dropped)
  private applyFolderTree(subfolders: SubfolderInfo[], tree?: FolderNode[] | null): SubfolderInfo[] {
    const byName = new Map(subfolders.map(s => [s.name, s]));
    return flattenFolderSections(buildFolderSections(subfolders, tree))
      .filter(entry => byName.has(entry.name))
      .map(entry => ({ ...byName.get(entry.name)!, parent: entry.parent }));
  }

  private async loadFolderTree(galleryId: string): Promise<FolderNode[]> {
    try {
      const gallery = await this.getGallery(galleryId);
      return gallery?.folderTree || [];
    } catch (error) {
      console.error('Error loading folder tree:', error);
      return [];
    }
  }

  // Check if database tables exist and are accessible
  // The probe used to run three queries at every call (15 call sites): it now runs once per
  // page load and the promise is shared.
  private healthProbe: Promise<{ tablesExist: boolean; functionsExist: boolean }> | null = null;

  private checkDatabaseHealth(): Promise<{ tablesExist: boolean; functionsExist: boolean }> {
    if (!this.healthProbe) {
      this.healthProbe = this.probeDatabaseHealth().then(result => {
        if (!result.tablesExist) this.healthProbe = null; // retry later if the probe failed
        return result;
      });
    }
    return this.healthProbe;
  }

  private async probeDatabaseHealth(): Promise<{ tablesExist: boolean; functionsExist: boolean }> {
    if (!supabaseService.isReady()) {
      return { tablesExist: false, functionsExist: false };
    }

    try {
      // Test galleries table
      const { error: galleriesError } = await supabaseService.client
        .from(this.GALLERIES_TABLE)
        .select('id')
        .limit(1);

      // Test photos table
      const { error: photosError } = await supabaseService.client
        .from(this.PHOTOS_TABLE)
        .select('id')
        .limit(1);

      // Test function
      const { error: functionError } = await supabaseService.client
        .rpc('get_gallery_subfolders', { gallery_id_param: 'test' });

      const tablesExist = !galleriesError && !photosError;
      const functionsExist = !functionError || functionError.code !== 'PGRST202';

      console.log('Database health check:', { 
        tablesExist, 
        functionsExist,
        galleriesError: galleriesError?.code,
        photosError: photosError?.code,
        functionError: functionError?.code
      });

      return { tablesExist, functionsExist };
    } catch (error) {
      console.error('Database health check failed:', error);
      return { tablesExist: false, functionsExist: false };
    }
  }

  // Initialize and ensure table exists
  private async ensureTableExists(): Promise<void> {
    if (!supabaseService.isReady()) {
      console.warn('⚠️ Supabase not ready - this should not happen with hardcoded config');
      return;
    }

    try {
      const health = await this.checkDatabaseHealth();
      
      if (!health.tablesExist) {
        console.warn('⚠️ Database tables do not exist. Please run the SQL setup script.');
        console.log('📝 Execute the SUPABASE_FOLDERS_UPDATE.sql file in your Supabase SQL Editor.');
      }
      
      if (!health.functionsExist) {
        console.warn('⚠️ Database functions do not exist. Please run the SQL setup script.');
      }
    } catch (error) {
      console.error('❌ Error checking database health:', error);
    }
  }

  // Migrate local galleries to Supabase (one-time operation)
  private async migrateLocalGalleries(): Promise<void> {
    if (this.migrationComplete || !supabaseService.isReady()) {
      return;
    }

    try {
      const health = await this.checkDatabaseHealth();
      if (!health.tablesExist) {
        console.warn('Cannot migrate - database tables not ready');
        return;
      }

      console.log('🔄 Checking for local galleries to migrate...');
      
      const localData = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (!localData) {
        this.migrationComplete = true;
        return;
      }

      const localGalleries = JSON.parse(localData);
      if (!Array.isArray(localGalleries) || localGalleries.length === 0) {
        this.migrationComplete = true;
        return;
      }

      console.log(`📦 Found ${localGalleries.length} local galleries to migrate`);

      // Transform local format to Supabase format
      const supabaseGalleries = localGalleries.map(gallery => ({
        id: gallery.id,
        name: gallery.name,
        description: gallery.description || null,
        created_at: gallery.createdAt,
        updated_at: gallery.updatedAt,
        is_public: gallery.isPublic,
        password: gallery.password || null,
        bucket_folder: gallery.bucketFolder || null,
        bucket_name: gallery.bucketName || this.DEFAULT_BUCKET,
        photo_count: gallery.photoCount || 0,
        view_count: gallery.viewCount || 0,
        allow_comments: gallery.allowComments !== false,
        allow_favorites: gallery.allowFavorites !== false
      }));

      // Insert galleries into Supabase (upsert to handle duplicates)
      const { error } = await supabaseService.client
        .from(this.GALLERIES_TABLE)
        .upsert(supabaseGalleries, {
          onConflict: 'id'
        });

      if (error) {
        console.error('❌ Error migrating galleries:', error);
        throw error;
      }

      console.log('✅ Successfully migrated galleries to Supabase');
      
      // Backup local data and clear it
      localStorage.setItem(`${this.LOCAL_STORAGE_KEY}-backup`, localData);
      localStorage.removeItem(this.LOCAL_STORAGE_KEY);
      
      this.migrationComplete = true;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      // Don't mark as complete so it can be retried
    }
  }

  // Gallery Management - Using Supabase (always configured now)
  async getGalleries(): Promise<Gallery[]> {
    try {
      // With hardcoded credentials, Supabase should always be ready
      if (!supabaseService.isReady()) {
        console.error('❌ Supabase should be ready with hardcoded config');
        return this.getLocalGalleries();
      }

      await this.ensureTableExists();
      
      const health = await this.checkDatabaseHealth();
      if (!health.tablesExist) {
        console.warn('⚠️ Database not ready, falling back to local storage');
        return this.getLocalGalleries();
      }

      await this.migrateLocalGalleries();

      console.log('📂 Fetching galleries from Supabase...');
      
      const { data, error } = await supabaseService.client
        .from(this.GALLERIES_TABLE)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching galleries from Supabase:', error);
        // Fallback to local storage if Supabase fails
        return this.getLocalGalleries();
      }

      // Transform Supabase format to our interface
      const galleries: Gallery[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isPublic: row.is_public,
        hasPassword: !!row.has_password,
        bucketFolder: row.bucket_folder || undefined,
        bucketName: row.bucket_name || this.DEFAULT_BUCKET,
        photoCount: row.photo_count || 0,
        viewCount: row.view_count || 0,
        allowComments: row.allow_comments !== false,
        allowFavorites: row.allow_favorites !== false,
        featuredPhotoUrl: row.featured_photo_url || undefined,
        featuredPhotoId: row.featured_photo_id || undefined,
        category: row.category || undefined,
        folderTree: row.folder_tree ? sanitizeFolderTree(row.folder_tree) : undefined,
        instructions: normalizeInstructions(row.instructions)
      }));

      console.log(`✅ Loaded ${galleries.length} galleries from Supabase`);
      return galleries;
      
    } catch (error) {
      console.error('❌ Error loading galleries:', error);
      // Final fallback to local storage
      return this.getLocalGalleries();
    }
  }

  // Fallback method for local storage
  private async getLocalGalleries(): Promise<Gallery[]> {
    try {
      const stored = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (!stored) return [];
      
      const galleries = JSON.parse(stored);
      return Array.isArray(galleries) ? galleries : [];
    } catch (error) {
      console.error('Error loading local galleries:', error);
      return [];
    }
  }

  // A page load reads the same gallery several times (page, folders, photos): cache it briefly.
  private galleryCache = new Map<string, { gallery: Gallery | null; at: number }>();
  private readonly GALLERY_CACHE_MS = 5000;

  private invalidateGallery(id?: string): void {
    if (id) this.galleryCache.delete(id); else this.galleryCache.clear();
  }

  async getGallery(id: string): Promise<Gallery | null> {
    const cached = this.galleryCache.get(id);
    if (cached && Date.now() - cached.at < this.GALLERY_CACHE_MS) return cached.gallery;
    const gallery = await this.fetchGallery(id);
    this.galleryCache.set(id, { gallery, at: Date.now() });
    return gallery;
  }

  private async fetchGallery(id: string): Promise<Gallery | null> {
    try {
      
      if (!supabaseService.isReady()) {
        console.log('⚠️  Supabase not ready, checking local storage');
        const galleries = await this.getLocalGalleries();
        const found = galleries.find(g => g.id === id) || null;
        console.log(found ? `✅ Found gallery locally: ${found.name}` : `❌ Gallery ${id} not found locally`);
        return found;
      }

      await this.ensureTableExists();
      
      const health = await this.checkDatabaseHealth();
      if (!health.tablesExist) {
        console.warn('⚠️ Database not ready, checking local storage');
        const galleries = await this.getLocalGalleries();
        const found = galleries.find(g => g.id === id) || null;
        console.log(found ? `✅ Found gallery locally: ${found.name}` : `❌ Gallery ${id} not found locally`);
        return found;
      }

      await this.migrateLocalGalleries(); // Ensure migration is complete

      console.log(`📡 Fetching gallery ${id} from Supabase...`);
      const { data, error } = await supabaseService.client
        .from(this.GALLERIES_TABLE)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`❌ Error fetching gallery ${id} from Supabase:`, error);
        
        if (error.code === 'PGRST116' || error.code === 'PGRST117') {
          // Table doesn't exist or no results found
          console.log('📂 Falling back to local storage...');
          const galleries = await this.getLocalGalleries();
          const found = galleries.find(g => g.id === id) || null;
          console.log(found ? `✅ Found gallery locally: ${found.name}` : `❌ Gallery ${id} not found locally either`);
          return found;
        }
        
        return null;
      }

      if (!data) {
        console.log(`❌ No data returned for gallery ${id}`);
        return null;
      }

      // Transform to our interface
      const gallery = {
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        isPublic: data.is_public,
        hasPassword: !!data.has_password,
        bucketFolder: data.bucket_folder || undefined,
        bucketName: data.bucket_name || this.DEFAULT_BUCKET,
        photoCount: data.photo_count || 0,
        viewCount: data.view_count || 0,
        allowComments: data.allow_comments !== false,
        allowFavorites: data.allow_favorites !== false,
        featuredPhotoUrl: data.featured_photo_url || undefined,
        featuredPhotoId: data.featured_photo_id || undefined,
        category: data.category || undefined,
        folderTree: data.folder_tree ? sanitizeFolderTree(data.folder_tree) : undefined,
        instructions: normalizeInstructions(data.instructions)
      };

      console.log(`✅ Found gallery in Supabase: ${gallery.name}`);
      return gallery;
      
    } catch (error) {
      console.error(`❌ Error loading gallery ${id}:`, error);
      
      // Final fallback to local storage
      try {
        console.log('🔄 Final fallback to local storage...');
        const galleries = await this.getLocalGalleries();
        const found = galleries.find(g => g.id === id) || null;
        console.log(found ? `✅ Found gallery in final fallback: ${found.name}` : `❌ Gallery ${id} not found anywhere`);
        return found;
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        return null;
      }
    }
  }

  // Alias for compatibility
  async getGalleryById(id: string): Promise<Gallery | null> {
    return this.getGallery(id);
  }

  // Force sync from Supabase - useful when a gallery is not found locally
  async createGallery(options?: {
    name?: string;
    description?: string;
    isPublic?: boolean;
    password?: string;
    bucketFolder?: string;
    bucketName?: string;
    allowComments?: boolean;
    allowFavorites?: boolean;
    category?: string;
  }): Promise<Gallery> {
    try {
      const id = this.generateId();
      const now = new Date().toISOString();
      
      // Generate bucket folder if not provided
      const bucketFolder = options?.bucketFolder || `gallery-${id}`;
      const bucketName = options?.bucketName || this.DEFAULT_BUCKET;
      
      const newGallery: Gallery = {
        id,
        name: options?.name || `Gallery ${id}`,
        description: options?.description || undefined,
        createdAt: now,
        updatedAt: now,
        isPublic: options?.isPublic ?? true,
        password: options?.password,
        bucketFolder,
        bucketName,
        photoCount: 0,
        viewCount: 0,
        allowComments: options?.allowComments ?? true,
        allowFavorites: options?.allowFavorites ?? true,
        featuredPhotoUrl: undefined,
        featuredPhotoId: undefined,
        category: options?.category || undefined
      };

      // With hardcoded credentials, always use Supabase
      if (supabaseService.isReady()) {
        await this.ensureTableExists();
        
        const health = await this.checkDatabaseHealth();
        if (!health.tablesExist) {
          throw new Error('Database tables not ready. Please run the SQL setup script.');
        }

        // Insert into Supabase
        const { error } = await supabaseService.client
          .from(this.GALLERIES_TABLE)
          .insert([{
            id: newGallery.id,
            name: newGallery.name,
            description: newGallery.description || null,
            created_at: newGallery.createdAt,
            updated_at: newGallery.updatedAt,
            is_public: newGallery.isPublic,
            password: null, // hashed separately, see set_gallery_password
            bucket_folder: newGallery.bucketFolder,
            bucket_name: newGallery.bucketName,
            photo_count: newGallery.photoCount,
            view_count: newGallery.viewCount,
            allow_comments: newGallery.allowComments,
            allow_favorites: newGallery.allowFavorites,
            featured_photo_url: newGallery.featuredPhotoUrl || null,
            featured_photo_id: newGallery.featuredPhotoId || null,
            category: newGallery.category || null
          }]);

        if (error) {
          console.error('Error creating gallery in Supabase:', error);
          throw new Error(`Failed to create gallery: ${error.message}`);
        }

        // The password is hashed server-side (gallery_secrets), never stored in clear text
        if (newGallery.password) {
          const { error: pwdError } = await supabaseService.client
            .rpc('set_gallery_password', { p_gallery_id: newGallery.id, p_password: newGallery.password });
          if (pwdError) console.error('Error setting gallery password:', pwdError);
          else newGallery.hasPassword = true;
        }
        newGallery.password = undefined;

        // Create folder in Supabase storage
        try {
          await supabaseService.createFolder(bucketName, bucketFolder);
          console.log(`✅ Created Supabase folder: ${bucketName}/${bucketFolder}`);
        } catch (error) {
          console.warn('⚠️ Could not create Supabase folder:', error);
        }

        console.log('✅ Gallery created in Supabase:', newGallery.id);
      } else {
        // This should not happen with hardcoded config, but keep as fallback
        const galleries = await this.getLocalGalleries();
        galleries.push(newGallery);
        localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(galleries));
        console.log('✅ Gallery created locally (fallback):', newGallery.id);
      }
      
      return newGallery;
    } catch (error) {
      console.error('Error creating gallery:', error);
      throw new Error(`Failed to create gallery: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateGallery(id: string, updates: Partial<Gallery>): Promise<Gallery | null> {
    try {
      const updatedAt = new Date().toISOString();
      
      if (supabaseService.isReady()) {
        await this.ensureTableExists();
        
        const health = await this.checkDatabaseHealth();
        if (!health.tablesExist) {
          console.warn('Database not ready, falling back to local storage');
          // Fallback to local storage
          const galleries = await this.getLocalGalleries();
          const index = galleries.findIndex(g => g.id === id);
          
          if (index === -1) return null;
          
          galleries[index] = {
            ...galleries[index],
            ...updates,
            updatedAt
          };
          
          localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(galleries));
          return galleries[index];
        }

        // Transform updates to Supabase format
        const supabaseUpdates: any = {
          updated_at: updatedAt
        };

        if (updates.name !== undefined) supabaseUpdates.name = updates.name;
        if (updates.description !== undefined) supabaseUpdates.description = updates.description || null;
        if (updates.isPublic !== undefined) supabaseUpdates.is_public = updates.isPublic;
        // The password goes through the hashed store (gallery_secrets), not the galleries row.
        // Empty string removes the protection; undefined leaves it unchanged.
        if (updates.password !== undefined) {
          const { error: pwdError } = await supabaseService.client
            .rpc('set_gallery_password', { p_gallery_id: id, p_password: updates.password || '' });
          if (pwdError) {
            console.error('Error updating gallery password:', pwdError);
            return null;
          }
        }
        if (updates.bucketFolder !== undefined) supabaseUpdates.bucket_folder = updates.bucketFolder;
        if (updates.bucketName !== undefined) supabaseUpdates.bucket_name = updates.bucketName;
        if (updates.photoCount !== undefined) supabaseUpdates.photo_count = updates.photoCount;
        if (updates.viewCount !== undefined) supabaseUpdates.view_count = updates.viewCount;
        if (updates.allowComments !== undefined) supabaseUpdates.allow_comments = updates.allowComments;
        if (updates.allowFavorites !== undefined) supabaseUpdates.allow_favorites = updates.allowFavorites;
        if (updates.featuredPhotoUrl !== undefined) supabaseUpdates.featured_photo_url = updates.featuredPhotoUrl || null;
        if (updates.featuredPhotoId !== undefined) supabaseUpdates.featured_photo_id = updates.featuredPhotoId || null;
        if (updates.category !== undefined) supabaseUpdates.category = updates.category || null;
        if (updates.folderTree !== undefined) {
          const tree = sanitizeFolderTree(updates.folderTree);
          supabaseUpdates.folder_tree = tree.length > 0 ? tree : null;
        }
        if (updates.instructions !== undefined) supabaseUpdates.instructions = updates.instructions ? normalizeInstructions(updates.instructions) : null;

        this.invalidateGallery(id);
        const { data, error } = await supabaseService.client
          .from(this.GALLERIES_TABLE)
          .update(supabaseUpdates)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Error updating gallery in Supabase:', error);
          return null;
        }

        if (!data) return null;

        // Transform back to our interface
        return {
          id: data.id,
          name: data.name,
          description: data.description || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          isPublic: data.is_public,
          hasPassword: !!data.has_password,
          bucketFolder: data.bucket_folder || undefined,
          bucketName: data.bucket_name || this.DEFAULT_BUCKET,
          photoCount: data.photo_count || 0,
          viewCount: data.view_count || 0,
          allowComments: data.allow_comments !== false,
          allowFavorites: data.allow_favorites !== false,
          featuredPhotoUrl: data.featured_photo_url || undefined,
          featuredPhotoId: data.featured_photo_id || undefined,
          category: data.category || undefined,
          folderTree: data.folder_tree ? sanitizeFolderTree(data.folder_tree) : undefined,
        instructions: normalizeInstructions(data.instructions)
        };
      } else {
        // Fallback to local storage
        const galleries = await this.getLocalGalleries();
        const index = galleries.findIndex(g => g.id === id);
        
        if (index === -1) return null;
        
        galleries[index] = {
          ...galleries[index],
          ...updates,
          updatedAt
        };
        
        localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(galleries));
        return galleries[index];
      }
    } catch (error) {
      console.error('Error updating gallery:', error);
      return null;
    }
  }

  async deleteGallery(id: string): Promise<boolean> {
    try {
      const gallery = await this.getGallery(id);
      if (!gallery) return false;

      // Storage first (needs the photo rows to know the paths), then the row (cascades to photos,
      // favorites and comments).
      await this.deleteAllPhotos(id);

      const { error } = await supabaseService.client
        .from(this.GALLERIES_TABLE)
        .delete()
        .eq('id', id);
      if (error) {
        console.error('Error deleting gallery from Supabase:', error);
        return false;
      }

      this.invalidateGallery(id);
      this.clearGalleryAuth(id);
      return true;
    } catch (error) {
      console.error('Error deleting gallery:', error);
      return false;
    }
  }

  // Subfolders of a gallery, ordered and annotated (parent) according to the folder tree
  async getGallerySubfolders(galleryId: string): Promise<SubfolderInfo[]> {
    const [subfolders, tree] = await Promise.all([
      this.loadSubfolderInfos(galleryId),
      this.loadFolderTree(galleryId)
    ]);
    return this.applyFolderTree(subfolders, tree);
  }

  // Full folder hierarchy (groups included, even empty) with aggregated photo counts
  async getGalleryFolderSections(galleryId: string, options?: { keepEmptyGroups?: boolean }): Promise<FolderSection[]> {
    const [subfolders, tree] = await Promise.all([
      this.loadSubfolderInfos(galleryId),
      this.loadFolderTree(galleryId)
    ]);
    return buildFolderSections(subfolders, tree, options);
  }

  // Raw subfolder list with counts (unordered)
  private async loadSubfolderInfos(galleryId: string): Promise<SubfolderInfo[]> {
    try {
      if (!supabaseService.isReady()) {
        // Local fallback - scan photos in local storage
        const photos = await this.getPhotos(galleryId);
        const subfolderMap = new Map<string, SubfolderInfo>();
        
        photos.forEach(photo => {
          if (photo.subfolder) {
            const existing = subfolderMap.get(photo.subfolder);
            if (existing) {
              existing.photoCount++;
              if (photo.uploadedAt > existing.lastUpdated) {
                existing.lastUpdated = photo.uploadedAt;
              }
            } else {
              subfolderMap.set(photo.subfolder, {
                name: photo.subfolder,
                photoCount: 1,
                lastUpdated: photo.uploadedAt
              });
            }
          }
        });
        
        return Array.from(subfolderMap.values());
      }

      const health = await this.checkDatabaseHealth();
      if (!health.functionsExist) {
        console.warn('Database function get_gallery_subfolders not available, using fallback');
        // Fallback to manual query if function doesn't exist
        return await this.getSubfoldersFallback(galleryId);
      }

      // Use Supabase function if available
      const { data, error } = await supabaseService.client
        .rpc('get_gallery_subfolders', { gallery_id_param: galleryId });

      if (error) {
        console.error('Error fetching subfolders:', error);
        // Use fallback method
        return await this.getSubfoldersFallback(galleryId);
      }

      const subfolderData = (data || []).map((row: any) => ({
        name: row.subfolder,
        photoCount: parseInt(row.photo_count),
        lastUpdated: new Date().toISOString() // Fallback date
      }));

      return subfolderData;
      
    } catch (error) {
      console.error('Error getting gallery subfolders:', error);
      return [];
    }
  }

  // Fallback method to get subfolders without using the SQL function
  private async getSubfoldersFallback(galleryId: string): Promise<SubfolderInfo[]> {
    try {
      if (!supabaseService.isReady()) {
        return [];
      }

      const health = await this.checkDatabaseHealth();
      if (!health.tablesExist) {
        return [];
      }

      // Manual query to group by subfolder
      const { data, error } = await supabaseService.client
        .from(this.PHOTOS_TABLE)
        .select('subfolder')
        .eq('gallery_id', galleryId)
        .not('subfolder', 'is', null)
        .not('subfolder', 'eq', '');

      if (error) {
        console.error('Error in subfolder fallback query:', error);
        return [];
      }

      // Count manually since we can't use SQL aggregation
      const subfolderCounts = new Map<string, number>();
      (data || []).forEach(row => {
        if (row.subfolder) {
          subfolderCounts.set(row.subfolder, (subfolderCounts.get(row.subfolder) || 0) + 1);
        }
      });

      const subfolderData = Array.from(subfolderCounts.entries()).map(([name, count]) => ({
        name,
        photoCount: count,
        lastUpdated: new Date().toISOString()
      }));

      return subfolderData;

    } catch (error) {
      console.error('Error in subfolder fallback:', error);
      return [];
    }
  }

  // Gallery Authentication - Keep existing logic
  async authenticateGallery(galleryId: string, password: string): Promise<boolean> {
    try {
      const gallery = await this.getGallery(galleryId);
      if (!gallery) return false;
      
      if (!gallery.hasPassword) return true;

      // Verified server-side against the bcrypt hash (gallery_secrets); the hash never leaves the database
      const { data, error } = await supabaseService.client
        .rpc('verify_gallery_password', { p_gallery_id: galleryId, p_password: password });
      if (error) {
        console.error('Error verifying gallery password:', error);
        return false;
      }
      const isAuthenticated = data === true;
      if (isAuthenticated) this.setGalleryAuth(galleryId);
      return isAuthenticated;
    } catch (error) {
      console.error('Error authenticating gallery:', error);
      return false;
    }
  }

  isGalleryAuthenticated(galleryId: string): boolean {
    try {
      const authSessions = this.getAuthSessions();
      return authSessions.includes(galleryId);
    } catch (error) {
      return false;
    }
  }

  private setGalleryAuth(galleryId: string): void {
    try {
      const authSessions = this.getAuthSessions();
      if (!authSessions.includes(galleryId)) {
        authSessions.push(galleryId);
        localStorage.setItem(this.AUTH_KEY, JSON.stringify(authSessions));
      }
    } catch (error) {
      console.error('Error setting gallery auth:', error);
    }
  }

  private clearGalleryAuth(galleryId: string): void {
    try {
      const authSessions = this.getAuthSessions();
      const filtered = authSessions.filter(id => id !== galleryId);
      localStorage.setItem(this.AUTH_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error clearing gallery auth:', error);
    }
  }

  private getAuthSessions(): string[] {
    try {
      const stored = localStorage.getItem(this.AUTH_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  // Photo Management with Supabase Integration
  // `subfolder` may be a single name or a list of names (e.g. a group and its children)
  async getPhotos(galleryId: string, subfolder?: string | string[]): Promise<Photo[]> {
    try {
      const gallery = await this.getGallery(galleryId);
      if (!gallery) {
        console.error(`Gallery ${galleryId} not found`);
        return [];
      }

      // If Supabase is configured, fetch photos from database
      if (supabaseService.isReady()) {
        const health = await this.checkDatabaseHealth();
        if (health.tablesExist) {
          console.log(`📂 Fetching photos from Supabase database for gallery: ${galleryId}${subfolder ? `, subfolder: ${subfolder}` : ''}`);
          return await this.fetchPhotosFromSupabaseDB(galleryId, subfolder);
        } else {
          console.warn('Database not ready, using fallback method');
          return await this.fetchPhotosFromSupabase(gallery);
        }
      }

      // Fallback to cached photos
      const stored = localStorage.getItem(`${this.PHOTOS_KEY}-${galleryId}`);
      if (stored) {
        const photos = JSON.parse(stored);
        let filteredPhotos = Array.isArray(photos) ? photos : [];
        
        // Filter by subfolder(s) if specified
        if (subfolder) {
          const wanted = Array.isArray(subfolder) ? subfolder : [subfolder];
          filteredPhotos = filteredPhotos.filter((photo: Photo) => !!photo.subfolder && wanted.includes(photo.subfolder));
        }
        
        // Sort naturally by name (handles numbers correctly)
        filteredPhotos.sort((a: Photo, b: Photo) => this.naturalSort(a.name, b.name));
        
        return filteredPhotos;
      }

      console.log(`No photos found for gallery ${galleryId}`);
      return [];
      
    } catch (error) {
      console.error('Error loading photos:', error);
      return [];
    }
  }

  // NEW: Fetch photos from Supabase database (with subfolder support)
  private async fetchPhotosFromSupabaseDB(galleryId: string, subfolder?: string | string[]): Promise<Photo[]> {
    try {
      // Get data without sorting first (we'll sort in JavaScript for natural ordering)
      // PostgREST caps a request at 1000 rows: page through the gallery.
      const PAGE = 1000;
      const rows: any[] = [];
      for (let from = 0; ; from += PAGE) {
        let query = supabaseService.client
          .from(this.PHOTOS_TABLE)
          .select('*')
          .eq('gallery_id', galleryId)
          .order('name', { ascending: true })
          .range(from, from + PAGE - 1);
        if (Array.isArray(subfolder)) {
          query = query.in('subfolder', subfolder);
        } else if (subfolder) {
          query = query.eq('subfolder', subfolder);
        }
        const { data, error } = await query;
        if (error) {
          console.error('Error fetching photos from database:', error);
          return [];
        }
        rows.push(...(data || []));
        if (!data || data.length < PAGE) break;
      }

      const photos: Photo[] = rows.map(row => ({
        id: row.id,
        galleryId: row.gallery_id,
        name: row.name,
        originalName: row.name, // Assuming name is the original name
        url: row.url,
        description: row.description || '',
        uploadedAt: row.created_at,
        size: row.file_size || 0,
        mimeType: row.file_type || 'image/jpeg',
        bucketPath: row.bucket_path || undefined,
        thumbnailUrl: row.thumbnail_url || undefined,
        width: row.width || undefined,
        height: row.height || undefined,
        subfolder: row.subfolder || undefined
      }));

      // Sort naturally by name (handles numbers correctly)
      photos.sort((a, b) => this.naturalSort(a.name, b.name));

      console.log(`✅ Loaded ${photos.length} photos from Supabase database`);
      return photos;
      
    } catch (error) {
      console.error('Error fetching photos from Supabase database:', error);
      return [];
    }
  }

  // Legacy method for backward compatibility
  private async fetchPhotosFromSupabase(gallery: Gallery): Promise<Photo[]> {
    try {
      if (!gallery.bucketName || !gallery.bucketFolder) {
        return [];
      }

      const files = await supabaseService.listFiles(gallery.bucketName, gallery.bucketFolder);
      
      const photos: Photo[] = files.map(file => {
        const filePath = `${gallery.bucketFolder}/${file.name}`;
        const publicUrl = supabaseService.getPublicUrl(gallery.bucketName!, filePath);
        
        return {
          id: `${gallery.id}-${file.name}`,
          galleryId: gallery.id,
          name: file.name,
          originalName: file.name,
          url: publicUrl || '',
          description: '',
          uploadedAt: file.created_at,
          size: file.metadata?.size || 0,
          mimeType: file.metadata?.mimetype || 'image/jpeg',
          bucketPath: filePath,
          supabaseFile: file
        };
      }).sort((a, b) => this.naturalSort(a.name, b.name));

      // Cache photos locally for faster subsequent loads
      localStorage.setItem(`${this.PHOTOS_KEY}-${gallery.id}`, JSON.stringify(photos));
      
      // Update gallery photo count
      await this.updateGallery(gallery.id, { photoCount: photos.length });

      console.log(`✅ Loaded ${photos.length} photos from Supabase`);
      return photos;
      
    } catch (error) {
      console.error('Error fetching photos from Supabase:', error);
      return [];
    }
  }

  // Upload photos to Supabase WITH SUBFOLDER SUPPORT
  async uploadPhotos(
    galleryId: string, 
    files: File[],
    options?: {
      subfolder?: string;
      onProgress?: (completed: number, total: number) => void;
    }
  ): Promise<{ successful: Photo[]; failed: { file: File; error: string }[] }> {
    const gallery = await this.getGallery(galleryId);
    if (!gallery) {
      throw new Error('Gallery not found');
    }

    if (!supabaseService.isReady()) {
      throw new Error('Supabase not configured');
    }

    if (!gallery.bucketName || !gallery.bucketFolder) {
      throw new Error('Gallery bucket configuration missing');
    }

    const successful: Photo[] = [];
    const failed: { file: File; error: string }[] = [];
    const subfolder = options?.subfolder?.trim() || undefined;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Validate file type
        if (!(supabaseService.constructor as typeof supabaseService.constructor & { isValidImageFile(f: File): boolean }).isValidImageFile(file)) {
          failed.push({ file, error: 'Invalid image file type' });
          continue;
        }

        // Clean filename for storage (remove accents, spaces, special chars)
        const cleanFileName = file.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove accents
          .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
          .replace(/_+/g, '_'); // Replace multiple underscores with single
        
        // Build file path with subfolder support
        const subfolderPath = subfolder ? `${subfolder}/` : '';
        const filePath = `${gallery.bucketFolder}/${subfolderPath}${cleanFileName}`;

        // Upload to Supabase Storage
        const uploadResult = await supabaseService.uploadFile(
          gallery.bucketName,
          filePath,
          file,
          { upsert: false }
        );

        if (uploadResult.success) {
          // Get public URL
          const publicUrl = supabaseService.getPublicUrl(gallery.bucketName, filePath);

          // Thumbnail for grids (generated here, no image transformation on this plan)
          let thumbnailUrl: string | undefined;
          let width: number | undefined;
          let height: number | undefined;
          try {
            const thumb = await createThumbnail(file);
            width = thumb.originalWidth;
            height = thumb.originalHeight;
            const thumbPath = thumbnailPathFor(gallery.bucketFolder, filePath);
            const thumbUpload = await supabaseService.uploadFile(gallery.bucketName, thumbPath, thumb.blob, { upsert: true, contentType: 'image/jpeg' });
            if (thumbUpload.success) thumbnailUrl = supabaseService.getPublicUrl(gallery.bucketName, thumbPath) || undefined;
          } catch (thumbError) {
            console.warn('Thumbnail generation failed, the original will be used:', thumbError);
          }
          
          if (publicUrl) {
            const photo: Photo = {
              id: `${galleryId}-${cleanFileName}`,
              galleryId,
              name: file.name, // Keep original name for display
              originalName: file.name,
              url: publicUrl,
              description: '',
              uploadedAt: new Date().toISOString(),
              size: file.size,
              mimeType: file.type,
              bucketPath: filePath,
              thumbnailUrl,
              width,
              height,
              subfolder: subfolder
            };

            // Try to insert photo record into database if tables exist
            const health = await this.checkDatabaseHealth();
            if (health.tablesExist) {
              try {
                const photoRecord = {
                  gallery_id: galleryId,
                  name: file.name, // Use original name for display
                  url: publicUrl,
                  description: null,
                  subfolder: subfolder || null,
                  file_size: file.size,
                  file_type: file.type,
                  bucket_path: filePath,
                  thumbnail_url: thumbnailUrl || null,
                  width: width || null,
                  height: height || null
                };

                const { data: insertedPhoto, error: insertError } = await supabaseService.client
                  .from(this.PHOTOS_TABLE)
                  .insert([photoRecord])
                  .select()
                  .single();

                if (insertedPhoto) {
                  photo.id = insertedPhoto.id;
                }

                if (insertError) {
                  console.warn('Error inserting photo record:', insertError);
                  // Continue anyway since file was uploaded successfully
                }
              } catch (dbError) {
                console.warn('Database insertion failed, continuing with file upload:', dbError);
              }
            }

            successful.push(photo);
          } else {
            failed.push({ file, error: 'Failed to get public URL' });
          }
        } else {
          failed.push({ file, error: uploadResult.error || 'Upload failed' });
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        failed.push({ file, error: 'Upload error' });
      }

      options?.onProgress?.(i + 1, files.length);
    }

    // photo_count is maintained by a database trigger
    this.invalidateGallery(galleryId);
    localStorage.removeItem(`${this.PHOTOS_KEY}-${galleryId}`);

    return { successful, failed };
  }

  // Removes storage objects in batches; returns the number actually deleted.
  private async removeStorageObjects(bucketName: string, paths: string[]): Promise<number> {
    let removed = 0;
    for (let i = 0; i < paths.length; i += 100) {
      const batch = paths.slice(i, i + 100);
      const { data, error } = await supabaseService.client.storage.from(bucketName).remove(batch);
      if (error) {
        console.error('Storage removal failed:', error.message);
        continue;
      }
      removed += (data || []).length;
    }
    return removed;
  }

  // Lists every object under a folder, sub-folders included (storage list() is not recursive).
  private async listStorageObjectsRecursive(bucketName: string, folder: string): Promise<string[]> {
    const out: string[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabaseService.client.storage.from(bucketName).list(folder, { limit: 1000, offset });
      if (error || !data) break;
      for (const entry of data) {
        const path = `${folder}/${entry.name}`;
        if (entry.id === null) out.push(...await this.listStorageObjectsRecursive(bucketName, path));
        else out.push(path);
      }
      if (data.length < 1000) break;
      offset += 1000;
    }
    return out;
  }

  private storagePathsOf(gallery: Gallery, photo: Pick<Photo, 'bucketPath' | 'thumbnailUrl'>): string[] {
    if (!photo.bucketPath || !gallery.bucketFolder) return [];
    const paths = [photo.bucketPath];
    if (photo.thumbnailUrl) paths.push(thumbnailPathFor(gallery.bucketFolder, photo.bucketPath));
    return paths;
  }

  async deletePhoto(galleryId: string, photoId: string): Promise<boolean> {
    try {
      const gallery = await this.getGallery(galleryId);
      if (!gallery) return false;

      const photos = await this.getPhotos(galleryId);
      const photo = photos.find(p => p.id === photoId);
      if (!photo) return false;

      const { error: dbError } = await supabaseService.client
        .from(this.PHOTOS_TABLE)
        .delete()
        .eq('id', photoId);
      if (dbError) {
        console.error('Error deleting photo from database:', dbError);
        return false;
      }

      // Storage: original + thumbnail, from the real path stored at upload time
      const paths = this.storagePathsOf(gallery, photo);
      if (paths.length === 0) {
        console.warn(`Photo ${photo.name}: no storage path recorded, file left in place`);
      } else {
        const removed = await this.removeStorageObjects(gallery.bucketName || this.DEFAULT_BUCKET, paths);
        if (removed === 0) console.warn(`Photo ${photo.name}: storage file not found (${paths[0]})`);
      }

      await favoritesService.clearPhotoData(galleryId, photoId);
      this.invalidateGallery(galleryId);
      localStorage.removeItem(`${this.PHOTOS_KEY}-${galleryId}`);
      return true;
    } catch (error) {
      console.error('Error deleting photo:', error);
      return false;
    }
  }

  async deleteAllPhotos(galleryId: string): Promise<boolean> {
    try {
      const gallery = await this.getGallery(galleryId);
      if (!gallery) return false;
      const bucketName = gallery.bucketName || this.DEFAULT_BUCKET;

      // Paths known from the table, then whatever is left in the folder (thumbs, .gitkeep, strays)
      const photos = await this.getPhotos(galleryId);
      const known = photos.flatMap(photo => this.storagePathsOf(gallery, photo));

      const { error: dbError } = await supabaseService.client
        .from(this.PHOTOS_TABLE)
        .delete()
        .eq('gallery_id', galleryId);
      if (dbError) {
        console.error('Error deleting photos from database:', dbError);
        return false;
      }

      if (gallery.bucketFolder) {
        await this.removeStorageObjects(bucketName, known);
        const leftovers = await this.listStorageObjectsRecursive(bucketName, gallery.bucketFolder);
        if (leftovers.length > 0) await this.removeStorageObjects(bucketName, leftovers);
      }

      this.invalidateGallery(galleryId);
      localStorage.removeItem(`${this.PHOTOS_KEY}-${galleryId}`);
      return true;
    } catch (error) {
      console.error('Error deleting all photos:', error);
      return false;
    }
  }

  // Set featured photo for a gallery
  async setFeaturedPhoto(galleryId: string, photoId: string): Promise<boolean> {
    try {
      const photos = await this.getPhotos(galleryId);
      const photo = photos.find(p => p.id === photoId);
      
      if (!photo) {
        console.error('Photo not found for featured photo selection');
        return false;
      }

      // Update gallery with featured photo information
      const updatedGallery = await this.updateGallery(galleryId, {
        featuredPhotoUrl: photo.url,
        featuredPhotoId: photoId
      });

      if (updatedGallery) {
        console.log(`✅ Featured photo set for gallery ${galleryId}: ${photo.name}`);
        return true;
      } else {
        console.error('Failed to update gallery with featured photo');
        return false;
      }
    } catch (error) {
      console.error('Error setting featured photo:', error);
      return false;
    }
  }

  // Remove featured photo from a gallery
  async removeFeaturedPhoto(galleryId: string): Promise<boolean> {
    try {
      const updatedGallery = await this.updateGallery(galleryId, {
        featuredPhotoUrl: undefined,
        featuredPhotoId: undefined
      });

      if (updatedGallery) {
        console.log(`✅ Featured photo removed from gallery ${galleryId}`);
        return true;
      } else {
        console.error('Failed to remove featured photo from gallery');
        return false;
      }
    } catch (error) {
      console.error('Error removing featured photo:', error);
      return false;
    }
  }

  // Reassign photos to a different subfolder
  async reassignPhotosToSubfolder(galleryId: string, photoIds: string[], targetSubfolder: string | undefined): Promise<{
    successful: string[];
    failed: string[];
  }> {
    const successful: string[] = [];
    const failed: string[] = [];

    try {
      const gallery = await this.getGallery(galleryId);
      if (!gallery) {
        console.error('Gallery not found');
        return { successful, failed: photoIds };
      }

      // Process each photo
      for (const photoId of photoIds) {
        try {
          // Update in Supabase database if available
          if (supabaseService.isReady()) {
            const health = await this.checkDatabaseHealth();
            if (health.tablesExist) {
              const { error } = await supabaseService.client
                .from(this.PHOTOS_TABLE)
                .update({
                  subfolder: targetSubfolder || null,
                  updated_at: new Date().toISOString()
                })
                .eq('id', photoId)
                .eq('gallery_id', galleryId);

              if (error) {
                console.error(`Failed to update photo ${photoId} in database:`, error);
                failed.push(photoId);
                continue;
              }
            }
          }

          // Update in local cache
          const cacheKey = `${this.PHOTOS_KEY}-${galleryId}`;
          const stored = localStorage.getItem(cacheKey);
          if (stored) {
            const photos = JSON.parse(stored);
            const photoIndex = photos.findIndex((p: Photo) => p.id === photoId);
            if (photoIndex !== -1) {
              photos[photoIndex].subfolder = targetSubfolder;
              localStorage.setItem(cacheKey, JSON.stringify(photos));
            }
          }

          successful.push(photoId);
          console.log(`✅ Photo ${photoId} reassigned to subfolder: ${targetSubfolder || 'root'}`);
        } catch (error) {
          console.error(`Error reassigning photo ${photoId}:`, error);
          failed.push(photoId);
        }
      }

      return { successful, failed };
    } catch (error) {
      console.error('Error reassigning photos:', error);
      return { successful, failed: photoIds };
    }
  }

  // Utility methods
  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  // Generates the missing thumbnails of a gallery from the originals (admin, one-off after
  // the 2026-09 audit for photos uploaded before thumbnails existed).
  async backfillThumbnails(
    galleryId: string,
    onProgress?: (done: number, total: number, current?: string) => void
  ): Promise<{ done: number; failed: string[] }> {
    const gallery = await this.getGallery(galleryId);
    if (!gallery || !gallery.bucketFolder) return { done: 0, failed: [] };
    const bucketName = gallery.bucketName || this.DEFAULT_BUCKET;
    const photos = (await this.getPhotos(galleryId)).filter(photo => !photo.thumbnailUrl && photo.bucketPath);
    const failed: string[] = [];
    let done = 0;
    for (const photo of photos) {
      onProgress?.(done, photos.length, photo.name);
      try {
        const response = await fetch(photo.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const thumb = await createThumbnail(await response.blob());
        const thumbPath = thumbnailPathFor(gallery.bucketFolder, photo.bucketPath!);
        const upload = await supabaseService.uploadFile(bucketName, thumbPath, thumb.blob, { upsert: true, contentType: 'image/jpeg' });
        if (!upload.success) throw new Error(upload.error || 'upload failed');
        const thumbnailUrl = supabaseService.getPublicUrl(bucketName, thumbPath);
        const { error } = await supabaseService.client
          .from(this.PHOTOS_TABLE)
          .update({ thumbnail_url: thumbnailUrl, width: thumb.originalWidth, height: thumb.originalHeight })
          .eq('id', photo.id);
        if (error) throw error;
        done++;
      } catch (error) {
        console.error(`Thumbnail failed for ${photo.name}:`, error);
        failed.push(photo.name);
      }
    }
    onProgress?.(done, photos.length);
    localStorage.removeItem(`${this.PHOTOS_KEY}-${galleryId}`);
    return { done, failed };
  }

  // Check if Supabase is configured
  isSupabaseConfigured(): boolean {
    return supabaseService.isReady();
  }

  // Get all unique categories from galleries
  async getCategories(): Promise<string[]> {
    try {
      const galleries = await this.getGalleries();
      const categories = new Set<string>();

      galleries.forEach(gallery => {
        if (gallery.category && gallery.category.trim()) {
          categories.add(gallery.category.trim());
        }
      });

      return Array.from(categories).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  // Get gallery statistics
  async getGalleryStats(galleryId: string): Promise<{
    photoCount: number;
    totalSize: number;
    subfolders: SubfolderInfo[];
    lastUpload?: string;
  }> {
    try {
      const photos = await this.getPhotos(galleryId);
      const subfolders = await this.getGallerySubfolders(galleryId);
      
      const totalSize = photos.reduce((sum, photo) => sum + photo.size, 0);
      const lastUpload = photos.length > 0 
        ? photos.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0].uploadedAt
        : undefined;

      return {
        photoCount: photos.length,
        totalSize,
        subfolders,
        lastUpload
      };
    } catch (error) {
      console.error('Error getting gallery stats:', error);
      return {
        photoCount: 0,
        totalSize: 0,
        subfolders: [],
        lastUpload: undefined
      };
    }
  }
}

export const galleryService = new GalleryService();
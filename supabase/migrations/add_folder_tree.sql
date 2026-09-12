-- =============================================
-- MIGRATION: add_folder_tree
-- =============================================
-- Stores the subfolder hierarchy and display order of a gallery so that
-- every visitor sees the same organization (previously kept in the admin's
-- browser localStorage only).
--
-- Format: ordered JSON array of nodes. A node with "children" is a group.
--   [{"name": "Accueil"}, {"name": "Salles", "children": ["223", "224"]}]
-- Leaf names reference photos.subfolder (which stays flat).

ALTER TABLE galleries ADD COLUMN IF NOT EXISTS folder_tree JSONB;

COMMENT ON COLUMN galleries.folder_tree IS
  'Ordered subfolder hierarchy: [{name, children?: string[]}]. Leaf names reference photos.subfolder.';

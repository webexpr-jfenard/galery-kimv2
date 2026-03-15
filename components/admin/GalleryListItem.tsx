import React from "react";
import {
  MoreHorizontal,
  Eye,
  FileImage,
  Upload,
  Edit,
  Trash2,
  Lock,
  Folder,
  Tag,
} from "lucide-react";
import type { Gallery } from "../../services/galleryService";

interface GalleryListItemProps {
  gallery: Gallery;
  onEdit: (gallery: Gallery) => void;
  onDelete: (id: string, name: string) => void;
  onManagePhotos: (galleryId: string) => void;
  onView: (galleryId: string) => void;
  onToggleUpload: (galleryId: string) => void;
}

export function GalleryListItem({
  gallery,
  onEdit,
  onDelete,
  onManagePhotos,
  onView,
  onToggleUpload,
}: GalleryListItemProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50/80 transition-colors duration-150 group cursor-pointer rounded-lg"
      onClick={() => onView(gallery.id)}
    >
      {/* Thumbnail */}
      {gallery.featuredPhotoUrl ? (
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 ring-1 ring-gray-100">
          <img
            src={gallery.featuredPhotoUrl}
            alt={gallery.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
          <FileImage className="h-4 w-4 text-gray-300" />
        </div>
      )}

      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-gray-900 truncate">
            {gallery.name}
          </span>
          {gallery.password && (
            <Lock className="h-3 w-3 text-gray-300 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {gallery.category && (
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <Tag className="h-2.5 w-2.5" />
              {gallery.category}
            </span>
          )}
          {gallery.bucketFolder && (
            <span className="text-[11px] text-gray-300 flex items-center gap-1">
              <Folder className="h-2.5 w-2.5" />
              {gallery.bucketFolder}
            </span>
          )}
        </div>
      </div>

      {/* Photo count */}
      <div className="hidden sm:block text-[13px] text-gray-400 tabular-nums w-[80px] text-right">
        {gallery.photoCount || 0} photos
      </div>

      {/* Date */}
      <div className="hidden md:block text-[12px] text-gray-300 w-[100px] text-right">
        {new Date(gallery.createdAt).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </div>

      {/* Actions */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="w-8 h-8 flex items-center justify-center rounded-md text-gray-300 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
          aria-label="Actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-[180px] bg-white border border-gray-100 rounded-lg shadow-lg shadow-gray-200/50 py-1 z-30">
            <button
              onClick={(e) => { e.stopPropagation(); onView(gallery.id); setMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5" />
              Voir la galerie
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onManagePhotos(gallery.id); setMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <FileImage className="h-3.5 w-3.5" />
              Gérer les photos
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleUpload(gallery.id); setMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              Ajouter des photos
            </button>
            <div className="h-px bg-gray-100 my-1" />
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(gallery); setMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Edit className="h-3.5 w-3.5" />
              Modifier
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(gallery.id, gallery.name); setMenuOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

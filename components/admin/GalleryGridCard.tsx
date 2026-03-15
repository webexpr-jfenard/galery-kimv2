import React from "react";
import {
  MoreHorizontal,
  Eye,
  FileImage,
  Upload,
  Edit,
  Trash2,
  Lock,
  Tag,
  Image,
} from "lucide-react";
import type { Gallery } from "../../services/galleryService";

interface GalleryGridCardProps {
  gallery: Gallery;
  onEdit: (gallery: Gallery) => void;
  onDelete: (id: string, name: string) => void;
  onManagePhotos: (galleryId: string) => void;
  onView: (galleryId: string) => void;
  onToggleUpload: (galleryId: string) => void;
}

export function GalleryGridCard({
  gallery,
  onEdit,
  onDelete,
  onManagePhotos,
  onView,
  onToggleUpload,
}: GalleryGridCardProps) {
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
    <div
      className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md hover:shadow-gray-100/80 transition-all duration-200 cursor-pointer"
      onClick={() => onView(gallery.id)}
    >
      {/* Thumbnail */}
      <div className="aspect-[16/10] bg-gray-50 relative overflow-hidden">
        {gallery.featuredPhotoUrl ? (
          <img
            src={gallery.featuredPhotoUrl}
            alt={gallery.name}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="h-8 w-8 text-gray-200" />
          </div>
        )}

        {/* Badges overlay */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          {gallery.password && (
            <div className="w-6 h-6 rounded-md bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm">
              <Lock className="h-3 w-3 text-gray-500" />
            </div>
          )}
          {gallery.category && (
            <div className="h-6 px-2 rounded-md bg-white/90 backdrop-blur-sm flex items-center gap-1 shadow-sm">
              <Tag className="h-2.5 w-2.5 text-gray-400" />
              <span className="text-[11px] text-gray-600 font-medium">
                {gallery.category}
              </span>
            </div>
          )}
        </div>

        {/* Menu button */}
        <div className="absolute top-2.5 right-2.5" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="w-7 h-7 rounded-md bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white cursor-pointer"
            aria-label="Actions"
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-gray-600" />
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

      {/* Info */}
      <div className="p-4">
        <h3 className="text-[14px] font-medium text-gray-900 truncate">
          {gallery.name}
        </h3>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[12px] text-gray-400 tabular-nums">
            {gallery.photoCount || 0} photos
          </span>
          <span className="text-[11px] text-gray-300">
            {new Date(gallery.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

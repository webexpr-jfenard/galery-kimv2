import React from "react";
import { Image, FolderOpen, Lock } from "lucide-react";

interface GalleryStatsProps {
  totalGalleries: number;
  totalPhotos: number;
  protectedGalleries: number;
}

export function GalleryStats({
  totalGalleries,
  totalPhotos,
  protectedGalleries,
}: GalleryStatsProps) {
  const items = [
    {
      label: "Galeries",
      value: totalGalleries,
      icon: FolderOpen,
      color: "text-gray-900",
    },
    {
      label: "Photos",
      value: totalPhotos,
      icon: Image,
      color: "text-gray-900",
    },
    {
      label: "Protégées",
      value: protectedGalleries,
      icon: Lock,
      color: "text-gray-900",
    },
  ];

  return (
    <div className="flex items-center gap-6 py-1">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <React.Fragment key={item.label}>
            {i > 0 && <div className="w-px h-4 bg-gray-200" />}
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-[14px] tabular-nums">
                <span className="font-semibold text-gray-900">{item.value}</span>
                <span className="text-gray-400 ml-1.5">{item.label}</span>
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

import React, { useCallback, useRef, useState } from "react";
import { Upload, X, RefreshCw } from "lucide-react";
import { SubfolderSelector } from "../SubfolderSelector";

interface UploadZoneProps {
  galleryId: string;
  isUploading: boolean;
  uploadProgress: { completed: number; total: number } | null;
  selectedSubfolder: string | undefined;
  onSubfolderChange: (subfolder: string | undefined) => void;
  onPhotoUpload: (galleryId: string, files: FileList | null) => void;
  onClose: () => void;
}

export function UploadZone({
  galleryId,
  isUploading,
  uploadProgress,
  selectedSubfolder,
  onSubfolderChange,
  onPhotoUpload,
  onClose,
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        onPhotoUpload(galleryId, e.dataTransfer.files);
      }
    },
    [galleryId, onPhotoUpload]
  );

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-medium text-gray-900">
          Ajouter des photos
        </h3>
        {!isUploading && (
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        className={`
          rounded-lg border-2 border-dashed transition-colors duration-150
          ${isDragOver ? "border-orange-400 bg-orange-50/50" : "border-gray-200 hover:border-gray-300"}
          ${isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={isUploading ? undefined : handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center py-8">
          <Upload
            className={`h-6 w-6 mb-2 ${isDragOver ? "text-orange-500" : "text-gray-300"}`}
          />
          <p className="text-[13px] text-gray-500">
            {isUploading ? "Upload en cours..." : "Glissez vos photos ou cliquez pour sélectionner"}
          </p>
          {selectedSubfolder && !isUploading && (
            <p className="text-[11px] text-orange-500 mt-1">
              Destination : {selectedSubfolder}
            </p>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onPhotoUpload(galleryId, e.target.files);
          e.target.value = "";
        }}
        disabled={isUploading}
      />

      {/* Subfolder selector */}
      <div className="mt-3">
        <SubfolderSelector
          galleryId={galleryId}
          selectedSubfolder={selectedSubfolder}
          onSubfolderChange={onSubfolderChange}
          disabled={isUploading}
        />
      </div>

      {/* Progress */}
      {isUploading && uploadProgress && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-[13px] text-gray-500">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            {uploadProgress.completed}/{uploadProgress.total} photos
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-300"
              style={{ width: `${(uploadProgress.completed / uploadProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

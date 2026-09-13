import React from "react";
import { ArrowLeft, Mail, Phone, Instagram } from "lucide-react";
import type { Gallery } from "../services/galleryService";
import type { PhotographerLinks } from "../services/siteSettingsService";
import { normalizeHex } from "../services/colorUtils";
import { ContactQr } from "./ContactQr";

interface GalleryHeroProps {
  gallery: Gallery;
  photographer: PhotographerLinks;
  /** Small uppercase line above the title (defaults to the gallery category) */
  eyebrow?: React.ReactNode;
  /** Defaults to the gallery name */
  title?: React.ReactNode;
  /** Line under the title (photo count, current folder…) */
  subtitle?: React.ReactNode;
  backLabel: string;
  onBack: () => void;
  visitorName?: string | null;
  onForgetVisitor?: () => void;
}

/**
 * Banner shared by the gallery and the selection pages: banner photo (or the accent
 * color) with a gradient, the gallery identity on the left, the photographer's contact
 * and vCard QR code on the right.
 */
export function GalleryHero({
  gallery, photographer, eyebrow, title, subtitle, backLabel, onBack, visitorName, onForgetVisitor
}: GalleryHeroProps) {
  const accent = normalizeHex(gallery.accentColor);
  const eyebrowText = eyebrow === undefined ? gallery.category : eyebrow;

  return (
    <div className="relative overflow-hidden text-white" style={{ backgroundColor: accent }}>
      {gallery.coverPhotoUrl && (
        <img src={gallery.coverPhotoUrl} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: gallery.coverPhotoUrl
            ? `linear-gradient(180deg, ${accent}33 0%, ${accent}D9 100%)`
            : `linear-gradient(135deg, ${accent} 0%, ${accent}CC 100%)`
        }}
      />
      <div className="relative container mx-auto px-4 pt-4 pb-6 md:pt-5 md:pb-8 min-h-[190px] md:min-h-[260px] flex flex-col justify-between">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur px-3 py-1.5 text-sm transition-colors"
            aria-label={backLabel}
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </button>
          {visitorName && (
            <span className="text-xs md:text-sm text-white/80 text-right">
              Bonjour {visitorName}
              {onForgetVisitor && (
                <button
                  type="button"
                  onClick={onForgetVisitor}
                  className="ml-1 underline underline-offset-2 hover:text-white"
                  aria-label="Ce n'est pas moi, changer de prénom"
                >
                  (ce n'est pas moi)
                </button>
              )}
            </span>
          )}
        </div>

        <div className="mt-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="min-w-0">
            {eyebrowText && (
              <div className="text-[11px] md:text-xs uppercase tracking-[0.14em] text-white/70 mb-1">{eyebrowText}</div>
            )}
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]">
              {title ?? gallery.name}
            </h1>
            {gallery.description && (
              <p className="mt-1.5 text-sm md:text-[15px] text-white/85 max-w-2xl">{gallery.description}</p>
            )}
            {subtitle && (
              <div className="mt-2 flex items-center gap-2 text-sm text-white/80">{subtitle}</div>
            )}
          </div>

          {/* Photographer contact */}
          <address className="not-italic shrink-0 flex flex-wrap md:flex-col md:items-end gap-x-4 gap-y-1 text-[13px] text-white/80">
            <div className="w-full md:w-auto flex items-center gap-3 md:flex-col md:items-end md:gap-1.5 md:mb-0.5">
              <ContactQr photographer={photographer} color={accent} />
              <span className="text-[11px] uppercase tracking-[0.14em] text-white/60">{photographer.name}</span>
            </div>
            <a href={`mailto:${photographer.email}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
              <Mail className="h-3.5 w-3.5" />
              {photographer.email}
            </a>
            <a href={photographer.phoneHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
              <Phone className="h-3.5 w-3.5" />
              {photographer.phone}
            </a>
            <a href={photographer.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
              <Instagram className="h-3.5 w-3.5" />
              {photographer.instagramHandle}
            </a>
          </address>
        </div>
      </div>
    </div>
  );
}

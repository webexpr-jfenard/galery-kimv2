import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, X, QrCode } from "lucide-react";
import type { PhotographerLinks } from "../services/siteSettingsService";

/** vCard 3.0 text: scanning the QR code offers "add contact" on iOS and Android. */
export function buildVCard(p: PhotographerLinks): string {
  const [first, ...rest] = p.name.trim().split(/\s+/);
  const last = rest.join(" ");
  const tel = p.phoneHref.replace(/^tel:/, "");
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${last};${first};;;`,
    `FN:${p.name}`,
    tel ? `TEL;TYPE=CELL:${tel}` : "",
    `EMAIL;TYPE=INTERNET:${p.email}`,
    p.website ? `URL:${p.website}` : "",
    p.instagram ? `X-SOCIALPROFILE;TYPE=instagram:${p.instagram}` : "",
    "END:VCARD",
  ].filter(Boolean).join("\r\n");
}

interface ContactQrProps {
  photographer: PhotographerLinks;
  /** Color of the QR modules (the gallery accent) */
  color?: string;
}

/**
 * Small QR code in the gallery header. Click to enlarge and download the .vcf file.
 * Generated in the browser, nothing is fetched.
 */
export function ContactQr({ photographer, color = "#1F2A44" }: ContactQrProps) {
  const [small, setSmall] = useState<string | null>(null);
  const [large, setLarge] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const vcard = buildVCard(photographer);

  useEffect(() => {
    let cancelled = false;
    const options = { errorCorrectionLevel: "L" as const, margin: 1, color: { dark: color, light: "#FFFFFF" } };
    Promise.all([
      QRCode.toDataURL(vcard, { ...options, width: 128 }),
      QRCode.toDataURL(vcard, { ...options, width: 480 }),
    ]).then(([s, l]) => { if (!cancelled) { setSmall(s); setLarge(l); } })
      .catch(err => console.error("QR generation failed:", err));
    return () => { cancelled = true; };
  }, [vcard, color]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const download = () => {
    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${photographer.name.replace(/\s+/g, "-")}.vcf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!small) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-2 rounded-lg bg-white p-1 shadow-sm hover:shadow-md transition-shadow"
        title="Scanner pour enregistrer le contact"
        aria-label="Afficher le QR code de la fiche contact"
      >
        <img src={small} alt="" width={64} height={64} className="rounded-[4px] block" />
      </button>

      {open && large && (
        <div
          className="fixed inset-0 z-[80] bg-[#1F2A44]/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          role="dialog"
          aria-modal="true"
          aria-label="Fiche contact"
        >
          <div className="relative bg-white text-gray-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-gray-500 mb-3">
              <QrCode className="h-4 w-4" /> Fiche contact
            </div>
            <img src={large} alt={`QR code de la fiche contact de ${photographer.name}`} className="w-60 h-60 mx-auto rounded-lg border border-gray-100" />
            <div className="mt-4 text-[15px] font-semibold">{photographer.name}</div>
            <div className="text-[13px] text-gray-500">{photographer.email} · {photographer.phone}</div>
            <p className="text-[12px] text-gray-400 mt-3">Scannez avec l'appareil photo de votre téléphone pour ajouter le contact, ou téléchargez la fiche.</p>
            <button
              type="button"
              onClick={download}
              className="mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#1F2A44] text-white text-[14px] font-medium hover:bg-[#2B3A5C]"
              style={{ backgroundColor: color }}
            >
              <Download className="h-4 w-4" /> Télécharger la vCard
            </button>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { uploadProductImage } from "../../lib/uploadImage";
import { useToast } from "./toastProvider";

type Props = {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  previewClassName?: string;
};

/**
 * Image field for the admin product forms — upload straight from device
 * (gallery/camera), or still paste an external URL if that's easier. Either
 * path just sets the same image_url string the rest of the form expects.
 */
export function ImageUploadField({
  value,
  onChange,
  placeholder = "Paste an image URL, or upload from your device",
  previewClassName = "aspect-[3/4]",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      onChange(url);
      showToast("Image uploaded", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed", "error");
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 glass-input text-zinc-900 text-sm px-4 py-3 rounded-xl outline-none transition-colors placeholder-zinc-400"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-4 rounded-xl glass text-zinc-600 hover:text-zinc-900 hover:bg-zinc-900/5 text-[10px] uppercase tracking-widest font-medium transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "..." : "Upload"}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      {value && (
        <div className={`rounded-xl overflow-hidden glass ${previewClassName}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
    </div>
  );
}

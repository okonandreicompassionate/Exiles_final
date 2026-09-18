"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

type Props = {
  colors: string[];
  onChange: (colors: string[]) => void;
};

/**
 * Lets an admin define the colors a product comes in. Empty list = no color
 * choice needed at checkout, same as before this feature existed.
 */
export function ColorsEditor({ colors, onChange }: Props) {
  const [draft, setDraft] = useState("");

  function addColor() {
    const name = draft.trim();
    if (!name) return;
    if (colors.some((c) => c.toLowerCase() === name.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...colors, name]);
    setDraft("");
  }

  function removeColor(name: string) {
    onChange(colors.filter((c) => c !== name));
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="e.g. Black — press Enter to add"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addColor();
            }
          }}
          className="flex-1 glass-input text-zinc-900 text-sm px-4 py-3 rounded-xl outline-none transition-colors placeholder-zinc-400"
        />
        <button
          type="button"
          onClick={addColor}
          className="flex items-center gap-1.5 px-4 rounded-xl glass text-zinc-600 hover:text-zinc-900 hover:bg-zinc-900/5 text-[10px] uppercase tracking-widest font-medium transition-colors flex-shrink-0"
        >
          <Plus size={14} />
          Add
        </button>
      </div>
      {colors.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {colors.map((color) => (
            <span
              key={color}
              className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-lg glass text-xs text-zinc-700"
            >
              <span
                className="w-4 h-4 rounded-full border border-zinc-900/15 flex-shrink-0"
                style={{ backgroundColor: color.toLowerCase().replace(/\s+/g, "") }}
              />
              {color}
              <button
                type="button"
                onClick={() => removeColor(color)}
                className="text-zinc-400 hover:text-red-500 transition-colors"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      {colors.length === 0 && (
        <p className="text-[10px] text-zinc-400">No colors set — customers won&apos;t be asked to pick one.</p>
      )}
    </div>
  );
}

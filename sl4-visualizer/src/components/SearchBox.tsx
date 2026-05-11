"use client";

import { forwardRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
}

const SearchBox = forwardRef<HTMLInputElement, Props>(function SearchBox(
  { value, onChange, onClear },
  ref,
) {
  return (
    <div className="relative">
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search messages…   /"
        className="w-full bg-panel2 border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />
      {value && (
        <button
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text text-xs px-1"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
});

export default SearchBox;

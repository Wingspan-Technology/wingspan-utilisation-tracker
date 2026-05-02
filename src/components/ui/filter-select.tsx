"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const triggerClass =
  "h-11 sm:h-8 w-full flex items-center gap-2 text-left rounded-lg border border-input bg-background text-foreground pl-2.5 pr-2.5 py-1 text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-25 disabled:bg-muted/40";

type Option = { value: string; label: string };

interface FilterSelectProps {
  value: string;
  options: Option[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function FilterSelect({ value, options, placeholder, disabled, onChange }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative w-full sm:w-44">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={triggerClass}
      >
        <span className={cn("flex-1 truncate", !selected && "text-muted-foreground")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-input bg-background shadow-lg overflow-y-auto max-h-60">
          <li
            onMouseDown={(e) => { e.preventDefault(); onChange(""); setOpen(false); }}
            className={cn("px-2.5 py-2 text-sm cursor-pointer hover:bg-muted/50 text-muted-foreground", !value && "bg-muted/30")}
          >
            {placeholder}
          </li>
          {options.map((opt) => (
            <li
              key={opt.value}
              onMouseDown={(e) => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
              className={cn("px-2.5 py-2 text-sm cursor-pointer hover:bg-muted/50", value === opt.value && "bg-muted/30")}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

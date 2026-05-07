"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const selectBase =
  "h-11 sm:h-8 w-full appearance-none rounded-lg border bg-background text-foreground pl-2.5 pr-2.5 py-1 text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-25 disabled:bg-muted/40";
const selectNormal = "border-input focus:border-ring";
const selectError = "border-destructive focus:border-destructive";

interface ListPickerProps {
  items: { id: string; name: string; icon?: ReactNode }[];
  value: string;
  disabled?: boolean;
  hasError?: boolean;
  placeholder?: string;
  onChange: (id: string) => void;
}

export function ListPicker({
  items,
  value,
  disabled,
  hasError,
  placeholder = "Please select…",
  onChange,
}: ListPickerProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selected = items.find((i) => i.id === value) ?? null;

  useEffect(() => { setMounted(true); }, []);

  function openDropdown() {
    if (disabled) return;
    if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect());
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;
    function handleClose(e: MouseEvent) {
      if (buttonRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClose);
    return () => document.removeEventListener("mousedown", handleClose);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={openDropdown}
        className={cn(
          selectBase,
          hasError ? selectError : selectNormal,
          "flex items-center gap-2 text-left",
          !selected && "text-muted-foreground"
        )}
      >
        {selected?.icon && <span className="shrink-0 text-muted-foreground">{selected.icon}</span>}
        <span className="flex-1 truncate">{selected ? selected.name : placeholder}</span>
        <ChevronDown className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 text-muted-foreground" />
      </button>

      {mounted && open && rect && createPortal(
        <ul
          style={{
            position: "fixed",
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
            maxHeight: 240,
            overflowY: "auto",
            zIndex: 9999,
          }}
          className="rounded-lg border border-input bg-background shadow-lg"
        >
          {items.map((item) => (
            <li
              key={item.id}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(item.id);
                setOpen(false);
              }}
              className={cn(
                "flex items-center gap-2 px-2.5 py-2.5 text-sm font-medium cursor-pointer hover:bg-muted/50",
                item.id === value && "bg-muted/30"
              )}
            >
              {item.icon && <span className="shrink-0 text-muted-foreground">{item.icon}</span>}
              {item.name}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}

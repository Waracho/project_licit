// src/components/ui/UserMenu.tsx
import { useEffect, useRef, useState, type ReactNode } from "react";
import { User as UserIcon, ChevronDown } from "lucide-react";
import "./UserMenu.css";

export type MenuItem = {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
};

type Props = {
  items: MenuItem[];
  align?: "left" | "right";
  label?: string;
};

export default function UserMenu({ items, align = "right", label }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  // cerrar si haces click fuera
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const armOpen = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    openTimer.current = window.setTimeout(() => setOpen(true), 80);
  };
  const armClose = () => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  return (
    <div
      className="umenu"
      ref={rootRef}
      onMouseEnter={armOpen}
      onMouseLeave={armClose}
    >
      <button
        className="umenu__btn"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <UserIcon className="umenu__icon" aria-hidden />
        {label ? <span className="umenu__label">{label}</span> : null}
        <ChevronDown className="umenu__chev" aria-hidden />
      </button>

      <div
        className={`umenu__menu umenu__menu--${align} ${open ? "is-open" : ""}`}
        role="menu"
      >
        {items.map((it, i) => (
          <button
            key={i}
            className="umenu__item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              it.onClick();
            }}
          >
            <span className="umenu__item-icon">
              {it.icon ?? null}
            </span>
            <span>{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

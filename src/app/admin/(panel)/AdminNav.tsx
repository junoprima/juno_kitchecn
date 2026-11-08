"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "ออเดอร์" },
  { href: "/admin/menu", label: "เมนู & ร้าน" },
  { href: "/", label: "หน้าลูกค้า" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1">
      {LINKS.map((l) => {
        const active = l.href === path;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-2.5 py-1.5 text-sm font-medium ${active ? "bg-white text-enamel-deep" : "text-white/85 hover:bg-white/10 hover:text-white"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

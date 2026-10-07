import { FileUp, LayoutDashboard, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  /** Whether the item is active for the current pathname. */
  isActive: (pathname: string) => boolean;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard, isActive: (p) => p === "/" },
      { href: "/customers", label: "Customers", icon: Users, isActive: (p) => p.startsWith("/customers") },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        href: "/admin/import",
        label: "Import transactions",
        icon: FileUp,
        adminOnly: true,
        isActive: (p) => p.startsWith("/admin/import"),
      },
    ],
  },
];

export function currentNavLabel(pathname: string): string | undefined {
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) if (item.isActive(pathname)) return item.label;
  }
  return undefined;
}

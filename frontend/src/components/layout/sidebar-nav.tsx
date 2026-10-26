"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { activeNavigationItem, NAVIGATION, type NavigationItem } from "@/constants/navigation";
import { TEXTS } from "@/constants/texts";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  /** Barra contraída: solo iconos, con el nombre en una etiqueta flotante. */
  collapsed?: boolean;
  /** Se llama al elegir un destino (cierra el panel en celular). */
  onNavigate?: () => void;
}

const itemClasses =
  "relative flex h-(--control-height-md) items-center gap-3 rounded-md px-2.5 text-label text-fg-muted transition-colors duration-(--duration-fast) [&_svg]:size-4.5 [&_svg]:shrink-0";

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const active = activeNavigationItem(pathname);

  return (
    <nav aria-label={TEXTS.layout.mainNavigation} className="grid gap-5 px-2 py-4">
      {NAVIGATION.map((group) => (
        <div key={group.id} className="grid gap-1">
          {group.label ? (
            <p
              className={cn(
                "px-2.5 pb-1 text-overline text-fg-muted uppercase",
                collapsed && "sr-only",
              )}
            >
              {group.label}
            </p>
          ) : null}
          <ul className="grid gap-0.5">
            {group.items.map((item) => (
              <li key={item.id}>
                <NavEntry
                  item={item}
                  active={item.id === active?.id}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function NavEntry({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavigationItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const label = <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>;

  const entry = item.ready ? (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        itemClasses,
        "hover:bg-surface-hover hover:text-fg",
        active &&
          "bg-primary-soft font-semibold text-primary-ink before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-primary-ink hover:bg-primary-soft hover:text-primary-ink",
      )}
    >
      <Icon aria-hidden="true" />
      {label}
    </Link>
  ) : (
    <span aria-disabled="true" className={cn(itemClasses, "cursor-not-allowed text-fg-disabled")}>
      <Icon aria-hidden="true" />
      {label}
      {collapsed ? (
        <span className="sr-only">({TEXTS.layout.comingSoon})</span>
      ) : (
        <Badge tone="neutral" className="ml-auto shrink-0" title={TEXTS.layout.comingSoon}>
          {TEXTS.layout.comingSoonShort}
        </Badge>
      )}
    </span>
  );

  if (!collapsed) {
    return entry;
  }
  const hint = item.ready
    ? item.label
    : `${item.label}. ${item.stage ? TEXTS.layout.comingSoonHint(item.stage) : TEXTS.layout.comingSoon}`;
  return (
    <Tooltip content={hint} side="right">
      {entry}
    </Tooltip>
  );
}

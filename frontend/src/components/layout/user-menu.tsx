"use client";

import { ChevronDown, LogOut } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ACCOUNT_MENU } from "@/constants/navigation";
import { TEXTS } from "@/constants/texts";

import { ThemeMenuOptions } from "./theme-switcher";

export interface ShellUser {
  name: string;
  email: string;
}

interface UserMenuProps {
  user: ShellUser | null;
  onLogout: () => void;
  loggingOut?: boolean;
}

const texts = TEXTS.layout;

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toLocaleUpperCase("es-MX") ?? "")
    .join("");
}

/** Menú de la cuenta: nombre del docente, perfil, contraseña, apariencia y cerrar sesión. */
export function UserMenu({ user, onLogout, loggingOut = false }: UserMenuProps) {
  if (!user) {
    return (
      <div className="flex items-center gap-2" aria-busy="true">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="hidden h-4 w-32 sm:block" />
        <span className="sr-only">{texts.loadingUser}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${texts.userMenu}: ${user.name}`}
        className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-label text-fg hover:bg-surface-hover data-[state=open]:bg-surface-hover"
      >
        <span
          aria-hidden="true"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-small font-semibold text-primary-ink"
        >
          {initials(user.name)}
        </span>
        <span className="hidden max-w-48 truncate sm:block">{user.name}</span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <div className="grid gap-0.5 px-2 py-2">
          <p className="truncate text-label font-semibold text-fg">{user.name}</p>
          <p className="truncate text-small text-fg-muted">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        {ACCOUNT_MENU.map((item) => {
          const Icon = item.icon;
          return item.ready ? (
            <DropdownMenuItem key={item.id} asChild>
              <Link href={item.href}>
                <Icon aria-hidden="true" />
                {item.label}
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={item.id} disabled>
              <Icon aria-hidden="true" />
              {item.label}
              <Badge tone="neutral" className="ml-auto shrink-0">
                {texts.comingSoonShort}
              </Badge>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{texts.appearance}</DropdownMenuLabel>
        <ThemeMenuOptions />
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={loggingOut} onSelect={onLogout}>
          <LogOut aria-hidden="true" />
          {loggingOut ? texts.loggingOut : texts.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

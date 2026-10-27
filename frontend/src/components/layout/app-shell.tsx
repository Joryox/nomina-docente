"use client";

import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip } from "@/components/ui/tooltip";
import { activeNavigationItem, NAVIGATION } from "@/constants/navigation";
import { APP_ROUTES } from "@/constants/routes";
import { TEXTS } from "@/constants/texts";
import { setSidebarState, useSidebarState } from "@/lib/theme/preferences-store";

import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import { MAIN_CONTENT_ID } from "./skip-link";
import { UserMenu, type ShellUser } from "./user-menu";

const texts = TEXTS.layout;
const HOME_ITEM = NAVIGATION[0]?.items[0];

function useBreadcrumbs(): BreadcrumbItem[] {
  const pathname = usePathname();
  const active = activeNavigationItem(pathname);
  if (!HOME_ITEM) {
    return [];
  }
  if (!active || active.id === HOME_ITEM.id) {
    return [{ label: HOME_ITEM.label }];
  }
  return [{ label: HOME_ITEM.label, href: HOME_ITEM.href }, { label: active.label }];
}

interface AppShellProps {
  /** `null` mientras se carga la sesión. */
  user: ShellUser | null;
  onLogout: () => void;
  loggingOut?: boolean;
  children: ReactNode;
}

/**
 * Estructura del panel del docente: barra lateral (contraíble en escritorio, panel deslizable
 * en celular), barra superior con migas y menú de la cuenta, y el contenido. Una franja de
 * color primario corre por el borde superior, como el membrete de un documento oficial.
 */
export function AppShell({ user, onLogout, loggingOut, children }: AppShellProps) {
  const sidebar = useSidebarState();
  const collapsed = sidebar === "collapsed";
  const [mobileOpen, setMobileOpen] = useState(false);
  const breadcrumbs = useBreadcrumbs();
  const toggleLabel = collapsed ? texts.expandSidebar : texts.collapseSidebar;

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="sticky top-0 z-(--layer-sidebar) hidden h-dvh w-(--sidebar-width) shrink-0 flex-col border-t-4 border-r border-t-primary border-r-line bg-surface transition-[width] duration-(--duration-base) ease-standard lg:flex print:hidden sidebar-collapsed:w-(--sidebar-width-collapsed)">
        <div className="box-content flex h-(--topbar-height) shrink-0 items-center border-b border-line px-3">
          <Link href={APP_ROUTES.panel} className="min-w-0 rounded-sm">
            <Logo variant="compact" className="sidebar-collapsed:hidden" />
            <Logo variant="mark" className="hidden sidebar-collapsed:inline-flex" />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav collapsed={collapsed} />
        </div>
        <div className="border-t border-line p-2">
          <Tooltip content={toggleLabel} side="right">
            <Button
              variant="ghost"
              size="icon"
              aria-label={toggleLabel}
              aria-expanded={!collapsed}
              onClick={() => setSidebarState(collapsed ? "expanded" : "collapsed")}
            >
              {collapsed ? (
                <PanelLeftOpen aria-hidden="true" />
              ) : (
                <PanelLeftClose aria-hidden="true" />
              )}
            </Button>
          </Tooltip>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-(--layer-sticky) box-content flex h-(--topbar-height) shrink-0 items-center gap-3 border-t-4 border-b border-t-primary border-b-line bg-surface px-(--page-gutter) print:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2 lg:hidden"
                aria-label={texts.openNavigation}
              >
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent closeLabel={texts.closeNavigation} aria-describedby={undefined}>
              <SheetTitle className="sr-only">{texts.mainNavigation}</SheetTitle>
              <div className="box-content flex h-(--topbar-height) shrink-0 items-center border-t-4 border-b border-t-primary border-b-line px-3">
                <Logo variant="compact" />
              </div>
              <div className="flex-1 overflow-y-auto">
                <SidebarNav onNavigate={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <Breadcrumbs items={breadcrumbs} />
          <div className="ml-auto flex shrink-0 items-center">
            <UserMenu user={user} onLogout={onLogout} loggingOut={loggingOut} />
          </div>
        </header>
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="flex-1 px-(--page-gutter) py-(--page-block) outline-none print:p-0"
        >
          <div className="mx-auto w-full max-w-content">{children}</div>
        </main>
      </div>
    </div>
  );
}

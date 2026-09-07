"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/(auth)/actions";

export type NavGroup = {
  label: string;
  icon: LucideIcon;
  href?: string;
  children?: { label: string; href: string }[];
};

export function Sidebar({
  brand,
  groups,
  extra,
}: {
  brand: string;
  groups: NavGroup[];
  extra?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  function toggleCollapse() {
    setCollapsed((c) => {
      const next = !c;
      if (typeof window !== "undefined") {
        localStorage.setItem("dash-sidebar-collapsed", String(next));
      }
      return next;
    });
  }

  function toggleGroup(label: string) {
    if (collapsed) {
      setCollapsed(false);
      if (typeof window !== "undefined") {
        localStorage.setItem("dash-sidebar-collapsed", "false");
      }
      return;
    }
    setOpenGroups((g) => ({ ...g, [label]: !g[label] }));
  }

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setCollapsed(localStorage.getItem("dash-sidebar-collapsed") === "true");
    }
  }, []);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function renderNav(isMobile: boolean) {
    return (
      <>
        <nav className="dash-sidebar__nav flex-1 space-y-1 overflow-y-auto p-3">
          {groups.map((group) => {
            const Icon = group.icon;
            if (group.children) {
              const childActive = group.children.some((c) =>
                isActive(c.href),
              );
              const open = collapsed && !isMobile
                ? false
                : (openGroups[group.label] ?? childActive);
              return (
                <div key={group.label} className="dash-sidebar__group">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    aria-expanded={open}
                    title={collapsed && !isMobile ? group.label : undefined}
                    className={cn(
                      "dash-sidebar__group-toggle flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-dash-sidebar-accent",
                      childActive && "text-dash-sidebar-accent-foreground",
                      collapsed && !isMobile && "justify-center px-2",
                    )}
                  >
                    <Icon className="dash-sidebar__group-icon size-4 shrink-0 text-dash-muted-foreground transition-colors duration-200" />
                    {(!collapsed || isMobile) && (
                      <>
                        <span className="dash-sidebar__group-label flex-1 text-left">
                          {group.label}
                        </span>
                        <ChevronDown
                          className={cn(
                            "dash-sidebar__chevron size-4 text-dash-muted-foreground transition-transform duration-200",
                            open && "rotate-180",
                          )}
                        />
                      </>
                    )}
                  </button>
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-300 ease-out",
                      open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="dash-sidebar__group-children ml-4 mt-1 space-y-1 border-l border-dash-sidebar-border pl-3">
                        {group.children.map((child) => (
                          <SidebarLink
                            key={child.href}
                            href={child.href}
                            label={child.label}
                            active={isActive(child.href)}
                            collapsed={collapsed && !isMobile}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <SidebarLink
                key={group.href}
                href={group.href!}
                label={group.label}
                icon={Icon}
                active={isActive(group.href!)}
                collapsed={collapsed && !isMobile}
              />
            );
          })}
        </nav>

        {!collapsed && extra && (
          <div className="dash-sidebar__extra px-3 pb-2">{extra}</div>
        )}

        <div className="dash-sidebar__logout border-t border-dash-sidebar-border p-3">
          <button
            type="button"
            onClick={async () => {
              await logoutAction();
              router.push("/login");
            }}
            title={collapsed && !isMobile ? "Logout" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-dash-muted-foreground transition-all duration-200 hover:bg-dash-sidebar-accent hover:text-dash-sidebar-accent-foreground",
              collapsed && !isMobile && "justify-center px-2",
            )}
          >
            <LogOut className="size-4 shrink-0" />
            {(!collapsed || isMobile) && "Logout"}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "dash-sidebar hidden flex-col border-r border-dash-sidebar-border bg-dash-sidebar transition-[width] duration-300 lg:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className="dash-sidebar__header flex h-14 items-center gap-2 border-b border-dash-sidebar-border px-4">
          <span className="dash-sidebar__brand-icon text-lg">👋</span>
          {!collapsed && (
            <span className="dash-sidebar__brand-text flex-1 truncate text-sm font-semibold tracking-tight text-dash-sidebar-foreground">
              {brand}
            </span>
          )}
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "dash-sidebar__toggle shrink-0 rounded-md p-1.5 text-dash-muted-foreground transition-colors duration-200 hover:bg-dash-sidebar-accent hover:text-dash-sidebar-foreground",
              collapsed && "mx-auto",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </div>
        {renderNav(false)}
      </aside>

      {/* Mobile header */}
      <header className="dash-sidebar__mobile-header sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-dash-border bg-dash-background/95 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
          className="rounded-md p-2 text-dash-muted-foreground transition-colors duration-200 hover:bg-dash-accent hover:text-dash-foreground"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <span className="text-lg">👋</span>
        <span className="text-sm font-semibold tracking-tight">{brand}</span>
        <button
          type="button"
          onClick={async () => {
            await logoutAction();
            router.push("/login");
          }}
          aria-label="Logout"
          className="ml-auto rounded-md p-2 text-dash-muted-foreground transition-colors duration-200 hover:bg-dash-accent hover:text-dash-foreground"
        >
          <LogOut className="size-4" />
        </button>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="dash-sidebar__mobile-overlay fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "dash-sidebar__mobile-drawer fixed inset-y-0 left-0 z-50 flex w-52 flex-col border-r border-dash-sidebar-border bg-dash-sidebar transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="dash-sidebar__header flex h-14 items-center gap-2 border-b border-dash-sidebar-border px-5">
          <span className="dash-sidebar__brand-icon text-lg">👋</span>
          <span className="dash-sidebar__brand-text text-sm font-semibold tracking-tight text-dash-sidebar-foreground">
            {brand}
          </span>
        </div>
        {renderNav(true)}
      </aside>
    </>
  );
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
  active: boolean;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "dash-sidebar__link flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
        active
          ? "bg-dash-sidebar-accent text-dash-sidebar-accent-foreground"
          : "text-dash-muted-foreground hover:bg-dash-sidebar-accent hover:text-dash-sidebar-accent-foreground",
        collapsed && "justify-center px-2",
      )}
    >
      {Icon && <Icon className="dash-sidebar__link-icon size-4 shrink-0" />}
      {!collapsed && <span className="dash-sidebar__link-label">{label}</span>}
    </Link>
  );
}

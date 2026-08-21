"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut, type LucideIcon } from "lucide-react";
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
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  function toggle(label: string) {
    setOpenGroups((g) => ({ ...g, [label]: !g[label] }));
  }

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-dash-sidebar-border bg-dash-sidebar lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-dash-sidebar-border px-5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-dash-primary transition-transform duration-300" />
          <span className="text-sm font-semibold tracking-tight text-dash-sidebar-foreground">
            {brand}
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {groups.map((group) => {
            const Icon = group.icon;
            if (group.children) {
              const childActive = group.children.some((c) => isActive(c.href));
              const open = openGroups[group.label] ?? childActive;
              return (
                <div key={group.label}>
                  <button
                    type="button"
                    onClick={() => toggle(group.label)}
                    aria-expanded={open}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-dash-sidebar-accent",
                      childActive && "text-dash-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-dash-muted-foreground transition-colors duration-200" />
                    {group.label}
                    <ChevronDown
                      className={cn(
                        "ml-auto size-4 text-dash-muted-foreground transition-transform duration-200",
                        open && "rotate-180",
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-300 ease-out",
                      open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="ml-4 mt-1 space-y-1 border-l border-dash-sidebar-border pl-3">
                        {group.children.map((child) => (
                          <SidebarLink
                            key={child.href}
                            href={child.href}
                            label={child.label}
                            active={isActive(child.href)}
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
              />
            );
          })}
        </nav>

        {extra && <div className="px-3 pb-2">{extra}</div>}

        <div className="border-t border-dash-sidebar-border p-3">
          <button
            type="button"
            onClick={async () => {
              await logoutAction();
              router.push("/login");
            }}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-dash-muted-foreground transition-all duration-200 hover:bg-dash-sidebar-accent hover:text-dash-sidebar-accent-foreground"
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-dash-border bg-dash-background/95 px-4 backdrop-blur lg:hidden">
        <span className="text-sm font-semibold tracking-tight">{brand}</span>
        <nav className="ml-auto flex items-center gap-1 overflow-x-auto">
          {groups.map((group) => (
            <React.Fragment key={group.label}>
              {group.children ? (
                group.children.map((child) => (
                  <MobileLink key={child.href} href={child.href} label={child.label} active={isActive(child.href)} />
                ))
              ) : (
                <MobileLink key={group.href} href={group.href!} label={group.label} active={isActive(group.href!)} />
              )}
            </React.Fragment>
          ))}
          <button
            type="button"
            onClick={async () => {
              await logoutAction();
              router.push("/login");
            }}
            aria-label="Logout"
            className="ml-1 rounded-md p-2 text-dash-muted-foreground transition-colors duration-200 hover:bg-dash-accent hover:text-dash-foreground"
          >
            <LogOut className="size-4" />
          </button>
        </nav>
      </header>
    </>
  );
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
        active
          ? "bg-dash-sidebar-accent text-dash-sidebar-accent-foreground"
          : "text-dash-muted-foreground hover:bg-dash-sidebar-accent hover:text-dash-sidebar-accent-foreground",
      )}
    >
      {Icon && <Icon className="size-4 shrink-0" />}
      {label}
    </Link>
  );
}

function MobileLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200",
        active ? "bg-dash-accent text-dash-foreground" : "text-dash-muted-foreground hover:text-dash-foreground",
      )}
    >
      {label}
    </Link>
  );
}
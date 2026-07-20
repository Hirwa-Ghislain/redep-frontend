import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Bell,
  ChevronsUpDown,
  CornerDownLeft,
  LogOut,
  Menu,
  Search,
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import type { NavItem, NavSection } from "@/config/nav";
import { ROLE_LABELS, PORTAL_HOME } from "@/config/roles";
import { useAuth, usePermission } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { commsService } from "@/services/commsService";
import { schoolService } from "@/services/schoolService";
import { timeAgo, fullName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LogoMark } from "./Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown } from "@/components/ui/Dropdown";

export interface PortalShellProps {
  nav: NavSection[];
  /** Short label shown in the workspace card, e.g. "Parent portal". */
  portalLabel: string;
  /** Extra context chip in the topbar (e.g. school name). */
  contextChip?: string;
}

/* --------------------------------- sidebar ---------------------------------- */

function SidebarNav({ nav, onNavigate }: { nav: NavSection[]; onNavigate?: () => void }) {
  const { has } = usePermission();
  return (
    <nav className="flex-1 overflow-y-auto scroll-dark px-3 pb-4">
      {nav.map((section, i) => {
        const items = section.items.filter((item) => has(item.permission));
        if (items.length === 0) return null;
        return (
          <div key={i} className={i === 0 ? "mt-1" : "mt-5"}>
            {section.title && (
              <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition-colors duration-150",
                        isActive
                          ? "bg-white text-pine-deep font-semibold shadow-(--shadow-card)"
                          : "font-medium text-white/60 hover:bg-white/10 hover:text-white",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-white/45 group-hover:text-white/80")}
                          aria-hidden
                        />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

/* ----------------------------- quick-nav search ------------------------------ */

function QuickNav({ nav }: { nav: NavSection[] }) {
  const { has } = usePermission();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const allItems = useMemo(
    () => nav.flatMap((s) => s.items).filter((item) => has(item.permission)),
    [nav, has],
  );
  const results = q
    ? allItems.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()))
    : allItems.slice(0, 6);

  const go = (item: NavItem) => {
    setOpen(false);
    setQ("");
    navigate(item.to);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative hidden sm:block">
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="flex h-8.5 w-56 lg:w-64 items-center gap-2 rounded-(--radius-ctl) border border-line bg-paper px-2.5 text-[12.5px] text-faint hover:border-line-strong hover:bg-surface transition-colors"
        aria-label="Quick navigation"
      >
        <Search className="size-3.5" />
        <span>Jump to…</span>
        <kbd className="ml-auto rounded border border-line bg-surface px-1.5 py-px text-[10.5px] font-medium text-faint">
          Ctrl K
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute left-0 top-0 z-50 w-[min(92vw,340px)] rounded-xl border border-line bg-surface shadow-(--shadow-pop) overflow-hidden"
          >
            <div className="flex items-center gap-2 border-b border-line px-3">
              <Search className="size-3.5 text-faint shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && results[0]) go(results[0]);
                }}
                placeholder="Where to?"
                className="h-9 w-full bg-transparent text-[13px] text-ink placeholder:text-faint focus:outline-none"
              />
            </div>
            <ul className="max-h-72 overflow-y-auto p-1">
              {results.length === 0 ? (
                <li className="px-3 py-6 text-center text-[12.5px] text-muted">No matching pages.</li>
              ) : (
                results.map((item, i) => (
                  <li key={item.to}>
                    <button
                      onClick={() => go(item)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
                        i === 0 && q ? "bg-primary-soft text-primary-deep" : "text-ink hover:bg-paper",
                      )}
                    >
                      <item.icon className="size-4 text-muted shrink-0" />
                      {item.label}
                      {i === 0 && q && <CornerDownLeft className="ml-auto size-3.5 text-primary-deep/60" />}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------ notifications ------------------------------- */

function NotificationsBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => commsService.notifications(user!.id),
    enabled: Boolean(user),
    refetchInterval: 30_000,
  });

  const markAll = useMutation({
    mutationFn: () => commsService.markNotificationsRead(user!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        className="relative flex size-8 items-center justify-center rounded-lg border border-transparent text-muted hover:bg-paper hover:border-line hover:text-ink transition-colors"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex size-3.5 items-center justify-center rounded-full bg-clay text-[9px] font-bold text-white tnum ring-2 ring-surface">
            {unread > 9 ? "9" : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-40 mt-2 w-[min(92vw,360px)] origin-top-right rounded-xl border border-line bg-surface shadow-(--shadow-pop) overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
              <p className="font-display font-semibold text-[13px] text-ink">Notifications</p>
              {unread > 0 && (
                <button
                  onClick={() => markAll.mutate()}
                  className="text-[12px] font-medium text-primary-deep hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-10 text-center text-[12.5px] text-muted">You're all caught up.</p>
              ) : (
                notifications.slice(0, 12).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setOpen(false);
                      void commsService.markNotificationsRead(user!.id, [n.id]).then(() =>
                        qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
                      );
                      if (n.link) navigate(n.link);
                    }}
                    className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left border-b border-line last:border-0 hover:bg-paper/70 transition-colors"
                  >
                    <span
                      className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", n.read ? "bg-line-strong" : "bg-gold")}
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className={cn("block text-[12.5px] leading-snug", n.read ? "text-muted" : "text-ink font-medium")}>
                        {n.title}
                      </span>
                      <span className="block text-[12px] text-muted truncate mt-px">{n.body}</span>
                      <span className="block text-[11px] text-faint mt-0.5">{timeAgo(n.createdAt)}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------------------------- shell ----------------------------------- */

export function PortalShell({ nav, portalLabel, contextChip }: PortalShellProps) {
  const { user, role } = useAuth();
  const logout = useAuthStore((s) => s.logout);
  const setActiveRole = useAuthStore((s) => s.setActiveRole);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const navigate = useNavigate();
  const location = useLocation();

  // School name for the workspace card (school-scoped portals only).
  const { data: school } = useQuery({
    queryKey: ["school", user?.schoolId],
    queryFn: () => schoolService.get(user!.schoolId!),
    enabled: Boolean(user?.schoolId),
    staleTime: Infinity,
  });

  useEffect(() => setSidebarOpen(false), [location.pathname, setSidebarOpen]);

  if (!user) return null;

  const name = fullName(user);
  const otherRoles = user.roles.filter((r) => r !== role);
  const workspaceName =
    school?.name ??
    (role === "PARENT" ? "Family account" : role === "APPLICANT" ? "My career" : "REDEP National");

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <span className="inline-flex items-center gap-2.5 select-none">
          <LogoMark size={28} />
          <span className="font-display font-bold text-[15px] tracking-tight text-white">REDEP</span>
        </span>
        <button
          className="lg:hidden p-1.5 rounded-lg text-white/60 hover:text-white"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        >
          <X className="size-4.5" />
        </button>
      </div>

      {/* workspace card */}
      <div className="mx-3 mb-2 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.07] px-2.5 py-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gold text-[11px] font-bold text-pine-deep font-display">
          {workspaceName.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[12.5px] font-semibold text-white">{workspaceName}</span>
          <span className="block truncate text-[10.5px] text-white/45">{portalLabel}</span>
        </span>
      </div>

      <SidebarNav nav={nav} onNavigate={() => setSidebarOpen(false)} />

      <div className="border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1">
          <Avatar name={name} size="sm" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[12.5px] font-medium text-white">{name}</p>
            <p className="truncate text-[10.5px] text-white/45">
              {user.staffRoleName ?? (role ? ROLE_LABELS[role] : "")}
            </p>
          </div>
          <button
            onClick={() => { logout(); navigate("/login"); }}
            aria-label="Sign out"
            className="p-1.5 rounded-md text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-paper">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-pine lg:flex">{sidebarContent}</aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-pine-deep/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              className="absolute inset-y-0 left-0 flex w-[272px] flex-col bg-pine"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {sidebarContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="lg:pl-60 flex min-h-dvh flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface/95 backdrop-blur px-4 sm:px-6">
          <button
            className="lg:hidden p-1.5 -ml-1 rounded-lg text-muted hover:bg-paper hover:text-ink"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-4.5" />
          </button>

          <QuickNav nav={nav} />

          {contextChip && (
            <span className="hidden md:block text-[12px] text-faint truncate">{contextChip}</span>
          )}

          <div className="ml-auto flex items-center gap-1">
            <NotificationsBell />
            <span className="mx-1 h-4 w-px bg-line-strong hidden sm:block" aria-hidden />
            <Dropdown
              align="right"
              trigger={
                <button className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 hover:bg-paper border border-transparent hover:border-line transition-all">
                  <Avatar name={name} size="sm" />
                  <span className="hidden md:block text-[12.5px] font-medium text-ink max-w-28 truncate">{name}</span>
                  <ChevronsUpDown className="size-3 text-faint" />
                </button>
              }
              items={[
                ...otherRoles.map((r) => ({
                  label: `Switch to ${ROLE_LABELS[r]}`,
                  icon: ArrowLeftRight,
                  onSelect: () => { setActiveRole(r); navigate(PORTAL_HOME[r]); },
                })),
                ...(otherRoles.length ? (["divider"] as const) : []),
                { label: "Settings", icon: SettingsIcon, onSelect: () => navigate(`${role ? PORTAL_HOME[role] : ""}/settings`) },
                { label: "Sign out", icon: LogOut, danger: true, onSelect: () => { logout(); navigate("/login"); } },
              ]}
            />
          </div>
        </header>
        <main className="flex-1 px-4 sm:px-6 py-5 max-w-[1320px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

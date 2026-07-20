import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Pencil, Plus, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import { Checkbox, Input, Textarea } from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { staffService } from "@/services/staffService";
import { toast } from "@/stores/uiStore";
import {
  ALL_MINISTRY_PERMISSIONS,
  ALL_PLATFORM_PERMISSIONS,
  SCHOOL_PERMISSION_CATALOG,
} from "@/config/permissions";
import type { RoleDefinition } from "@/types";
import { cn } from "@/lib/utils";

/** "platform.schools.manage" → "Schools manage" (prefix stripped, dots/underscores → spaces). */
function humanizeKey(key: string, prefix: string): string {
  const words = key.replace(prefix, "").split(/[._]/).filter(Boolean).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

interface RoleForm {
  id?: string;
  name: string;
  description: string;
  permissions: string[];
}

const EMPTY_FORM: RoleForm = { name: "", description: "", permissions: [] };

export default function RolesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<RoleForm | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(SCHOOL_PERMISSION_CATALOG[0]?.group ?? null);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["global-roles"],
    queryFn: () => staffService.globalRoles(),
  });

  const save = useMutation({
    mutationFn: (input: RoleForm) =>
      staffService.saveRole({
        id: input.id,
        schoolId: null,
        name: input.name.trim(),
        description: input.description.trim(),
        permissions: input.permissions,
      }),
    onSuccess: (role) => {
      setForm(null);
      void qc.invalidateQueries({ queryKey: ["global-roles"] });
      void qc.invalidateQueries({ queryKey: ["audit"] });
      toast({
        title: "Role saved",
        description: `"${role.name}" now grants ${role.permissions.length} permission${role.permissions.length === 1 ? "" : "s"}.`,
        variant: "success",
      });
    },
    onError: () => toast({ title: "Could not save role", description: "Please try again.", variant: "error" }),
  });

  const togglePermission = (key: string) =>
    setForm((f) =>
      f
        ? {
            ...f,
            permissions: f.permissions.includes(key)
              ? f.permissions.filter((p) => p !== key)
              : [...f.permissions, key],
          }
        : f,
    );

  const canSave = Boolean(form && form.name.trim() && form.permissions.length > 0);

  return (
    <PageTransition>
      <PageHeader
        title="Roles & permissions"
        description="Global role definitions and the full permission catalog schools can delegate from."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setForm(EMPTY_FORM)}>
            Create global role
          </Button>
        }
      />

      {/* Section 1 — roles */}
      <h2 className="font-display font-semibold text-[15px] text-ink mb-3">Built-in & global roles</h2>
      {isLoading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      ) : (
        <Stagger className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {roles.map((role: RoleDefinition) => (
            <StaggerItem key={role.id} className="h-full">
              <Card padded={false} className="p-4 h-full flex flex-col">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-deep">
                    <ShieldCheck className="size-4" aria-hidden />
                  </span>
                  <h3 className="font-display font-semibold text-[14px] text-ink truncate">{role.name}</h3>
                </div>
                <p className="text-[12.5px] text-muted mt-2 line-clamp-2 flex-1">{role.description}</p>
                <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
                  <span className="inline-flex items-center rounded-full bg-ink/6 px-2 py-0.5 text-[11px] font-semibold text-muted tnum">
                    {role.permissions.length} permission{role.permissions.length === 1 ? "" : "s"}
                  </span>
                  {role.system && <Badge variant="ink">Built-in</Badge>}
                  {!role.system && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      icon={<Pencil className="size-3.5" />}
                      onClick={() =>
                        setForm({ id: role.id, name: role.name, description: role.description, permissions: [...role.permissions] })
                      }
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </Card>
            </StaggerItem>
          ))}
          {roles.length === 0 && (
            <p className="text-[13px] text-muted col-span-full">No global roles defined yet — create the first one.</p>
          )}
        </Stagger>
      )}

      {/* Section 2 — permission catalog reference */}
      <h2 className="font-display font-semibold text-[15px] text-ink mt-7 mb-3">Permission catalog</h2>
      <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
      <FadeIn className="min-w-0">
        <Card padded={false}>
          <CardHeader
            className="px-4 pt-4"
            title="School permission catalog"
            description="Read-only reference of everything a school administrator can delegate to custom staff roles."
          />
          <div className="divide-y divide-line">
            {SCHOOL_PERMISSION_CATALOG.map((group) => {
              const open = openGroup === group.group;
              return (
                <div key={group.group}>
                  <button
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-paper/70 transition-colors"
                    onClick={() => setOpenGroup(open ? null : group.group)}
                    aria-expanded={open}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted">{group.group}</span>
                    <span className="flex items-center gap-2 text-[12px] text-muted">
                      <span className="tnum">{group.items.length}</span>
                      <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
                    </span>
                  </button>
                  {open && (
                    <div className="px-4 pb-3 space-y-2">
                      {group.items.map((item) => (
                        <div key={item.key} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                          <p className="text-[13px] font-medium text-ink">{item.label}</p>
                          <code className="text-[11px] text-faint tnum">{item.key}</code>
                          <p className="w-full text-[11.5px] text-muted">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </FadeIn>

      {/* How delegation works */}
      <FadeIn delay={0.05}>
        <Card>
          <CardHeader title="How delegation works" />
          <p className="text-[12.5px] text-muted mb-3">
            <span className="font-semibold text-ink tnum">
              {SCHOOL_PERMISSION_CATALOG.reduce((sum, g) => sum + g.items.length, 0)}
            </span>{" "}
            delegable permissions across{" "}
            <span className="font-semibold text-ink tnum">{SCHOOL_PERMISSION_CATALOG.length}</span> groups.
          </p>
          <ul className="space-y-2 text-[12.5px] text-muted">
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="size-4 text-primary-deep shrink-0 mt-0.5" aria-hidden />
              Built-in roles are fixed by the platform and cannot be edited or deleted.
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="size-4 text-primary-deep shrink-0 mt-0.5" aria-hidden />
              Custom global roles can combine platform, ministry and school permissions.
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="size-4 text-primary-deep shrink-0 mt-0.5" aria-hidden />
              School administrators build their own staff roles from this catalog — nothing outside it can be delegated.
            </li>
          </ul>
        </Card>
      </FadeIn>
      </div>

      {/* Create / edit drawer */}
      <Drawer
        open={Boolean(form)}
        onClose={() => !save.isPending && setForm(null)}
        title={form?.id ? "Edit global role" : "Create global role"}
        description="Global roles are managed by the platform team and are not tied to a single school."
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setForm(null)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button loading={save.isPending} disabled={!canSave} onClick={() => form && save.mutate(form)}>
              {form?.id ? "Save changes" : "Create role"}
            </Button>
          </>
        }
      >
        {form && (
          <div className="space-y-5">
            <Input
              label="Role name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Support Analyst"
            />
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What is this role for?"
              rows={2}
            />

            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted mb-2.5">Platform permissions</p>
              <div className="space-y-2.5">
                {ALL_PLATFORM_PERMISSIONS.map((key) => (
                  <Checkbox
                    key={key}
                    label={humanizeKey(key, "platform.")}
                    description={key}
                    checked={form.permissions.includes(key)}
                    onChange={() => togglePermission(key)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted mb-2.5">Ministry permissions</p>
              <div className="space-y-2.5">
                {ALL_MINISTRY_PERMISSIONS.map((key) => (
                  <Checkbox
                    key={key}
                    label={humanizeKey(key, "ministry.")}
                    description={key}
                    checked={form.permissions.includes(key)}
                    onChange={() => togglePermission(key)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted mb-2.5">School permissions</p>
              <div className="space-y-4">
                {SCHOOL_PERMISSION_CATALOG.map((group) => (
                  <div key={group.group}>
                    <p className="text-[13px] font-semibold text-ink mb-2">{group.group}</p>
                    <div className="space-y-2.5">
                      {group.items.map((item) => (
                        <Checkbox
                          key={item.key}
                          label={item.label}
                          description={item.description}
                          checked={form.permissions.includes(item.key)}
                          onChange={() => togglePermission(item.key)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[12.5px] text-muted border-t border-line pt-3 tnum">
              {form.permissions.length} permission{form.permissions.length === 1 ? "" : "s"} selected
              {form.permissions.length === 0 && " — select at least one to save."}
            </p>
          </div>
        )}
      </Drawer>
    </PageTransition>
  );
}

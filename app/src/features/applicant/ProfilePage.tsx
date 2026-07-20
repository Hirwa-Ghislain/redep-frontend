import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, GraduationCap, MapPin, Plus, Save, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn, PageTransition } from "@/components/motion";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { FileDrop } from "@/components/ui/FileDrop";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { recruitmentService } from "@/services/recruitmentService";
import { schoolService } from "@/services/schoolService";
import type { ApiError } from "@/lib/api/client";
import { fullName, percent } from "@/lib/format";
import { DOC_STATUS } from "@/lib/status";
import { toast } from "@/stores/uiStore";
import { uid } from "@/lib/utils";
import type { ApplicantProfile, DocumentRef, User } from "@/types";
import { profileStrength } from "./shared";

interface EducationRow { qualification: string; institution: string; year: string }
interface ExperienceRow { title: string; organization: string; from: string; to: string; description: string }

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["applicant-profile", user?.id],
    queryFn: () => recruitmentService.profile(user!.id),
    enabled: Boolean(user),
  });

  if (isLoading || !profile || !user) {
    return (
      <PageTransition>
        <PageHeader title="My profile" description="Your REDEP CV — this is what schools see when you apply." />
        <div className="grid lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2 space-y-4"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
          <CardSkeleton />
        </div>
      </PageTransition>
    );
  }

  return <ProfileEditor key={profile.userId} profile={profile} user={user} />;
}

function ProfileEditor({ profile, user }: { profile: ApplicantProfile; user: User }) {
  const qc = useQueryClient();

  /* ------------------------------ local state ------------------------------ */
  const [headline, setHeadline] = useState(profile.headline);
  const [bio, setBio] = useState(profile.bio);
  const [district, setDistrict] = useState(profile.district);
  const [experienceYears, setExperienceYears] = useState(String(profile.experienceYears));
  const [subjects, setSubjects] = useState<string[]>(profile.subjects);
  const [subjectDraft, setSubjectDraft] = useState("");
  const [education, setEducation] = useState<EducationRow[]>(
    profile.education.map((e) => ({ qualification: e.qualification, institution: e.institution, year: String(e.year) })),
  );
  const [experience, setExperience] = useState<ExperienceRow[]>(
    profile.experience.map((e) => ({
      title: e.title, organization: e.organization, from: e.from, to: e.to ?? "", description: e.description ?? "",
    })),
  );
  const [documents, setDocuments] = useState<DocumentRef[]>(profile.documents);

  const { data: districts = [] } = useQuery({ queryKey: ["districts"], queryFn: () => schoolService.districts() });
  const districtOptions = districts.includes(district) || !district ? districts : [district, ...districts];

  /* ------------------------------- mutations ------------------------------- */
  const save = useMutation({
    mutationFn: (patch: Partial<ApplicantProfile>) => recruitmentService.updateProfile(user.id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["applicant-profile"] });
      toast({ title: "Profile saved", variant: "success" });
    },
    onError: (e) =>
      toast({ title: "Could not save", description: (e as unknown as ApiError).message ?? "Please try again.", variant: "error" }),
  });

  const saveIdentity = () =>
    save.mutate({
      headline: headline.trim(),
      bio: bio.trim(),
      district,
      experienceYears: Math.max(0, Number(experienceYears) || 0),
      subjects,
    });

  const saveEducation = () => {
    const rows = education
      .filter((r) => r.qualification.trim() && r.institution.trim())
      .map((r) => ({ qualification: r.qualification.trim(), institution: r.institution.trim(), year: Number(r.year) || new Date().getFullYear() }));
    save.mutate({ education: rows });
  };

  const saveExperience = () => {
    const rows = experience
      .filter((r) => r.title.trim() && r.organization.trim())
      .map((r) => ({
        title: r.title.trim(),
        organization: r.organization.trim(),
        from: r.from,
        to: r.to || undefined,
        description: r.description.trim() || undefined,
      }));
    save.mutate({ experience: rows });
  };

  const onDocumentsChange = (fileNames: string[]) => {
    const next = fileNames.map(
      (fileName) =>
        documents.find((d) => d.fileName === fileName) ?? {
          id: uid("doc"),
          type: "CV" as const,
          fileName,
          uploadedAt: new Date().toISOString(),
          status: "PENDING" as const,
        },
    );
    setDocuments(next);
    save.mutate({ documents: next });
  };

  /* ------------------------------ chip editor ------------------------------ */
  const addSubject = () => {
    const s = subjectDraft.trim();
    if (!s || subjects.some((x) => x.toLowerCase() === s.toLowerCase())) {
      setSubjectDraft("");
      return;
    }
    setSubjects((list) => [...list, s]);
    setSubjectDraft("");
  };

  const strength = profileStrength({
    ...profile,
    headline, bio, district, subjects,
    education: education.filter((r) => r.qualification.trim() && r.institution.trim()).map((r) => ({
      qualification: r.qualification, institution: r.institution, year: Number(r.year) || 0,
    })),
    experience: experience.filter((r) => r.title.trim() && r.organization.trim()).map((r) => ({
      title: r.title, organization: r.organization, from: r.from,
    })),
    documents,
  });

  return (
    <PageTransition>
      <PageHeader
        title="My profile"
        description="Your REDEP CV — this is what schools see when you apply."
      />

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          {/* Identity */}
          <Card padded={false} className="p-4">
            <CardHeader title="About you" description="Headline, location and the subjects you teach." />
            <div className="space-y-3">
              <Input
                label="Professional headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Physics & Mathematics teacher — 6 years experience"
              />
              <Textarea
                label="Short bio"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Two or three sentences about your teaching philosophy and strengths."
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <Select label="District" value={district} onChange={(e) => setDistrict(e.target.value)}>
                  <option value="" disabled>Select…</option>
                  {districtOptions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </Select>
                <Input
                  label="Years of experience"
                  type="number"
                  min={0}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                />
              </div>

              <div>
                <p className="text-[13px] font-medium text-ink mb-1.5">Subjects</p>
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Add a subject"
                    placeholder="e.g. Chemistry"
                    value={subjectDraft}
                    onChange={(e) => setSubjectDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSubject();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button variant="secondary" icon={<Plus className="size-4" />} onClick={addSubject}>
                    Add
                  </Button>
                </div>
                {subjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {subjects.map((s) => (
                      <Badge key={s} variant="success" className="pr-1.5">
                        {s}
                        <button
                          type="button"
                          aria-label={`Remove ${s}`}
                          onClick={() => setSubjects((list) => list.filter((x) => x !== s))}
                          className="p-0.5 rounded-full hover:bg-primary/15 transition-colors"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button icon={<Save className="size-4" />} loading={save.isPending} onClick={saveIdentity}>
                  Save changes
                </Button>
              </div>
            </div>
          </Card>

          {/* Education */}
          <Card padded={false} className="p-4">
            <CardHeader
              title="Education"
              description="Qualifications, most recent first."
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Plus className="size-3.5" />}
                  onClick={() => setEducation((rows) => [...rows, { qualification: "", institution: "", year: "" }])}
                >
                  Add
                </Button>
              }
            />
            {education.length === 0 ? (
              <p className="text-[13px] text-muted py-2">No education added yet — schools look for this first.</p>
            ) : (
              <div className="divide-y divide-line">
                {education.map((row, i) => (
                  <div key={i} className="flex flex-wrap sm:flex-nowrap items-end gap-2.5 py-2.5">
                    <Input
                      label="Qualification"
                      value={row.qualification}
                      onChange={(e) => setEducation((rows) => rows.map((r, j) => (j === i ? { ...r, qualification: e.target.value } : r)))}
                      className="w-full sm:flex-1"
                    />
                    <Input
                      label="Institution"
                      value={row.institution}
                      onChange={(e) => setEducation((rows) => rows.map((r, j) => (j === i ? { ...r, institution: e.target.value } : r)))}
                      className="w-full sm:flex-1"
                    />
                    <Input
                      label="Year"
                      type="number"
                      value={row.year}
                      onChange={(e) => setEducation((rows) => rows.map((r, j) => (j === i ? { ...r, year: e.target.value } : r)))}
                      className="w-24"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove education entry ${i + 1}`}
                      icon={<Trash2 className="size-4 text-clay" />}
                      onClick={() => setEducation((rows) => rows.filter((_, j) => j !== i))}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-3">
              <Button icon={<Save className="size-4" />} loading={save.isPending} onClick={saveEducation}>
                Save education
              </Button>
            </div>
          </Card>

          {/* Experience */}
          <Card padded={false} className="p-4">
            <CardHeader
              title="Work experience"
              description="Roles you've held — leave “To” empty for your current role."
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Plus className="size-3.5" />}
                  onClick={() => setExperience((rows) => [...rows, { title: "", organization: "", from: "", to: "", description: "" }])}
                >
                  Add
                </Button>
              }
            />
            {experience.length === 0 ? (
              <p className="text-[13px] text-muted py-2">No experience added yet.</p>
            ) : (
              <div className="divide-y divide-line">
                {experience.map((row, i) => (
                  <div key={i} className="py-2.5 space-y-2.5">
                    <div className="grid sm:grid-cols-2 gap-2.5">
                      <Input
                        label="Job title"
                        value={row.title}
                        onChange={(e) => setExperience((rows) => rows.map((r, j) => (j === i ? { ...r, title: e.target.value } : r)))}
                      />
                      <Input
                        label="Organisation"
                        value={row.organization}
                        onChange={(e) => setExperience((rows) => rows.map((r, j) => (j === i ? { ...r, organization: e.target.value } : r)))}
                      />
                      <Input
                        label="From"
                        type="month"
                        value={row.from}
                        onChange={(e) => setExperience((rows) => rows.map((r, j) => (j === i ? { ...r, from: e.target.value } : r)))}
                      />
                      <Input
                        label="To (optional)"
                        type="month"
                        value={row.to}
                        onChange={(e) => setExperience((rows) => rows.map((r, j) => (j === i ? { ...r, to: e.target.value } : r)))}
                      />
                    </div>
                    <Input
                      label="Description (optional)"
                      value={row.description}
                      placeholder="One line on what you achieved in this role."
                      onChange={(e) => setExperience((rows) => rows.map((r, j) => (j === i ? { ...r, description: e.target.value } : r)))}
                    />
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove experience entry ${i + 1}`}
                        icon={<Trash2 className="size-4 text-clay" />}
                        onClick={() => setExperience((rows) => rows.filter((_, j) => j !== i))}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-3">
              <Button icon={<Save className="size-4" />} loading={save.isPending} onClick={saveExperience}>
                Save experience
              </Button>
            </div>
          </Card>

          {/* Documents */}
          <Card padded={false} className="p-4">
            <CardHeader
              title="Documents"
              description="Your CV and certificates — removing or adding a file saves automatically."
            />
            {documents.length > 0 && (
              <ul className="space-y-1.5 mb-3">
                {documents.map((d) => {
                  const meta = DOC_STATUS[d.status];
                  return (
                    <li key={d.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                      <span className="truncate text-muted">{d.fileName}</span>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
            <FileDrop
              label="Attached files"
              files={documents.map((d) => d.fileName)}
              onChange={onDocumentsChange}
              hint="New uploads are marked pending until REDEP verifies them."
            />
          </Card>
        </div>

        {/* Right column — live preview */}
        <div className="space-y-3 lg:sticky lg:top-20">
          <FadeIn>
            <Card padded={false} className="p-4">
              <CardHeader className="mb-3" title="How schools see you" description="Live preview of your public profile." />
              <div className="flex items-start gap-3">
                <Avatar name={fullName(user)} size="md" />
                <div className="min-w-0">
                  <p className="font-display font-semibold text-[14px] text-ink">{fullName(user)}</p>
                  <p className="text-[12.5px] text-muted mt-0.5">{headline.trim() || "Add a headline so schools notice you."}</p>
                </div>
              </div>
              <div className="space-y-1.5 mt-3 text-[12.5px] text-muted">
                <p className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0" aria-hidden /> {district || "District not set"}
                </p>
                <p className="flex items-center gap-1.5">
                  <GraduationCap className="size-3.5 shrink-0" aria-hidden />
                  <span className="tnum">{Math.max(0, Number(experienceYears) || 0)}</span> years of experience
                </p>
                {documents.some((d) => d.type === "CV" && d.status === "VERIFIED") && (
                  <p className="flex items-center gap-1.5 text-primary-deep font-medium">
                    <BadgeCheck className="size-3.5 shrink-0" aria-hidden /> Verified CV on file
                  </p>
                )}
              </div>
              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {subjects.map((s) => (
                    <Badge key={s} variant="success">{s}</Badge>
                  ))}
                </div>
              )}
            </Card>
          </FadeIn>

          <FadeIn delay={0.05}>
            <Card padded={false} className="p-4">
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-[12px] font-medium text-muted">Profile strength</p>
                <p className="font-display font-bold text-[18px] text-ink tnum">{percent(strength)}</p>
              </div>
              <ProgressBar value={strength} label="Profile strength" />
              <p className="text-[12px] text-muted mt-2">
                {strength >= 1
                  ? "Complete — you're putting your best foot forward."
                  : "Fill every section (headline, bio, district, subjects, education, experience, documents) to reach 100%."}
              </p>
            </Card>
          </FadeIn>
        </div>
      </div>
    </PageTransition>
  );
}

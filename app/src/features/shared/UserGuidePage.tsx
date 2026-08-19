import { useMemo, useState } from "react";
import { BookOpen, ChevronRight, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useI18nStore } from "@/stores/i18nStore";
import type { LanguageCode } from "@/services/i18nService";
import type { RoleKey } from "@/types";
import { cn } from "@/lib/utils";

interface GuideSection { id: string; title: string; summary: string; steps: string[]; note?: string }
interface GuideCopy { title: string; description: string; search: string; contents: string; noResults: string; common: GuideSection[]; roles: Partial<Record<RoleKey, GuideSection[]>> }

const COPY: Record<LanguageCode, GuideCopy> = {
  EN: {
    title: "User guide",
    description: "Practical instructions for using E-SHURI safely and successfully.",
    search: "Search the guide…", contents: "In this guide", noResults: "No guidance matches your search.",
    common: [
      { id: "account", title: "Account, language and security", summary: "Manage access to your E-SHURI account.", steps: ["Use the language selector to choose English, Français or Kinyarwanda. Your choice is saved to your profile.", "Never share your password, OTP or invitation token. E-SHURI support will not ask for your password.", "Use Settings to update allowed profile information. Use Forgot password on the sign-in page if you lose access.", "After finishing, sign out—especially on a shared phone or computer."] },
      { id: "verification", title: "Registration and verification", summary: "How identity and contact verification work.", steps: ["Enter names and date of birth exactly as they appear on the National ID. Users must be at least 18 years old.", "A verification code is sent to both email and phone. Verify using either channel.", "Invited teachers and accountants must open the secure school invitation link; the email and role are filled automatically.", "If identity data does not match, correct the information instead of repeatedly submitting it."] },
      { id: "notifications", title: "Notifications and communication", summary: "Stay informed about actions that need attention.", steps: ["Check the notification bell for payments, admissions, attendance, messages, jobs and incidents.", "Email and SMS are used for important reminders such as OTPs, interview updates, attendance reports and installment due dates.", "Direct parent–teacher conversations remain linked to the child. The sender and recipient are displayed on every message."] },
      { id: "incidents", title: "Reporting a school incident", summary: "Report safeguarding concerns responsibly.", steps: ["Use the incident-reporting page when a serious school incident or harmful conduct must be brought to attention.", "Describe facts clearly and attach relevant evidence when available. Do not publish sensitive information elsewhere.", "Save the tracking reference. The school and education authority can acknowledge, review and follow up on the case.", "For immediate danger, contact emergency or law-enforcement services; E-SHURI is an education platform, not an emergency service."] },
    ],
    roles: {
      PARENT: [
        { id: "parent-school", title: "Find a school and apply", summary: "From school discovery to validated application.", steps: ["Open Find schools and review public school details, accredited levels, classes and available seats.", "Choose a class and submit the child’s names, age, previous school and annual report.", "OCR automatically checks the report name, marks and conduct against the class requirements.", "A valid application moves to payment. An unfinished application remains under Applications so you can continue later."], note: "A child cannot apply to another school while an earlier enrollment or resignation is not approved." },
        { id: "parent-pay", title: "Pay fees and keep receipts", summary: "Application, tuition and other school payments.", steps: ["The application fee must be paid once and in full.", "Tuition and compulsory fees may be paid in full or in two payments. The first payment must be at least half; the second clears the balance.", "For installments, provide a reason and the promised remaining-payment date. Reminders are sent near the due date.", "Choose the payment destination and the phone that should receive the MoMo prompt. Do not close the flow until payment is approved.", "Completed payments appear under Receipts and Fees & payments."], note: "Optional services such as lunch create a charge only when you select that your child uses the service." },
        { id: "parent-child", title: "Manage an admitted child", summary: "Teachers, attendance, messages and school information.", steps: ["Open My children and select a child to view teachers, class teacher, fees and attendance.", "Use Messages to contact an assigned teacher about that child.", "Read school-wide and class-specific announcements.", "To leave a school, request resignation. Approval requires all compulsory balances to be cleared."] },
      ],
      SCHOOL_ADMIN: [
        { id: "school-setup", title: "Set up the school", summary: "Profile, fees, classes and staff.", steps: ["Complete the NESA-verified school profile and public information.", "Create classes, set capacity and admission grade/conduct requirements, then assign class and course teachers.", "Configure application, tuition and other fees, and connect each fee to an active bank or mobile-money destination.", "Mark only OTHER services as optional when parents should choose participation per child.", "Invite teachers or accountants in batches; each person receives a secure registration link."] },
        { id: "school-admissions", title: "Admissions and students", summary: "Monitor applications and student placement.", steps: ["Applications are OCR-validated automatically and wait for required payments.", "Admission requires the full application fee and at least half of tuition and other compulsory fees.", "Monitor class capacity and enrolled students. Available seats update as students join or resign.", "Review resignation requests; approve only after outstanding compulsory fees are cleared."] },
        { id: "school-finance", title: "Fees, payments and accounting", summary: "Track collection by class and student.", steps: ["Use Payments for transaction records and Accounting for revenue and outstanding analytics.", "In Accounting, choose a class and then a student to see every billed, paid and unpaid fee.", "Installment records show the parent’s reason, due date and remaining balance.", "Optional service participation is kept as a soft operational list and declined services are not debts."] },
        { id: "school-community", title: "Community, recruitment and safety", summary: "Communicate and manage school operations.", steps: ["Publish school-wide or class-specific announcements to relevant parents.", "Post jobs with a deadline. Active jobs appear to applicants; expired jobs close automatically.", "Review applicants, shortlist or reject them; the applicant receives email and progress updates.", "Acknowledge safeguarding incidents and coordinate educational follow-up with the authority."] },
      ],
      SCHOOL_STAFF: [
        { id: "accounting", title: "Accountant workflow", summary: "Understand the school’s complete financial position.", steps: ["Use Payments to search, filter and review transactions and payment references.", "Use Accounting to see revenue, unpaid totals, overdue installments and class trends.", "Select a class and student to inspect all fees, installments and remaining-payment dates.", "Download available receipts and reconcile only payments that have been independently confirmed."], note: "Accountants can view finance and student information but cannot change school ownership or admission rules." },
      ],
      TEACHER: [
        { id: "teacher-classes", title: "Classes and attendance", summary: "Work with assigned classes and courses.", steps: ["My classes shows classes and courses assigned to you.", "Record attendance for each lesson. The exact recording time is stored.", "Review attendance before submitting to avoid incorrect parent reports.", "Parents receive weekly reminders to review their child’s course attendance."] },
        { id: "teacher-message", title: "Parent communication", summary: "Reply to messages linked to students.", steps: ["Messages from parents appear in your inbox with an unread notification.", "Open the conversation to see the parent, child, sender and recipient.", "Keep replies professional and focused on the linked student."] },
      ],
      APPLICANT: [
        { id: "jobs", title: "Find and apply for jobs", summary: "Track applications from submission to decision.", steps: ["Open Job board to see vacancies whose deadlines have not passed.", "Review the school, role, requirements and deadline before applying.", "Open My applications to view submitted, shortlisted or rejected status.", "Shortlisting and rejection updates are also sent by email."] },
      ],
      MINISTRY_ADMIN: [
        { id: "authority", title: "Education authority oversight", summary: "Monitor schools without replacing school operations.", steps: ["Use the national overview and school registry to review accreditation, enrollment, capacity and staffing.", "Compare attendance and transfer trends by school and class.", "Review safeguarding incidents visible to the authority and record appropriate educational follow-up.", "Use reports and circulars according to your assigned permissions."] },
      ],
      SYSTEM_ADMIN: [
        { id: "platform", title: "Platform administration", summary: "Operate E-SHURI securely.", steps: ["Manage users, schools, roles and education-authority accounts from the administration portal.", "Use Broadcast for platform-wide information and Audit log for traceability.", "Suspend access only with a valid administrative reason and avoid modifying school operational data unnecessarily.", "Protect environment secrets, payment credentials, SMTP passwords and external API keys."] },
      ],
    },
  },
  FR: {
    title: "Guide utilisateur", description: "Instructions pratiques pour utiliser E-SHURI correctement et en toute sécurité.", search: "Rechercher dans le guide…", contents: "Dans ce guide", noResults: "Aucun résultat dans le guide.",
    common: [
      { id: "account", title: "Compte, langue et sécurité", summary: "Gérez l’accès à votre compte E-SHURI.", steps: ["Utilisez le sélecteur de langue pour choisir English, Français ou Kinyarwanda. Le choix est enregistré.", "Ne partagez jamais votre mot de passe, OTP ou jeton d’invitation.", "Utilisez Paramètres pour modifier les informations autorisées et Mot de passe oublié si nécessaire.", "Déconnectez-vous après utilisation, surtout sur un appareil partagé."] },
      { id: "verification", title: "Inscription et vérification", summary: "Comprendre la vérification d’identité et des contacts.", steps: ["Saisissez les noms et la date de naissance comme sur la carte d’identité. L’utilisateur doit avoir au moins 18 ans.", "Le code est envoyé par e-mail et téléphone; vous pouvez utiliser l’un des deux.", "Les enseignants et comptables invités doivent ouvrir le lien sécurisé; l’e-mail et le rôle sont préremplis.", "Corrigez toute donnée qui ne correspond pas à l’identité nationale."] },
      { id: "notifications", title: "Notifications et communication", summary: "Suivez les actions qui demandent votre attention.", steps: ["Consultez la cloche pour les paiements, admissions, présences, messages, emplois et incidents.", "Les rappels importants sont aussi envoyés par e-mail ou SMS.", "Les conversations parent–enseignant restent liées à l’enfant et affichent l’expéditeur et le destinataire."] },
      { id: "incidents", title: "Signaler un incident scolaire", summary: "Signalez les problèmes de protection de manière responsable.", steps: ["Utilisez la page de signalement pour un incident grave ou un comportement nuisible.", "Décrivez les faits et joignez les preuves disponibles sans publier de données sensibles.", "Conservez la référence de suivi; l’école et l’autorité éducative peuvent assurer le suivi.", "En cas de danger immédiat, contactez les services d’urgence ou la police."] },
    ],
    roles: {
      PARENT: [
        { id: "parent-school", title: "Trouver une école et postuler", summary: "De la recherche d’école à la demande validée.", steps: ["Consultez les informations publiques, niveaux accrédités, classes et places disponibles.", "Choisissez une classe et fournissez les données de l’enfant et son bulletin annuel.", "L’OCR vérifie automatiquement le nom, les notes et la conduite.", "Une demande valide passe au paiement; une demande inachevée reste dans Demandes."], note: "Une nouvelle demande est bloquée tant qu’une ancienne inscription ou démission n’est pas approuvée." },
        { id: "parent-pay", title: "Payer les frais et conserver les reçus", summary: "Paiement de la demande, scolarité et autres frais.", steps: ["Les frais de demande sont obligatoires, uniques et payés entièrement.", "La scolarité et les frais obligatoires peuvent être payés en totalité ou en deux fois; le premier versement est d’au moins la moitié.", "Indiquez la raison et la date du solde pour un paiement échelonné.", "Choisissez la destination et le numéro qui recevra la demande MoMo.", "Les paiements terminés apparaissent dans Reçus et Frais et paiements."], note: "Un service optionnel n’est facturé que si vous indiquez que l’enfant l’utilise." },
        { id: "parent-child", title: "Suivre un enfant admis", summary: "Enseignants, présence, messages et informations scolaires.", steps: ["Ouvrez Mes enfants pour voir enseignants, frais et présence.", "Contactez un enseignant assigné depuis Messages.", "Lisez les annonces de l’école et de la classe.", "Demandez une démission; les frais obligatoires doivent être réglés."] },
      ],
      SCHOOL_ADMIN: [
        { id: "school-setup", title: "Configurer l’école", summary: "Profil, frais, classes et personnel.", steps: ["Complétez le profil vérifié par NESA.", "Créez les classes, capacités et critères, puis assignez les enseignants.", "Configurez les frais et leur compte bancaire ou mobile money.", "Seuls les services de type AUTRE peuvent être optionnels.", "Invitez plusieurs enseignants ou comptables par e-mail."] },
        { id: "school-admissions", title: "Admissions et élèves", summary: "Suivez les demandes et le placement.", steps: ["Les demandes sont validées automatiquement par OCR.", "L’admission exige tous les frais de demande et au moins la moitié des autres frais obligatoires.", "Surveillez la capacité et les places disponibles.", "N’approuvez une démission qu’après règlement des soldes obligatoires."] },
        { id: "school-finance", title: "Paiements et comptabilité", summary: "Analysez les encaissements par classe et élève.", steps: ["Paiements contient les transactions; Comptabilité présente revenus et impayés.", "Choisissez une classe puis un élève pour voir tous ses frais.", "Les échéances indiquent raison, date et solde.", "Les services optionnels refusés ne sont pas des dettes."] },
        { id: "school-community", title: "Communauté, recrutement et sécurité", summary: "Gérez les communications et opérations.", steps: ["Publiez des annonces pour l’école ou une classe.", "Publiez les emplois avec une date limite.", "Présélectionnez ou refusez les candidats; ils reçoivent une mise à jour.", "Assurez le suivi éducatif des incidents avec l’autorité."] },
      ],
      SCHOOL_STAFF: [{ id: "accounting", title: "Travail du comptable", summary: "Comprenez la situation financière de l’école.", steps: ["Recherchez et filtrez les transactions dans Paiements.", "Consultez revenus, impayés et échéances dans Comptabilité.", "Choisissez une classe et un élève pour examiner ses frais.", "Ne rapprochez qu’un paiement confirmé indépendamment."], note: "Le comptable consulte les finances sans modifier les règles d’admission." }],
      TEACHER: [{ id: "teacher-classes", title: "Classes et présences", summary: "Travaillez avec vos classes assignées.", steps: ["Mes classes affiche vos classes et cours.", "Enregistrez la présence à chaque leçon; l’heure exacte est conservée.", "Vérifiez les données avant validation.", "Les parents reçoivent un rappel hebdomadaire."] }, { id: "teacher-message", title: "Communication avec les parents", summary: "Répondez aux messages liés aux élèves.", steps: ["Les nouveaux messages apparaissent avec une notification.", "La conversation affiche parent, enfant, expéditeur et destinataire.", "Répondez professionnellement au sujet de l’élève."] }],
      APPLICANT: [{ id: "jobs", title: "Chercher un emploi et postuler", summary: "Suivez chaque candidature.", steps: ["Le tableau affiche les offres encore ouvertes.", "Vérifiez l’école, les exigences et la date limite.", "Mes candidatures affiche soumis, présélectionné ou refusé.", "Les décisions sont aussi envoyées par e-mail."] }],
      MINISTRY_ADMIN: [{ id: "authority", title: "Suivi par l’autorité éducative", summary: "Surveillez le système scolaire.", steps: ["Consultez accréditation, inscriptions, capacité et personnel.", "Comparez présence et transferts par école et classe.", "Suivez les incidents et les actions éducatives.", "Utilisez rapports et circulaires selon vos permissions."] }],
      SYSTEM_ADMIN: [{ id: "platform", title: "Administration de la plateforme", summary: "Exploitez E-SHURI en toute sécurité.", steps: ["Gérez utilisateurs, écoles, rôles et comptes d’autorité.", "Utilisez Diffusion et Journal d’audit.", "Ne suspendez un accès qu’avec une raison valide.", "Protégez tous les secrets et clés API."] }],
    },
  },
  RW: {
    title: "Igitabo cy’umukoresha", description: "Amabwiriza afasha gukoresha E-SHURI neza kandi mu mutekano.", search: "Shakisha mu mabwiriza…", contents: "Ibiri muri iki gitabo", noResults: "Nta mabwiriza ahuye n’ibyo washakishije.",
    common: [
      { id: "account", title: "Konti, ururimi n’umutekano", summary: "Uko urinda kandi ugacunga konti ya E-SHURI.", steps: ["Koresha ahahindurirwa ururimi uhitemo English, Français cyangwa Kinyarwanda. Ururimi urahisemo rurabikwa.", "Ntuzigere utanga ijambo ry’ibanga, OTP cyangwa token y’ubutumire.", "Koresha Settings uhindure amakuru yemerewe, cyangwa Forgot password niba wibagiwe ijambo ry’ibanga.", "Sohoka muri konti urangije, cyane cyane ku gikoresho gisangiwe."] },
      { id: "verification", title: "Kwiyandikisha no kugenzura umwirondoro", summary: "Uko indangamuntu na nimero cyangwa imeyili bigenzurwa.", steps: ["Andika amazina n’itariki y’amavuko nk’uko biri ku ndangamuntu. Ukoresha sisitemu agomba kuba afite nibura imyaka 18.", "Kode yoherezwa kuri imeyili na telefone; ushobora gukoresha kimwe muri byo.", "Mwarimu cyangwa umucungamari watumiwe akoresha link y’umutekano; imeyili n’inshingano byuzuzwa bihari.", "Kosora amakuru yose adahuye n’indangamuntu mbere yo kongera kohereza."] },
      { id: "notifications", title: "Amatangazo n’ubutumwa", summary: "Menya ibikorwa bigusaba kugira icyo ukora.", steps: ["Reba akamenyetso k’amatangazo ku byerekeye ubwishyu, kwemererwa, attendance, ubutumwa, akazi n’ibibazo byabaye.", "Ibyibutsa by’ingenzi byoherezwa no kuri imeyili cyangwa SMS.", "Ubutumwa hagati y’umubyeyi na mwarimu buhuzwa n’umwana kandi bwerekana uwayohereje n’uwayakiriye."] },
      { id: "incidents", title: "Kumenyesha ikibazo cyabaye ku ishuri", summary: "Tanga amakuru y’ikibazo mu buryo bufite inshingano.", steps: ["Koresha urupapuro rwo gutanga ikibazo ku byabaye bikomeye cyangwa imyitwarire ishobora kugirira umuntu nabi.", "Sobanura ukuri kandi ushyireho ibimenyetso bihari, wirinde gusakaza amakuru y’ibanga.", "Bika nimero yo gukurikirana; ishuri n’ubuyobozi bw’uburezi bashobora kugikurikirana.", "Niba hari akaga kihutirwa, hamagara inzego z’ubutabazi cyangwa umutekano."] },
    ],
    roles: {
      PARENT: [
        { id: "parent-school", title: "Gushaka ishuri no gusabira umwana", summary: "Kuva ku gushaka ishuri kugeza application igenzuwe.", steps: ["Reba amakuru rusange y’ishuri, ibyiciro byemewe, amashuri n’imyanya ihari.", "Hitamo class, utange amakuru y’umwana na raporo y’umwaka.", "OCR igenzura amazina, amanota n’imyitwarire iri kuri raporo.", "Application yemewe ijya ku bwishyu; itararangiye iguma muri Applications kugira ngo ukomeze."], note: "Umwana ntashobora gusaba irindi shuri mbere y’uko kuva ku rya mbere byemezwa." },
        { id: "parent-pay", title: "Kwishyura no kubika inyemezabwishyu", summary: "Amafaranga ya application, tuition n’andi mafaranga.", steps: ["Amafaranga ya application yishyurwa rimwe kandi yose.", "Tuition n’andi mafaranga ategetswe yishyurwa yose cyangwa mu byiciro bibiri; icya mbere ni nibura kimwe cya kabiri.", "Ku byiciro, tanga impamvu n’itariki uzishyuriraho asigaye.", "Hitamo aho amafaranga ajya na telefone yakira MoMo prompt.", "Ubwishyu bwarangiye bugaragara muri Receipts na Fees & payments."], note: "Serivisi idategetswe nka lunch yishyuzwa gusa iyo uhisemo ko umwana ayikoresha." },
        { id: "parent-child", title: "Gukurikirana umwana wemerewe", summary: "Abarimu, attendance, ubutumwa n’amakuru y’ishuri.", steps: ["Fungura My children urebe abarimu, amafaranga na attendance.", "Ohereza ubutumwa kuri mwarimu wigisha uwo mwana.", "Soma amatangazo y’ishuri n’aya class.", "Saba resignation; amafaranga yose ategetswe agomba kuba yarishyuwe."] },
      ],
      SCHOOL_ADMIN: [
        { id: "school-setup", title: "Gutegura ishuri muri sisitemu", summary: "Profile, amafaranga, classes n’abakozi.", steps: ["Uzuza profile y’ishuri yagenzuwe na NESA.", "Shyiraho classes, capacity n’ibisabwa, ushyireho abarimu.", "Shyiraho amafaranga n’aho yishyurirwa kuri banki cyangwa mobile money.", "OTHER fees gusa ni zo zishobora kuba optional.", "Tumira abarimu cyangwa abacungamari benshi ukoresheje imeyili."] },
        { id: "school-admissions", title: "Kwemerera abana no kubacunga", summary: "Kurikirana applications n’abanyeshuri.", steps: ["Applications zigenzurwa na OCR mu buryo bwikora.", "Kwemererwa bisaba application fee yose na nibura kimwe cya kabiri cy’andi mafaranga ategetswe.", "Kurikirana capacity n’imyanya ihari.", "Emeza resignation gusa amafaranga asigaye yarishyuwe."] },
        { id: "school-finance", title: "Ubwishyu n’ibaruramari", summary: "Kurikirana amafaranga kuri class no ku mwana.", steps: ["Payments yerekana transactions; Accounting ikerekana revenue n’ibirarane.", "Hitamo class, nyuma uhitemo umwana urebe amafaranga ye yose.", "Installments zerekana impamvu, itariki n’amafaranga asigaye.", "Optional service umubyeyi yanze ntabwo ibarwa nk’umwenda."] },
        { id: "school-community", title: "Itumanaho, akazi n’umutekano", summary: "Gucunga ibikorwa by’ishuri.", steps: ["Ohereza itangazo ku ishuri ryose cyangwa kuri class runaka.", "Tangaza akazi ushyireho deadline.", "Hitamo abajya ku cyiciro gikurikira cyangwa abanze; bahabwa imeyili.", "Kurikirana ibibazo byabaye hamwe n’ubuyobozi bw’uburezi."] },
      ],
      SCHOOL_STAFF: [{ id: "accounting", title: "Akazi k’umucungamari", summary: "Kumenya uko amafaranga y’ishuri ahagaze.", steps: ["Shakisha kandi ushungure transactions muri Payments.", "Reba revenue, ibirarane na installments muri Accounting.", "Hitamo class n’umwana urebe amafaranga ye yose.", "Emeza payment gusa nyuma yo kuyigenzura ahandi."], note: "Umucungamari abona amakuru y’imari ariko ntahindura amabwiriza yo kwemerera abana." }],
      TEACHER: [{ id: "teacher-classes", title: "Classes na attendance", summary: "Gukorana na classes washinzwe.", steps: ["My classes yerekana classes n’amasomo washinzwe.", "Kora attendance kuri buri somo; igihe nyacyo kibikwa.", "Banza ugenzure amakuru mbere yo kohereza.", "Ababyeyi bahabwa icyibutsa cya buri cyumweru."] }, { id: "teacher-message", title: "Kuvugana n’ababyeyi", summary: "Subiza ubutumwa bujyanye n’umwana.", steps: ["Ubutumwa bushya bugaragara hamwe na notification.", "Conversation yerekana umubyeyi, umwana, uwayohereje n’uwayakiriye.", "Subiza mu buryo bw’umwuga kandi uvuge ku mwana bireba."] }],
      APPLICANT: [{ id: "jobs", title: "Gushaka no gusaba akazi", summary: "Kurikirana application y’akazi.", steps: ["Job board yerekana akazi deadline itararenga.", "Reba ishuri, ibisabwa na deadline.", "My applications yerekana submitted, shortlisted cyangwa rejected.", "Impinduka zoherezwa no kuri imeyili."] }],
      MINISTRY_ADMIN: [{ id: "authority", title: "Ubugenzuzi bw’ubuyobozi bw’uburezi", summary: "Kurikirana amashuri muri rusange.", steps: ["Reba accreditation, enrollment, capacity n’abakozi.", "Gereranya attendance na transfers ku mashuri na classes.", "Kurikirana ibibazo byabaye n’ingamba z’uburezi zafashwe.", "Koresha reports na circulars ukurikije uburenganzira ufite."] }],
      SYSTEM_ADMIN: [{ id: "platform", title: "Gucunga platform", summary: "Gukoresha E-SHURI mu mutekano.", steps: ["Cunga users, schools, roles na konti z’ubuyobozi.", "Koresha Broadcast na Audit log.", "Hagarika konti gusa hari impamvu yemewe.", "Rinda secrets, payment credentials na API keys."] }],
    },
  },
};

export default function UserGuidePage() {
  const { role } = useAuth();
  const language = useI18nStore((state) => state.language);
  const copy = COPY[language];
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState("");
  const sections = useMemo(() => [...copy.common, ...(role ? copy.roles[role] ?? [] : [])], [copy, role]);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return sections;
    return sections.filter((section) => [section.title, section.summary, ...section.steps, section.note ?? ""].join(" ").toLocaleLowerCase().includes(term));
  }, [query, sections]);
  const selected = filtered.find((section) => section.id === activeId) ?? filtered[0] ?? null;

  return (
    <PageTransition>
      <PageHeader title={copy.title} description={copy.description} />
      <div className="relative mb-4 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} className="h-10 w-full rounded-(--radius-ctl) border border-line-strong bg-surface pl-10 pr-3 text-[13.5px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
      </div>
      {filtered.length === 0 ? <EmptyState icon={BookOpen} title={copy.noResults} /> : (
        <div className="grid items-start gap-4 lg:grid-cols-[290px_1fr]">
          <Card className="lg:sticky lg:top-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">{copy.contents}</p>
            <nav className="space-y-1">
              {filtered.map((section) => (
                <button key={section.id} onClick={() => setActiveId(section.id)} className={cn("group flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] transition", selected?.id === section.id ? "bg-primary-soft text-primary-deep" : "text-muted hover:bg-paper hover:text-ink")}>
                  <span>{section.title}</span><ChevronRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </nav>
          </Card>
          {selected && (
            <Card>
              <div className="mb-5 border-b border-line pb-4"><Badge variant="info">E-SHURI</Badge><h2 className="mt-2 font-display text-[22px] font-bold text-ink">{selected.title}</h2><p className="mt-1 text-[13.5px] text-muted">{selected.summary}</p></div>
              <ol className="space-y-4">
                {selected.steps.map((step, index) => <li key={step} className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[12px] font-bold text-primary-deep">{index + 1}</span><p className="pt-1 text-[13.5px] leading-6 text-ink">{step}</p></li>)}
              </ol>
              {selected.note && <div className="mt-5 rounded-(--radius-ctl) border border-gold/25 bg-gold-soft/55 px-4 py-3 text-[13px] leading-5 text-ink">{selected.note}</div>}
            </Card>
          )}
        </div>
      )}
    </PageTransition>
  );
}

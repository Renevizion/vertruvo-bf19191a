// Centralized vertical presets — single source of truth.
// Drives onboarding business types, default pipeline stages, default enabled
// modules, and tone hints. Adding a vertical here automatically propagates to
// onboarding, sidebar shape, and saved workspace defaults.
//
// Design rules (per memory):
// - Real, functional defaults only. No stub claims.
// - Generic terminology ("clients", "periods") — vertical only changes shape.
// - No mock data seeded; structural defaults only.

import type { ModuleId } from "@/hooks/useEnabledModules";

export type VerticalId =
  | "salon"
  | "fitness"
  | "sports_coaching"
  | "real_estate"
  | "restaurant"
  | "home_services"
  | "education"
  | "healthcare"
  | "professional_services"
  | "party_rentals"
  | "other";

export interface PipelineStagePreset {
  name: string;
  color: string;
}

export interface VerticalPreset {
  id: VerticalId;
  /** Human label (legacy: stored in business_settings.business_category) */
  label: string;
  /** Short hint shown in onboarding */
  hint: string;
  /** Inference keywords (lowercased substring match against name/website/desc) */
  keywords: string[];
  /** Default pipeline name and stages */
  pipeline: { name: string; stages: PipelineStagePreset[] };
  /** Modules pre-enabled on workspace creation */
  defaultModules: ModuleId[];
  /** Agent tone hint surfaced to AI agent generators */
  agentTone: string;
  /** Email/outreach tone hint */
  emailTone: string;
  /** Whether the booking/scheduling surfaces are core (true → keep Schedule group expanded) */
  scheduleHeavy: boolean;
}

const ALL_MODULES: ModuleId[] = ["crm", "outreach", "content", "intelligence"];

export const VERTICAL_PRESETS: Record<VerticalId, VerticalPreset> = {
  salon: {
    id: "salon",
    label: "Salon/Beauty",
    hint: "Salons, spas, barbers, lashes, nails, makeup",
    keywords: ["salon", "beauty", "spa", "stylist", "lashes", "nails", "barber", "makeup", "hair"],
    pipeline: {
      name: "Client Pipeline",
      stages: [
        { name: "New Inquiry", color: "#6366f1" },
        { name: "Consultation", color: "#8b5cf6" },
        { name: "Booked", color: "#ec4899" },
        { name: "Regular Client", color: "#f59e0b" },
        { name: "VIP", color: "#10b981" },
      ],
    },
    defaultModules: ["crm", "content"],
    agentTone: "Warm, friendly, image-aware. Speaks like a trusted stylist who remembers preferences.",
    emailTone: "Personal and confident. Highlight before/after results and book-now urgency.",
    scheduleHeavy: true,
  },
  fitness: {
    id: "fitness",
    label: "Fitness/Gym",
    hint: "Gyms, personal training, pilates, yoga, wellness",
    keywords: ["fitness", "gym", "trainer", "workout", "pilates", "yoga", "wellness", "membership", "crossfit"],
    pipeline: {
      name: "Member Pipeline",
      stages: [
        { name: "Free Trial", color: "#6366f1" },
        { name: "Tour Complete", color: "#8b5cf6" },
        { name: "Membership Offered", color: "#ec4899" },
        { name: "Active Member", color: "#10b981" },
      ],
    },
    defaultModules: ["crm", "outreach", "content"],
    agentTone: "Motivating, energetic, accountability-focused. Encouraging but not pushy.",
    emailTone: "Action-oriented. Reference goals, streaks, and class openings.",
    scheduleHeavy: true,
  },
  sports_coaching: {
    id: "sports_coaching",
    label: "Sports/Coaching",
    hint: "Tennis, swim, martial arts, music, tutoring camps",
    keywords: ["tennis", "coach", "swim", "martial", "lesson", "sports", "camp", "clinic", "instructor", "academy", "music"],
    pipeline: {
      name: "Student Pipeline",
      stages: [
        { name: "Trial Lesson", color: "#6366f1" },
        { name: "Regular Student", color: "#8b5cf6" },
        { name: "Advanced Program", color: "#ec4899" },
        { name: "Alumni", color: "#10b981" },
      ],
    },
    defaultModules: ["crm", "outreach", "content"],
    agentTone: "Supportive coach voice. Celebrates progress, sets next milestone clearly.",
    emailTone: "Progress-driven. Reference sessions completed and next-level invites.",
    scheduleHeavy: true,
  },
  real_estate: {
    id: "real_estate",
    label: "Real Estate",
    hint: "Agents, brokers, listings, mortgage, property management",
    keywords: ["real estate", "realtor", "broker", "listing", "property", "mortgage", "buyer", "seller", "homes"],
    pipeline: {
      name: "Deal Pipeline",
      stages: [
        { name: "New Lead", color: "#6366f1" },
        { name: "Showing Scheduled", color: "#8b5cf6" },
        { name: "Offer Made", color: "#ec4899" },
        { name: "Under Contract", color: "#f59e0b" },
        { name: "Closed", color: "#10b981" },
      ],
    },
    defaultModules: ["crm", "outreach", "intelligence"],
    agentTone: "Professional, advisory, fast-moving. Confident with numbers and timelines.",
    emailTone: "Direct and informative. Lead with listings, market data, and next-step CTAs.",
    scheduleHeavy: false,
  },
  restaurant: {
    id: "restaurant",
    label: "Restaurant/Food",
    hint: "Restaurants, cafes, bakeries, catering, reservations",
    keywords: ["restaurant", "food", "cafe", "bakery", "menu", "catering", "kitchen", "dining", "chef"],
    pipeline: {
      name: "Customer Pipeline",
      stages: [
        { name: "Inquiry", color: "#6366f1" },
        { name: "Reservation", color: "#8b5cf6" },
        { name: "Catering Quote", color: "#ec4899" },
        { name: "Confirmed", color: "#10b981" },
      ],
    },
    defaultModules: ["crm", "content"],
    agentTone: "Hospitable, sensory, inviting. Speaks about flavors, occasions, and comfort.",
    emailTone: "Visual and warm. Highlight specials, seasonal menus, and easy reservation links.",
    scheduleHeavy: true,
  },
  home_services: {
    id: "home_services",
    label: "Home & Mobile Services",
    hint: "Cleaning, mobile mechanic, dog walking, notary, handyman, lawn care",
    keywords: [
      "cleaning", "clean", "mobile", "mechanic", "dog", "walker", "pet", "notary", "handyman",
      "lawn", "landscaping", "plumb", "electric", "hvac", "pest", "mover", "moving", "appliance",
    ],
    pipeline: {
      name: "Job Pipeline",
      stages: [
        { name: "Request", color: "#6366f1" },
        { name: "Quoted", color: "#8b5cf6" },
        { name: "Scheduled", color: "#ec4899" },
        { name: "Completed", color: "#10b981" },
      ],
    },
    defaultModules: ["crm", "outreach"],
    agentTone: "Plainspoken, dependable, on-time. Confirms address, time, and price clearly.",
    emailTone: "Clear and practical. Confirm appointments, share quotes, ask for reviews.",
    scheduleHeavy: true,
  },
  education: {
    id: "education",
    label: "Education/Tutoring",
    hint: "Tutors, test prep, online courses, academies",
    keywords: ["tutor", "tutoring", "education", "school", "academy", "test prep", "sat", "act", "course"],
    pipeline: {
      name: "Student Pipeline",
      stages: [
        { name: "Inquiry", color: "#6366f1" },
        { name: "Assessment", color: "#8b5cf6" },
        { name: "Enrolled", color: "#ec4899" },
        { name: "Active", color: "#f59e0b" },
        { name: "Completed", color: "#10b981" },
      ],
    },
    defaultModules: ["crm", "outreach", "content"],
    agentTone: "Patient, encouraging, parent-aware. Translates progress into clear outcomes.",
    emailTone: "Reassuring with proof. Reference progress, milestones, and parent updates.",
    scheduleHeavy: true,
  },
  healthcare: {
    id: "healthcare",
    label: "Healthcare/Wellness",
    hint: "Therapists, chiropractors, dentists, clinics, wellness practitioners",
    keywords: ["clinic", "therapy", "therapist", "chiropract", "dentist", "wellness", "doctor", "health", "medical", "nutrition"],
    pipeline: {
      name: "Patient Pipeline",
      stages: [
        { name: "New Inquiry", color: "#6366f1" },
        { name: "Intake", color: "#8b5cf6" },
        { name: "First Visit", color: "#ec4899" },
        { name: "Active Care", color: "#f59e0b" },
        { name: "Discharged", color: "#10b981" },
      ],
    },
    defaultModules: ["crm"],
    agentTone: "Calm, careful, privacy-aware. Avoids diagnostic language; routes to staff for clinical questions.",
    emailTone: "Reassuring and concise. Appointment reminders, intake forms, and policy clarity.",
    scheduleHeavy: true,
  },
  professional_services: {
    id: "professional_services",
    label: "Professional Services",
    hint: "Agencies, consulting, legal, accounting, freelancers",
    keywords: ["agency", "consulting", "law", "legal", "accounting", "marketing", "service", "studio", "freelance"],
    pipeline: {
      name: "Sales Pipeline",
      stages: [
        { name: "New Lead", color: "#6366f1" },
        { name: "Contacted", color: "#8b5cf6" },
        { name: "Qualified", color: "#ec4899" },
        { name: "Proposal", color: "#f59e0b" },
        { name: "Won", color: "#10b981" },
      ],
    },
    defaultModules: ALL_MODULES,
    agentTone: "Polished, consultative, value-led. Asks discovery questions before pitching.",
    emailTone: "Professional and outcome-focused. Lead with the problem, then your approach.",
    scheduleHeavy: false,
  },
  party_rentals: {
    id: "party_rentals",
    label: "Party Rentals / Bouncy Houses",
    hint: "Bouncy houses, inflatables, party rentals, event equipment, soft play",
    keywords: [
      "bouncy", "bounce house", "inflatable", "moonwalk", "party rental", "party rentals",
      "soft play", "jumper", "jumpers", "water slide", "obstacle course", "event rental",
      "tent rental", "table chair", "concession", "kids party", "birthday party",
    ],
    pipeline: {
      name: "Booking Pipeline",
      stages: [
        { name: "Inquiry", color: "#6366f1" },
        { name: "Quoted", color: "#8b5cf6" },
        { name: "Deposit Paid", color: "#ec4899" },
        { name: "Confirmed", color: "#f59e0b" },
        { name: "Delivered", color: "#10b981" },
        { name: "Returned", color: "#14b8a6" },
      ],
    },
    defaultModules: ["crm", "outreach", "content"],
    agentTone: "Upbeat, family-friendly, fast-quoting. Confirms date, party size, surface, and delivery window with zero friction.",
    emailTone: "Cheerful and quick. Lead with available date, total price, deposit link, and what's included (delivery, setup, pickup).",
    scheduleHeavy: true,
  },
  other: {
    id: "other",
    label: "Other",
    hint: "Anything else — generic CRM defaults",
    keywords: [],
    pipeline: {
      name: "Sales Pipeline",
      stages: [
        { name: "New Lead", color: "#6366f1" },
        { name: "Contacted", color: "#8b5cf6" },
        { name: "Qualified", color: "#ec4899" },
        { name: "Won", color: "#10b981" },
      ],
    },
    defaultModules: ALL_MODULES,
    agentTone: "Helpful and adaptive. Mirrors the user's tone.",
    emailTone: "Clear, friendly, and concise.",
    scheduleHeavy: false,
  },
};

export const VERTICAL_LIST: VerticalPreset[] = Object.values(VERTICAL_PRESETS);

/** Resolve a stored business_category string back to a VerticalId. */
export const resolveVerticalId = (category: string | null | undefined): VerticalId => {
  if (!category) return "professional_services";
  const exact = VERTICAL_LIST.find((v) => v.label === category);
  if (exact) return exact.id;
  const lower = category.toLowerCase();
  const byKeyword = VERTICAL_LIST.find((v) => v.keywords.some((k) => lower.includes(k)));
  return byKeyword?.id ?? "professional_services";
};

/** Score keywords against free-text inputs (name + website + phone + description). */
export const inferVerticals = (text: string): VerticalId[] => {
  const lower = text.toLowerCase();
  const scored = VERTICAL_LIST.map((v) => ({
    id: v.id,
    score: v.keywords.reduce((n, k) => (lower.includes(k) ? n + 1 : n), 0),
  }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.id);
  return scored.length > 0 ? scored : ["professional_services"];
};

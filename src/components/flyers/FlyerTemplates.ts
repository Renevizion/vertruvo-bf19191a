export interface FlyerRow {
  cells: string[];
}

export interface FlyerTemplate {
  id: string;
  name: string;
  description: string;
  category: "schedule" | "promo" | "program";
  colors: { primary: string; accent: string; bg: string; text: string };
  columns: { label: string; key: string }[];
  headerFields: { key: string; label: string; placeholder: string }[];
  footerFields?: { key: string; label: string; placeholder: string }[];
  defaultRows?: number;
}

export const FLYER_TEMPLATES: FlyerTemplate[] = [
  {
    id: "schedule-table",
    name: "Program Schedule",
    description: "Class schedule with levels, days, times, dates & prices",
    category: "schedule",
    colors: { primary: "#1a5276", accent: "#2980b9", bg: "#ffffff", text: "#1a1a1a" },
    columns: [
      { label: "Level", key: "level" },
      { label: "Day", key: "day" },
      { label: "Time", key: "time" },
      { label: "Dates", key: "dates" },
      { label: "Price", key: "price" },
    ],
    headerFields: [
      { key: "title", label: "Title", placeholder: "Adult Spring Tune-Up" },
      { key: "subtitle", label: "Subtitle", placeholder: "Spring 2026 Session" },
    ],
    footerFields: [
      { key: "phone", label: "Phone", placeholder: "203-655-8769" },
      { key: "website", label: "Website", placeholder: "www.yourbusiness.com" },
    ],
    defaultRows: 5,
  },
  {
    id: "promo-pass",
    name: "Promo / Pass",
    description: "Season pass, membership, or promotional offer",
    category: "promo",
    colors: { primary: "#1a5276", accent: "#27ae60", bg: "#ffffff", text: "#1a1a1a" },
    columns: [],
    headerFields: [
      { key: "title", label: "Title", placeholder: "Summer Pass Rules & Terms" },
      { key: "headline", label: "Headline", placeholder: "Unlimited Access for just $125!" },
      { key: "subheadline", label: "Sub-headline", placeholder: "$225 After 3/31!" },
      { key: "effective_dates", label: "Effective Dates", placeholder: "May 11 - August 28, 2026" },
      { key: "rate_info", label: "Rate Info", placeholder: "Normal rate: $90 per hour" },
    ],
    footerFields: [
      { key: "hours_weekday", label: "Weekday Hours", placeholder: "Mon-Fri: 9:00 AM - 8:00 PM" },
      { key: "hours_weekend", label: "Weekend Hours", placeholder: "Sat-Sun: 9:00 AM - 6:00 PM" },
    ],
  },
  {
    id: "program-info",
    name: "Program Info",
    description: "Program overview with schedule, price, and call-to-action",
    category: "program",
    colors: { primary: "#1a5276", accent: "#f1c40f", bg: "#2471a3", text: "#ffffff" },
    columns: [
      { label: "Day", key: "day" },
      { label: "Time", key: "time" },
      { label: "Dates", key: "dates" },
    ],
    headerFields: [
      { key: "title", label: "Title", placeholder: "Join Our Program" },
      { key: "session_name", label: "Session Name", placeholder: "Spring Session" },
      { key: "session_dates", label: "Session Dates", placeholder: "May 11 - June 8, 2026" },
      { key: "duration", label: "Duration", placeholder: "5 Weeks" },
      { key: "price", label: "Price per Person", placeholder: "$185" },
    ],
    footerFields: [
      { key: "cta", label: "Call to Action", placeholder: "Call to Sign Up" },
      { key: "phone", label: "Phone", placeholder: "203-655-8769" },
      { key: "website", label: "Website", placeholder: "www.yourbusiness.com" },
    ],
    defaultRows: 3,
  },
];

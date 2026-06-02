import { NavLink } from "react-router-dom";
import { BarChart3, Phone, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/analytics", label: "Overview", icon: BarChart3 },
  { to: "/call-analytics", label: "Calls", icon: Phone },
  { to: "/voice-campaigns", label: "Voice Campaigns", icon: Radio },
];

export function AnalyticsSubNav() {
  return (
    <div className="border-b -mx-4 px-4 sm:mx-0 sm:px-0 mb-2">
      <nav className="flex gap-1 overflow-x-auto no-scrollbar">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              )
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

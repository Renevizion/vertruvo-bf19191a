import { Outlet } from "react-router-dom";
import { AnalyticsSubNav } from "@/components/analytics/AnalyticsSubNav";

export default function AnalyticsLayout() {
  return (
    <div className="space-y-4">
      <AnalyticsSubNav />
      <Outlet />
    </div>
  );
}

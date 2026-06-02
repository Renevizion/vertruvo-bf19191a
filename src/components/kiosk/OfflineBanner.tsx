import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { getOfflineQueueCount } from "@/lib/offline-queue";

export function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setOnline(navigator.onLine);
      getOfflineQueueCount().then(setQueueCount).catch(() => setQueueCount(0));
    };

    refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);

  if (online && queueCount === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
      <div className="flex items-center gap-2 font-medium">
        <WifiOff className="h-4 w-4" />
        {online ? "Offline actions pending sync" : "Kiosk is offline"}
      </div>
      <p className="mt-1 text-xs opacity-80">
        {queueCount > 0 ? `${queueCount} queued item${queueCount === 1 ? "" : "s"} will sync when the connection returns.` : "Scans and check-ins will be queued locally until the connection returns."}
      </p>
    </div>
  );
}

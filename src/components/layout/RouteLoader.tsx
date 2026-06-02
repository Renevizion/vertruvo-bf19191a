import { useEffect, useState } from "react";

/**
 * Non-disruptive route loader.
 * - Renders nothing for the first 180ms (most cached chunks resolve instantly).
 * - Then shows a thin top progress bar instead of blanking the page.
 * Prevents the "page reload" feel on every navigation.
 */
export const RouteLoader = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 180);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-0.5 overflow-hidden pointer-events-none">
      <div className="h-full bg-primary/70 animate-[route-progress_1.2s_ease-in-out_infinite]" />
      <style>{`
        @keyframes route-progress {
          0% { transform: translateX(-100%); width: 30%; }
          50% { transform: translateX(50%); width: 50%; }
          100% { transform: translateX(200%); width: 30%; }
        }
      `}</style>
    </div>
  );
};

export default RouteLoader;

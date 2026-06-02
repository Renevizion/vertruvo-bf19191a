import { useEffect, useState } from "react";
import { Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhisperPanel } from "./WhisperPanel";
import { supabase } from "@/integrations/supabase/client";

export function WhisperLauncher() {
  const [open, setOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      setWorkspaceId(data?.workspace_id ?? null);
    })();
  }, []);

  if (!workspaceId) return null;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        variant="outline"
        className="fixed bottom-6 right-24 z-40 h-12 w-12 rounded-full shadow-lg bg-background"
        title="Whisper / Listening mode"
      >
        <Headphones className="h-5 w-5" />
      </Button>
      <WhisperPanel open={open} onOpenChange={setOpen} workspaceId={workspaceId} />
    </>
  );
}

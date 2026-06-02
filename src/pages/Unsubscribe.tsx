import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, MailX } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: anonKey },
    })
      .then(r => r.json())
      .then(data => {
        if (data.valid === true) setStatus("valid");
        else if (data.reason === "already_unsubscribed") setStatus("already");
        else setStatus("invalid");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) setStatus("success");
      else if (data?.reason === "already_unsubscribed") setStatus("already");
      else setStatus("error");
    } catch {
      setStatus("error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Verifying…</p>
            </>
          )}
          {status === "valid" && (
            <>
              <MailX className="h-10 w-10 text-destructive mx-auto" />
              <h1 className="text-xl font-semibold text-foreground">Unsubscribe</h1>
              <p className="text-muted-foreground text-sm">
                Click the button below to stop receiving app emails from Thermi.
              </p>
              <Button onClick={handleUnsubscribe} disabled={processing} variant="destructive" className="w-full">
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Unsubscribe
              </Button>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
              <h1 className="text-xl font-semibold text-foreground">Unsubscribed</h1>
              <p className="text-muted-foreground text-sm">You won't receive any more app emails.</p>
            </>
          )}
          {status === "already" && (
            <>
              <CheckCircle2 className="h-10 w-10 text-muted-foreground mx-auto" />
              <h1 className="text-xl font-semibold text-foreground">Already Unsubscribed</h1>
              <p className="text-muted-foreground text-sm">You've already unsubscribed from these emails.</p>
            </>
          )}
          {status === "invalid" && (
            <>
              <XCircle className="h-10 w-10 text-destructive mx-auto" />
              <h1 className="text-xl font-semibold text-foreground">Invalid Link</h1>
              <p className="text-muted-foreground text-sm">This unsubscribe link is invalid or has expired.</p>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="h-10 w-10 text-destructive mx-auto" />
              <h1 className="text-xl font-semibold text-foreground">Something Went Wrong</h1>
              <p className="text-muted-foreground text-sm">Please try again later or contact support.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;

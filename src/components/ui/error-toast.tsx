import { useState } from "react";
import { AlertCircle, X, Loader2 } from "lucide-react";
import { Button } from "./button";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";

interface ErrorToastProps {
  error: Error;
  errorContext?: Record<string, any>;
  onDismiss: () => void;
}

export function ErrorToast({ error, errorContext, onDismiss }: ErrorToastProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReport = async () => {
    setIsSubmitting(true);

    try {
      // Get current workspace
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .single();

      const { data, error: reportError } = await supabase.functions.invoke('report-error', {
        body: {
          errorMessage: error.message,
          errorStack: error.stack,
          userMessage: null,
          errorContext,
          workspaceId: workspaces?.id,
        }
      });

      if (reportError) throw reportError;

      sonnerToast.success("Error reported to admin", {
        description: "Thank you for reporting this issue. We'll investigate it."
      });

      onDismiss();
    } catch (err) {
      console.error('Failed to report error:', err);
      sonnerToast.error("Failed to submit report", {
        description: "Please try again or contact support."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSupabaseError = error.message.includes('nx') || 
                          error.message.includes('constraint') ||
                          error.message.includes('supabase');

  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 shadow-lg max-w-md w-full">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
        
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-destructive">
              {isSupabaseError ? 'Database Error' : 'Error'}
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 shrink-0 border-destructive/30 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/20"
                onClick={handleReport}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Report"}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/20"
                onClick={onDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <p className="text-sm text-foreground/80">
            {error.message}
          </p>

        </div>
      </div>
    </div>
  );
}

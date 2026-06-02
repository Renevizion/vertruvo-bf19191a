import { toast } from "sonner";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface ErrorToastOptions {
  title: string;
  description: string;
  error?: Error;
  errorContext?: Record<string, any>;
}

export const useErrorToast = () => {
  const showError = ({ title, description, error, errorContext }: ErrorToastOptions) => {
    toast.custom(
      (t) => <ErrorToastContent 
        id={t} 
        title={title} 
        description={description}
        error={error}
        errorContext={errorContext}
      />,
      {
        duration: 10000,
        position: "bottom-right",
      }
    );
  };

  return { showError };
};

function ErrorToastContent({ 
  id, 
  title, 
  description,
  error,
  errorContext 
}: { 
  id: string | number; 
  title: string; 
  description: string;
  error?: Error;
  errorContext?: Record<string, any>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReport = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      await supabase.functions.invoke('report-error', {
        body: {
          errorMessage: error?.message || description,
          errorStack: error?.stack || null,
          userMessage: null,
          errorContext: errorContext || {},
          workspaceId: workspace?.id,
        }
      });

      toast.success("Error reported to admin", {
        description: "Thank you for reporting. We'll investigate it.",
      });
      
      toast.dismiss(id);
    } catch (err) {
      console.error('Failed to report error:', err);
      toast.error("Failed to submit report", {
        description: "Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-destructive/10 border-2 border-destructive/30 rounded-lg p-4 shadow-lg max-w-md w-full backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
        
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-destructive">{title}</p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 shrink-0 border-destructive/30 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/20"
                onClick={handleReport}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending" : "Report"}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/20"
                onClick={() => toast.dismiss(id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <p className="text-sm text-foreground/90">{description}</p>

        </div>
      </div>
    </div>
  );
}

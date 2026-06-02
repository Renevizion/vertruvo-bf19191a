import { Progress } from "@/components/ui/progress";

interface ModelLoadingProgressProps {
  progress: number;
  status: string;
}

export const ModelLoadingProgress = ({ progress, status }: ModelLoadingProgressProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-foreground">Loading AI Model</h2>
          <p className="text-sm text-muted-foreground">{status}</p>
        </div>
        
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">{Math.round(progress)}%</p>
        </div>
        
        <div className="text-xs text-center text-muted-foreground space-y-1">
          <p>First load may take a few minutes</p>
          <p>The model will be cached for future use</p>
        </div>
      </div>
    </div>
  );
};

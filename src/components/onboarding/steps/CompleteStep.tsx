import { CheckCircle2 } from "lucide-react";

interface CompleteStepProps {
  importMethod: 'sheets' | 'csv' | 'skip' | null;
}

export const CompleteStep = ({ importMethod }: CompleteStepProps) => {
  return (
    <div className="space-y-4 text-center py-8">
      <div className="flex justify-center mb-4">
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
      </div>
      <h3 className="text-2xl font-bold">You're in!</h3>
      <p className="text-muted-foreground max-w-md mx-auto">
        The basics are set. Once inside, your dashboard will guide you through configuring the rest — integrations, AI agents, and more.
      </p>
      <div className="pt-4">
        <ul className="text-sm space-y-2 text-left max-w-md mx-auto">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Business profile saved
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Pipeline configured
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            {importMethod === 'skip' ? 'Forms ready to create' : 'Lead import set up'}
          </li>
        </ul>
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        💡 Tip: Check Settings to finish connecting integrations, phone numbers, and email
      </p>
    </div>
  );
};

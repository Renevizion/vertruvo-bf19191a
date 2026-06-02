import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Upload, CheckCircle2, Loader2 } from "lucide-react";

interface ImportStepProps {
  importMethod: 'sheets' | 'csv' | 'skip' | null;
  setImportMethod: (v: 'sheets' | 'csv' | 'skip' | null) => void;
  sheetsConnected: boolean;
  selectedSheetId: string;
  selectedSheetName: string;
  selectedTab: string;
  syncing: boolean;
  onConnectSheets: () => void;
  onOpenSheetModal: () => void;
  onOpenCSVDialog: () => void;
  onSkipToast: () => void;
}

export const ImportStep = ({
  importMethod, setImportMethod,
  sheetsConnected,
  selectedSheetId, selectedSheetName, selectedTab,
  syncing,
  onConnectSheets, onOpenSheetModal, onOpenCSVDialog, onSkipToast,
}: ImportStepProps) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Import Your Leads (Optional)</h3>
        <p className="text-sm text-muted-foreground">
          Choose how you'd like to get started with your leads
        </p>
      </div>

      {!importMethod ? (
        <div className="space-y-3">
          <button
            onClick={() => {
              setImportMethod('sheets');
              if (!sheetsConnected) onConnectSheets();
            }}
            className="w-full border rounded-lg p-6 hover:border-primary hover:bg-primary/5 transition-colors text-left"
          >
            <div className="flex items-start gap-4">
              <FileSpreadsheet className="h-6 w-6 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium mb-1">Import from Google Sheets</h4>
                <p className="text-sm text-muted-foreground">
                  One-time import of your existing leads from a spreadsheet
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              setImportMethod('csv');
              onOpenCSVDialog();
            }}
            className="w-full border rounded-lg p-6 hover:border-primary hover:bg-primary/5 transition-colors text-left"
          >
            <div className="flex items-start gap-4">
              <FileText className="h-6 w-6 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium mb-1">CSV / Excel Import</h4>
                <p className="text-sm text-muted-foreground">
                  Import from HubSpot, Salesforce, Pipedrive, or any CRM export
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              setImportMethod('skip');
              onSkipToast();
            }}
            className="w-full border rounded-lg p-6 hover:border-primary hover:bg-primary/5 transition-colors text-left"
          >
            <div className="flex items-start gap-4">
              <Upload className="h-6 w-6 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium mb-1">Start Fresh with Forms</h4>
                <p className="text-sm text-muted-foreground">
                  Build lead capture forms to embed on your business website
                </p>
              </div>
            </div>
          </button>
        </div>
      ) : importMethod === 'sheets' && sheetsConnected ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-4">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Connected to Google Sheets</span>
          </div>

          <div className="border rounded-lg p-6 bg-muted/30 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-primary" />
            <h4 className="font-medium mb-2">Ready to import your leads</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Select a spreadsheet and tab to import your data
            </p>
            <Button onClick={onOpenSheetModal} variant="outline">
              Choose Spreadsheet
            </Button>
          </div>

          {selectedSheetId && selectedTab && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    Ready to import!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Selected: <strong>{selectedSheetName}</strong> ({selectedTab})
                  </p>
                </div>
              </div>
            </div>
          )}

          {syncing && (
            <div className="flex items-center gap-3 text-sm bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-blue-900 dark:text-blue-100 font-medium">Importing your leads from Google Sheets...</span>
            </div>
          )}
        </div>
      ) : importMethod === 'csv' ? (
        <div className="border rounded-lg p-6 bg-muted/30 text-center">
          <FileText className="h-12 w-12 mx-auto mb-3 text-primary" />
          <h4 className="font-medium mb-2">CSV/Excel Import</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Click below to upload your CRM export file
          </p>
          <Button onClick={onOpenCSVDialog} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        </div>
      ) : importMethod === 'skip' ? (
        <div className="border rounded-lg p-6 bg-muted/30 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
          <h4 className="font-medium mb-2">Great choice!</h4>
          <p className="text-sm text-muted-foreground">
            After setup, we'll guide you to create your first form — it generates an embed code you place on your business website to capture leads automatically.
          </p>
        </div>
      ) : null}

      {importMethod && (
        <Button 
          variant="outline" 
          onClick={() => setImportMethod(null)}
          className="w-full"
        >
          Choose Different Method
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Skip this step and add leads manually, or set this up later in Settings
      </p>
    </div>
  );
};

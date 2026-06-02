import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import Papa from "papaparse";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

// Smart field mappings - auto-detect common CRM column names
const FIELD_MAPPINGS = {
  name: ['name', 'full name', 'contact name', 'lead name', 'fullname'],
  first_name: ['first name', 'firstname', 'fname', 'first'],
  last_name: ['last name', 'lastname', 'lname', 'last'],
  email: ['email', 'email address', 'e-mail', 'mail'],
  phone: ['phone', 'phone number', 'mobile', 'cell', 'telephone'],
  company: ['company', 'company name', 'organization', 'account', 'business'],
  value: ['value', 'deal value', 'amount', 'revenue', 'deal amount'],
  source: ['source', 'lead source', 'origin', 'referral source'],
  notes: ['notes', 'description', 'comments', 'note'],
};

export function CSVImportDialog({ open, onOpenChange, onImportComplete }: CSVImportDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV or Excel file",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);

    // Parse CSV/Excel
    if (fileExtension === 'csv') {
      Papa.parse(selectedFile, {
        header: true,
        preview: 5,
        complete: (results) => {
          const csvHeaders = results.meta.fields || [];
          setHeaders(csvHeaders);
          setPreviewData(results.data);
          
          // Auto-detect column mappings
          const autoMappings = autoDetectMappings(csvHeaders);
          setColumnMappings(autoMappings);
          
          setStep('map');
          
          const mappedCount = Object.keys(autoMappings).length;
          if (mappedCount > 0) {
            toast({
              title: "✨ Columns auto-mapped!",
              description: `Detected ${mappedCount} matching columns`,
            });
          }
        },
        error: (error) => {
          toast({
            title: "Error parsing file",
            description: error.message,
            variant: "destructive",
          });
        },
      });
    } else {
      // For Excel files, we'd need a library like xlsx
      toast({
        title: "Excel support coming soon",
        description: "Please use CSV format for now",
        variant: "destructive",
      });
    }
  };

  const autoDetectMappings = (csvHeaders: string[]): Record<string, string> => {
    const mappings: Record<string, string> = {};
    
    Object.entries(FIELD_MAPPINGS).forEach(([targetField, possibleNames]) => {
      const matchingHeader = csvHeaders.find(header => 
        possibleNames.some(name => 
          header.toLowerCase().trim() === name.toLowerCase()
        )
      );
      
      if (matchingHeader) {
        mappings[targetField] = matchingHeader;
      }
    });

    return mappings;
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!workspace) throw new Error("No workspace found");

      // Get default pipeline and stage
      const { data: pipeline } = await supabase
        .from('pipelines')
        .select('id, pipeline_stages(id)')
        .eq('workspace_id', workspace.id)
        .eq('is_default', true)
        .single();

      if (!pipeline) throw new Error("No default pipeline found");

      const firstStageId = pipeline.pipeline_stages?.[0]?.id;

      // Parse full file for import
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          const leads = results.data
            .filter((row: any) => {
              // Filter out empty rows
              return Object.values(row).some(val => val !== null && val !== '');
            })
            .map((row: any) => {
              // Build name from first_name + last_name if name not provided
              let name = row[columnMappings.name || ''] || '';
              if (!name && (columnMappings.first_name || columnMappings.last_name)) {
                const firstName = row[columnMappings.first_name || ''] || '';
                const lastName = row[columnMappings.last_name || ''] || '';
                name = `${firstName} ${lastName}`.trim();
              }

              return {
                name: name || 'Unknown',
                email: row[columnMappings.email || ''] || null,
                phone: row[columnMappings.phone || ''] || null,
                company: row[columnMappings.company || ''] || null,
                value: parseFloat(row[columnMappings.value || '']) || null,
                source: row[columnMappings.source || ''] || 'CSV Import',
                notes: row[columnMappings.notes || ''] || null,
                workspace_id: workspace.id,
                pipeline_id: pipeline.id,
                stage_id: firstStageId,
              };
            });

          // Bulk insert
          const { data, error } = await supabase
            .from('leads')
            .insert(leads)
            .select();

          if (error) throw error;

          toast({
            title: "✓ Import successful!",
            description: `Imported ${data.length} leads from CSV`,
          });

          onImportComplete();
          onOpenChange(false);
          resetDialog();
        },
        error: (error) => {
          throw new Error(error.message);
        },
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Failed to import leads",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const resetDialog = () => {
    setFile(null);
    setHeaders([]);
    setPreviewData([]);
    setColumnMappings({});
    setStep('upload');
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetDialog();
    }}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import from CSV/Excel</DialogTitle>
          <DialogDescription>
            Upload your CRM export file and map columns to import leads
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <Label htmlFor="csv-upload" className="cursor-pointer">
                <div className="text-lg font-semibold mb-2">Choose file to upload</div>
                <div className="text-sm text-muted-foreground mb-4">
                  CSV or Excel (.xlsx, .xls)
                </div>
                <Button type="button" variant="outline">
                  Select File
                </Button>
              </Label>
              <input
                id="csv-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-semibold">Supported CRM exports:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>HubSpot (CSV)</li>
                <li>Salesforce (CSV)</li>
                <li>Pipedrive (CSV)</li>
                <li>Zoho CRM (CSV)</li>
                <li>Monday.com (CSV)</li>
              </ul>
            </div>
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              File loaded: {file?.name}
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold">Map your columns:</div>
              
              {Object.keys(FIELD_MAPPINGS).map((field) => (
                <div key={field} className="grid grid-cols-3 gap-4 items-center">
                  <Label className="capitalize">{field.replace('_', ' ')}</Label>
                  <Select
                    value={columnMappings[field] || ''}
                    onValueChange={(value) => 
                      setColumnMappings(prev => ({ ...prev, [field]: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Skip this field</SelectItem>
                      {headers.map(header => (
                        <SelectItem key={header} value={header}>{header}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {columnMappings[field] && columnMappings[field] !== "skip" && (
                    <div className="text-xs text-muted-foreground">
                      ✓ Mapped to "{columnMappings[field]}"
                    </div>
                  )}
                </div>
              ))}
            </div>

            {previewData.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-semibold">Preview (first 5 rows):</div>
                <div className="border rounded overflow-auto max-h-48">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        {Object.keys(columnMappings).map(field => (
                          <th key={field} className="p-2 text-left capitalize">
                            {field.replace('_', ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, i) => (
                        <tr key={i} className="border-t">
                          {Object.keys(columnMappings).map(field => (
                            <td key={field} className="p-2">
                              {row[columnMappings[field]] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importing..." : "Import Leads"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

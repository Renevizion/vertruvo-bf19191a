import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Check, Loader2, Pencil } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Sheet {
  id: string;
  name: string;
  modifiedTime?: string;
}

interface Tab {
  id: string | number;
  title: string;
}

interface SheetSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheets: Sheet[];
  tabs: Tab[];
  selectedSheetId: string;
  selectedTab: string;
  onSheetSelect: (sheetId: string, sheetName: string) => void;
  onTabSelect: (tabName: string) => void;
  onConfirm: (mappings: Record<string, string>) => void;
  loading: boolean;
  syncing: boolean;
  sheetHeaders?: string[];
  autoMappings?: Record<string, string>;
}

export const SheetSelectionModal = ({
  open,
  onOpenChange,
  sheets,
  tabs,
  selectedSheetId,
  selectedTab,
  onSheetSelect,
  onTabSelect,
  onConfirm,
  loading,
  syncing,
  sheetHeaders = [],
  autoMappings = {},
}: SheetSelectionModalProps) => {
  const crmFields = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'company', label: 'Company' },
    { key: 'source', label: 'Source' },
    { key: 'notes', label: 'Notes' },
    { key: 'value', label: 'Value' },
    { key: 'status', label: 'Status' },
  ];

  // Initialize mappings with auto-detected values and update when autoMappings change
  const [columnMappings, setColumnMappings] = React.useState<Record<string, string>>(autoMappings);
  
  // Update mappings when autoMappings prop changes
  React.useEffect(() => {
    setColumnMappings(autoMappings);
  }, [autoMappings]);

  // Generate column options (A, B, C, etc.)
  const columnOptions = sheetHeaders.map((header, index) => ({
    value: String.fromCharCode(65 + index), // A, B, C, etc.
    label: `${String.fromCharCode(65 + index)}: ${header}`,
  }));

  const handleMappingChange = (field: string, column: string) => {
    setColumnMappings(prev => ({ ...prev, [field]: column }));
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            Select Your Google Sheet
          </DialogTitle>
          <DialogDescription className="text-xs">
            Choose a spreadsheet and tab to sync with your CRM
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-3 pb-2">
          {/* Spreadsheets */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium">Your Spreadsheets</h4>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <ScrollArea className="h-[120px] rounded-md border p-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  {sheets.map((sheet) => (
                    <button
                      key={sheet.id}
                      onClick={() => onSheetSelect(sheet.id, sheet.name)}
                      className={`
                        group relative p-2.5 rounded-md border-2 transition-all text-left
                        ${selectedSheetId === sheet.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50 bg-card'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <FileSpreadsheet className={`h-3 w-3 flex-shrink-0 ${
                              selectedSheetId === sheet.id ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                            <p className="text-xs font-medium truncate">{sheet.name}</p>
                          </div>
                          {sheet.modifiedTime && (
                            <p className="text-[10px] text-muted-foreground">
                              Modified {new Date(sheet.modifiedTime).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {selectedSheetId === sheet.id && (
                          <div className="flex-shrink-0 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Tabs */}
          {tabs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium">Select Tab</h4>
              <div className="flex flex-wrap gap-1.5">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => onTabSelect(tab.title)}
                    className={`
                      px-3 py-1.5 rounded-md border-2 text-xs font-medium transition-all
                      ${selectedTab === tab.title
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-primary/50 bg-card'
                      }
                    `}
                  >
                    {tab.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Column Mapping */}
          {selectedSheetId && selectedTab && sheetHeaders.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium flex items-center gap-1.5">
                  <Pencil className="h-3 w-3" />
                  Map Your Columns
                </h4>
                {Object.keys(autoMappings).length > 0 && (
                  <span className="text-[10px] text-success flex items-center gap-1">
                    <Check className="h-2.5 w-2.5" />
                    Auto-detected
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {crmFields.map(field => (
                  <div key={field.key} className="space-y-1">
                    <Label htmlFor={`map-${field.key}`} className="text-[10px] font-medium">
                      {field.label}
                    </Label>
                    <Select
                      value={columnMappings[field.key] || 'none'}
                      onValueChange={(value) => handleMappingChange(field.key, value === 'none' ? '' : value)}
                    >
                      <SelectTrigger id={`map-${field.key}`} className="h-7 text-xs">
                        <SelectValue placeholder="Skip" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs">Skip</SelectItem>
                        {columnOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback: Expected columns if no headers detected */}
          {selectedSheetId && selectedTab && sheetHeaders.length === 0 && (
            <div className="bg-muted/50 rounded-md p-2.5 text-xs">
              <p className="font-medium mb-1.5 text-[10px]">Expected column format:</p>
              <div className="grid grid-cols-4 gap-1.5 text-[10px] text-muted-foreground">
                <div>A: Name</div>
                <div>B: Email</div>
                <div>C: Phone</div>
                <div>D: Company</div>
                <div>E: Source</div>
                <div>F: Notes</div>
                <div>G: Value</div>
                <div>H: Status</div>
              </div>
            </div>
          )}

          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t mt-auto">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={syncing}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(columnMappings)}
            disabled={!selectedSheetId || !selectedTab || syncing}
            className="bg-success hover:bg-success/90 h-8 text-xs"
          >
            {syncing ? (
              <>
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                Importing...
              </>
            ) : (
              "Import & Continue"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

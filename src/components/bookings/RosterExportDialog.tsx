import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, Loader2, FileSpreadsheet } from "lucide-react";

interface RosterExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RosterExportDialog({ open, onOpenChange }: RosterExportDialogProps) {
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [exporting, setExporting] = useState(false);

  const { data: workspace } = useQuery({
    queryKey: ["workspace"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("workspaces").select("id").eq("owner_id", user.id).single();
      return data;
    },
  });

  // Fetch bookable items (programs/classes/services)
  const { data: items = [] } = useQuery({
    queryKey: ["roster-items", workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const { data } = await supabase
        .from("items")
        .select("id, title, item_type")
        .eq("workspace_id", workspace.id)
        .eq("is_active", true)
        .order("title");
      return data || [];
    },
    enabled: !!workspace?.id,
  });

  const handleExport = async () => {
    if (!selectedItem || !workspace?.id) return;
    setExporting(true);

    try {
      // Get the item details
      const item = items.find(i => i.id === selectedItem);
      if (!item) throw new Error("Item not found");

      // Get all bookings for this item with lead/contact info
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select(`
          id, title, start_time, end_time, notes, attendees,
          lead_id,
          leads!bookings_lead_id_fkey ( name, email, phone, company, value, source )
        `)
        .eq("workspace_id", workspace.id)
        .eq("item_id", selectedItem)
        .neq("status", "cancelled")
        .order("start_time", { ascending: true });

      if (error) throw error;

      // Also get contacts linked through leads if needed
      const rows: string[][] = [
        ["Name", "Email", "Phone", "Day & Time", "Level", "Age", "Date of Birth", "Company", "Notes"]
      ];

      for (const booking of bookings || []) {
        const lead = (booking as any).leads;
        const startDate = new Date(booking.start_time);
        const dayTime = startDate.toLocaleDateString('en-US', { weekday: 'long' }) + 
          ' ' + startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

        // Try to extract level, age, DOB from attendees JSON or notes
        const attendees = (booking.attendees as any[]) || [];
        
        if (attendees.length > 0) {
          // Export each attendee as a row
          for (const att of attendees) {
            rows.push([
              att.name || lead?.name || "",
              att.email || lead?.email || "",
              att.phone || lead?.phone || "",
              dayTime,
              att.level || att.skill_level || "",
              att.age ? String(att.age) : "",
              att.date_of_birth || att.dob || "",
              att.company || lead?.company || "",
              att.notes || "",
            ]);
          }
        } else {
          // Single booking row
          rows.push([
            lead?.name || booking.title || "",
            lead?.email || "",
            lead?.phone || "",
            dayTime,
            "", // level
            "", // age
            "", // dob
            lead?.company || "",
            booking.notes || "",
          ]);
        }
      }

      // Generate CSV
      const csvContent = rows
        .map(row => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${item.title.replace(/\s+/g, "-").toLowerCase()}-roster.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`Roster exported: ${rows.length - 1} entries`);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Export Program Roster
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Select Program / Class</Label>
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a program..." />
              </SelectTrigger>
              <SelectContent>
                {items.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title} <span className="text-muted-foreground ml-1 text-xs">({item.item_type})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground text-xs uppercase tracking-wide">Exported Fields</p>
            <p>Name • Email • Phone • Day & Time • Level • Age • Date of Birth • Company • Notes</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleExport} disabled={!selectedItem || exporting} className="gap-2">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

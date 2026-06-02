import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Clock, Calendar, User, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { SandboxQuotaBanner } from "@/components/voice/SandboxQuotaBanner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { pdf, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { WaveformPlayer } from "@/components/voice/WaveformPlayer";

const pdfStyles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 16 },
  generated: { fontSize: 8, color: "#6b7280", marginBottom: 20 },
  row: { flexDirection: "row", borderBottom: "1 solid #e5e7eb", paddingVertical: 8, gap: 8 },
  header: { flexDirection: "row", borderBottom: "2 solid #d1d5db", paddingVertical: 6, gap: 8, marginBottom: 2 },
  headerCell: { fontWeight: "bold", color: "#374151" },
  cell: { color: "#4b5563" },
  col1: { width: "22%" },
  col2: { width: "18%" },
  col3: { width: "14%" },
  col4: { width: "14%" },
  col5: { width: "14%" },
  col6: { flex: 1 },
});

type CallRow = {
  phone_number: string;
  status: string;
  duration: number | null;
  created_at: string;
  leads?: { name: string } | null;
  contacts?: { name: string } | null;
  call_templates?: { name: string } | null;
};

const CallHistoryPDF = ({ calls, generatedAt }: { calls: CallRow[]; generatedAt: string }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page} orientation="landscape">
      <Text style={pdfStyles.title}>Call History Report</Text>
      <Text style={pdfStyles.generated}>Generated {generatedAt} · {calls.length} record{calls.length !== 1 ? "s" : ""}</Text>
      <View style={pdfStyles.header}>
        <Text style={[pdfStyles.headerCell, pdfStyles.col1]}>Phone</Text>
        <Text style={[pdfStyles.headerCell, pdfStyles.col2]}>Contact / Lead</Text>
        <Text style={[pdfStyles.headerCell, pdfStyles.col3]}>Status</Text>
        <Text style={[pdfStyles.headerCell, pdfStyles.col4]}>Duration</Text>
        <Text style={[pdfStyles.headerCell, pdfStyles.col5]}>Template</Text>
        <Text style={[pdfStyles.headerCell, pdfStyles.col6]}>Date</Text>
      </View>
      {calls.map((call, i) => (
        <View key={i} style={pdfStyles.row}>
          <Text style={[pdfStyles.cell, pdfStyles.col1]}>{call.phone_number}</Text>
          <Text style={[pdfStyles.cell, pdfStyles.col2]}>
            {call.leads?.name || call.contacts?.name || "—"}
          </Text>
          <Text style={[pdfStyles.cell, pdfStyles.col3]}>{call.status}</Text>
          <Text style={[pdfStyles.cell, pdfStyles.col4]}>
            {call.duration
              ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`
              : "N/A"}
          </Text>
          <Text style={[pdfStyles.cell, pdfStyles.col5]}>
            {call.call_templates?.name || "—"}
          </Text>
          <Text style={[pdfStyles.cell, pdfStyles.col6]}>
            {format(new Date(call.created_at), "MMM dd, yyyy hh:mm a")}
          </Text>
        </View>
      ))}
    </Page>
  </Document>
);

const CallHistory = () => {
  const { data: calls, isLoading } = useQuery({
    queryKey: ['call-logs'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: workspaceData } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (!workspaceData) throw new Error('Workspace not found');

      const { data, error } = await supabase
        .from('call_logs')
        .select(`
          *,
          leads(name, phone),
          contacts(name, phone),
          call_templates(name)
        `)
        .eq('workspace_id', workspaceData.workspace_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const handleExportPDF = async () => {
    if (!calls?.length) return;
    const generatedAt = format(new Date(), "PPpp");
    const blob = await pdf(
      <CallHistoryPDF calls={calls as CallRow[]} generatedAt={generatedAt} />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `call-history-${format(new Date(), "yyyy-MM-dd")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      case 'busy':
        return 'bg-yellow-500';
      case 'no-answer':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Voice" title="Call History" description="View all your call activity and details." />
        <div className="text-muted-foreground">Loading calls...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Voice"
        title="Call History"
        description="View all your call activity and details."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={!calls?.length}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        }
      />

      <SandboxQuotaBanner />

      {!calls || calls.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="No calls yet"
          description="Make your first call and the full history — duration, transcript, and outcome — will appear here."
        />
      ) : (
        <div className="grid gap-4">
          {calls.map((call) => (
            <Card key={call.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      {call.phone_number}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      {call.leads?.name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Lead: {call.leads.name}
                        </span>
                      )}
                      {call.contacts?.name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Contact: {call.contacts.name}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(call.status)}>
                    {call.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Started</div>
                      <div className="text-muted-foreground">
                        {format(new Date(call.created_at), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-muted-foreground">
                        {format(new Date(call.created_at), 'hh:mm a')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Duration</div>
                      <div className="text-muted-foreground">
                        {formatDuration(call.duration)}
                      </div>
                    </div>
                  </div>

                  {call.call_templates && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Template</div>
                        <div className="text-muted-foreground">
                          {call.call_templates.name}
                        </div>
                      </div>
                    </div>
                  )}

                  {call.call_sid && (
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium">Call SID</div>
                        <div className="text-muted-foreground text-xs font-mono">
                          {call.call_sid.substring(0, 20)}...
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {call.recording_url && (
                  <div className="mt-4 border-t pt-4">
                    <WaveformPlayer src={call.recording_url} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CallHistory;

import { useState, useEffect } from "react";
import { atom, useAtom } from "jotai";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, Send, CheckCircle2, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isTomorrow } from "date-fns";
import { MarkdownViewer } from "@/components/ui/markdown-viewer";

interface Message {
  role: "user" | "assistant";
  content: string;
  insights?: Array<{ lead: string; action: string; priority: string }>;
}

const messagesAtom = atom<Message[]>([]);
const loadingAtom = atom(false);

const AIChat = () => {
  const [messages, setMessages] = useAtom(messagesAtom);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useAtom(loadingAtom);
  const [initializing, setInitializing] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadInitialInsights();
  }, []);

  const loadInitialInsights = async () => {
    try {
      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, value, stage_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('id, name');

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, due_date, status, lead_id')
        .eq('status', 'pending')
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .limit(5);

      const { data: taskLeads } = await supabase
        .from('leads')
        .select('id, name, value')
        .in('id', tasks?.map(t => t.lead_id).filter(Boolean) || []);

      const leadsMap = new Map(taskLeads?.map(l => [l.id, l]));
      const stagesMap = new Map(stages?.map(s => [s.id, s]));

      const highPriorityItems = [];
      
      if (tasks && tasks.length > 0) {
        for (const task of tasks.slice(0, 3)) {
          const dueDate = new Date(task.due_date!);
          const dateStr = isToday(dueDate) ? 'today' : isTomorrow(dueDate) ? 'tomorrow' : format(dueDate, 'MMM d');
          const lead = task.lead_id ? leadsMap.get(task.lead_id) : null;
          highPriorityItems.push({
            lead: lead?.name || task.title,
            action: `${task.title} (due ${dateStr})`,
            priority: isToday(dueDate) || isTomorrow(dueDate) ? 'urgent' : 'high'
          });
        }
      }

      if (leads && leads.length > 0) {
        const recentLeads = leads.slice(0, 2);
        for (const lead of recentLeads) {
          const stage = lead.stage_id ? stagesMap.get(lead.stage_id) : null;
          highPriorityItems.push({
            lead: lead.name,
            action: `Follow up - ${stage?.name || 'New opportunity'}`,
            priority: 'high'
          });
        }
      }

      const initialMessage: Message = {
        role: "assistant",
        content: highPriorityItems.length > 0 
          ? `I've analyzed your pipeline and identified ${highPriorityItems.length} high-priority items that need attention:` 
          : "I'm ready to help! I can analyze your pipeline, track conversions, prioritize tasks, and provide insights. What would you like to know?",
        insights: highPriorityItems.length > 0 ? highPriorityItems : undefined
      };

      setMessages([initialMessage]);
    } catch (error) {
      console.error('Error loading insights:', error);
      setMessages([{
        role: "assistant",
        content: "I'm ready to help! I can analyze your pipeline, track conversions, prioritize tasks, and provide insights. What would you like to know?"
      }]);
    } finally {
      setInitializing(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await getAIResponse(input);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getAIResponse = async (question: string): Promise<Message> => {
    const lower = question.toLowerCase();
    
    // Conversion rate analysis
    if (lower.includes("conversion") || lower.includes("rate")) {
      const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('id, name, position')
        .order('position');

      const { data: leads } = await supabase
        .from('leads')
        .select('stage_id, created_at');

      if (!stages || !leads || leads.length === 0) {
        return {
          role: "assistant",
          content: "I don't have enough data yet to calculate conversion rates. Start by adding some leads to your pipeline!"
        };
      }

      const wonStages = stages.filter(s => s.name.toLowerCase().includes('won') || s.name.toLowerCase().includes('closed'));
      const wonLeads = leads.filter(l => wonStages.some(s => s.id === l.stage_id));
      const conversionRate = ((wonLeads.length / leads.length) * 100).toFixed(1);

      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const recentLeads = leads.filter(l => new Date(l.created_at) > threeMonthsAgo);
      const recentWon = wonLeads.filter(l => new Date(l.created_at) > threeMonthsAgo);
      const recentRate = recentLeads.length > 0 ? ((recentWon.length / recentLeads.length) * 100).toFixed(1) : '0.0';

      return {
        role: "assistant",
        content: `Your current conversion rate is ${conversionRate}% (${wonLeads.length} won out of ${leads.length} total leads).\n\nLast 90 days: ${recentRate}% (${recentWon.length} won out of ${recentLeads.length} leads)\n\n${Number(recentRate) > Number(conversionRate) ? '📈 Your conversion rate is improving!' : '📊 Keep nurturing those leads!'}`
      };
    }
    
    // Pipeline analysis
    if (lower.includes("pipeline") || lower.includes("leads") || lower.includes("opportunities")) {
      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, value, stage_id');

      const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('id, name');

      if (!leads || leads.length === 0) {
        return {
          role: "assistant",
          content: "Your pipeline is empty. Start adding leads to track your opportunities!"
        };
      }

      const stagesMap = new Map(stages?.map(s => [s.id, s.name]));
      const totalValue = leads.reduce((sum, lead) => sum + (Number(lead.value) || 0), 0);
      const stageGroups = leads.reduce((acc: any, lead) => {
        const stageName = lead.stage_id ? stagesMap.get(lead.stage_id) : 'Unassigned';
        const stage = stageName || 'Unassigned';
        if (!acc[stage]) acc[stage] = { count: 0, value: 0 };
        acc[stage].count++;
        acc[stage].value += Number(lead.value) || 0;
        return acc;
      }, {});

      const breakdown = Object.entries(stageGroups)
        .map(([stage, data]: [string, any]) => `• ${data.count} in ${stage} ($${data.value.toLocaleString()})`)
        .join('\n');

      const highValue = leads
        .filter(l => Number(l.value) > 15000)
        .sort((a, b) => Number(b.value) - Number(a.value))
        .slice(0, 3);

      return {
        role: "assistant",
        content: `Your pipeline has ${leads.length} active opportunities worth $${totalValue.toLocaleString()} total.\n\n${breakdown}\n\n${highValue.length > 0 ? `💡 Top opportunities:\n${highValue.map(l => `• ${l.name}: $${Number(l.value).toLocaleString()}`).join('\n')}` : ''}`
      };
    }
    
    // Task analysis
    if (lower.includes("task") || lower.includes("todo") || lower.includes("priority")) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, due_date, status, lead_id')
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

      const { data: taskLeads } = await supabase
        .from('leads')
        .select('id, name, value')
        .in('id', tasks?.map(t => t.lead_id).filter(Boolean) || []);

      const leadsMap = new Map(taskLeads?.map(l => [l.id, l]));

      if (!tasks || tasks.length === 0) {
        return {
          role: "assistant",
          content: "You have no pending tasks. Great job staying on top of everything! 🎉"
        };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTasks = tasks.filter(t => t.due_date && new Date(t.due_date) <= today);
      const upcomingTasks = tasks.filter(t => t.due_date && new Date(t.due_date) > today).slice(0, 5);

      let response = `You have ${tasks.length} pending task${tasks.length !== 1 ? 's' : ''}`;
      if (todayTasks.length > 0) response += `, ${todayTasks.length} due today`;
      response += ':\n\n';

      const displayTasks = [...todayTasks, ...upcomingTasks].slice(0, 8);
      response += displayTasks.map((t, i) => {
        const lead = t.lead_id ? leadsMap.get(t.lead_id) : null;
        const dueStr = t.due_date ? ` (${isToday(new Date(t.due_date)) ? 'today' : isTomorrow(new Date(t.due_date)) ? 'tomorrow' : format(new Date(t.due_date), 'MMM d')})` : '';
        const valueStr = lead?.value ? ` - $${Number(lead.value).toLocaleString()} opportunity` : '';
        return `${i + 1}. ${t.title}${dueStr}${valueStr}`;
      }).join('\n');

      return {
        role: "assistant",
        content: response
      };
    }

    // Default response
    return {
      role: "assistant",
      content: "I can help you with:\n• Pipeline analysis and opportunities\n• Conversion rate tracking\n• Task prioritization\n• Lead insights and recommendations\n\nWhat would you like to explore?"
    };
  };

  if (initializing) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">AI Assistant</h1>
        <p className="text-muted-foreground mt-1">Your intelligent business companion</p>
      </div>

      <Card className="flex flex-col" style={{ height: "calc(100vh - 250px)" }}>
        <div className="flex items-center gap-3 p-6 border-b">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">AI Assistant</h3>
            <p className="text-sm text-muted-foreground">Powered by real-time analytics</p>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
              >
                {message.role === "assistant" && (
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">AI</AvatarFallback>
                  </Avatar>
                )}
                <Card
                  className={`p-4 max-w-[80%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <MarkdownViewer content={message.content} className="text-sm" />
                  ) : (
                    <p className="text-sm whitespace-pre-line">{message.content}</p>
                  )}
                  {message.insights && message.insights.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {message.insights.map((insight, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className={`w-4 h-4 ${insight.priority === 'urgent' ? 'text-destructive' : 'text-primary'}`} />
                          <span><strong>{insight.lead}</strong> - {insight.action}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
                {message.role === "user" && (
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">You</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">AI</AvatarFallback>
                </Avatar>
                <Card className="p-4 bg-muted/50">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Ask about your pipeline, tasks, or metrics..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={loading}
            />
            <Button onClick={handleSend} size="icon" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Try: "What's my conversion rate?" or "Show me high-priority tasks"
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AIChat;

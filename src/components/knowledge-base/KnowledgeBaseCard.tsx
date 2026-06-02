import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface KnowledgeBaseCardProps {
  knowledgeBase: KnowledgeBase;
  onUpdate: () => void;
}

export function KnowledgeBaseCard({ knowledgeBase }: KnowledgeBaseCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="p-6 cursor-pointer hover:bg-accent/5 transition-colors"
          onClick={() => navigate(`/knowledge-base/${knowledgeBase.id}`)}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className="p-3 bg-primary/10 rounded-lg">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">{knowledgeBase.name}</h3>
            {knowledgeBase.description && (
              <p className="text-sm text-muted-foreground mb-2">
                {knowledgeBase.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Created {format(new Date(knowledgeBase.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
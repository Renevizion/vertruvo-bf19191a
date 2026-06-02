import { Card } from "@/components/ui/card";
import { AtSign } from "lucide-react";

export function InstagramMentions() {
  return (
    <Card className="p-12 text-center">
      <AtSign className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
      <h3 className="text-lg font-semibold mb-2">Mentions</h3>
      <p className="text-muted-foreground">
        Posts and stories where you've been tagged or mentioned will appear here.
        <br />
        This feature requires additional API permissions from Meta.
      </p>
    </Card>
  );
}

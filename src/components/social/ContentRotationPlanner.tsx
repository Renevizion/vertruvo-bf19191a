import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowRight, Check } from "lucide-react";

const CONTENT_TYPES = [
  { id: "photo", label: "Photo", color: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400", emoji: "📸" },
  { id: "quote", label: "Quote", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", emoji: "💬" },
  { id: "promo", label: "Promo", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", emoji: "📢" },
  { id: "stats", label: "Stats", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", emoji: "📊" },
  { id: "tips", label: "Tips", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400", emoji: "💡" },
  { id: "about", label: "About", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400", emoji: "👋" },
  { id: "info", label: "Info", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400", emoji: "ℹ️" },
];

const PATTERNS = [
  {
    name: "Authority Builder",
    description: "Photo → Tips → Quote — builds trust through visual proof, education, then inspiration",
    sequence: ["photo", "tips", "quote"],
  },
  {
    name: "Growth Engine",
    description: "Promo → Stats → Photo — sell, prove results, humanize",
    sequence: ["promo", "stats", "photo"],
  },
  {
    name: "Engagement Loop",
    description: "Quote → Photo → Tips → Promo — inspire, connect, teach, convert",
    sequence: ["quote", "photo", "tips", "promo"],
  },
  {
    name: "Brand Story",
    description: "About → Photo → Info → Quote — introduce, show, inform, inspire",
    sequence: ["about", "photo", "info", "quote"],
  },
  {
    name: "Content Creator",
    description: "Tips → Quote → Photo → Stats → Promo — the @adrianadafllamedia flow",
    sequence: ["tips", "quote", "photo", "stats", "promo"],
  },
];

interface ContentRotationPlannerProps {
  onPatternSelect?: (pattern: string[]) => void;
}

export function ContentRotationPlanner({ onPatternSelect }: ContentRotationPlannerProps) {
  const [activePattern, setActivePattern] = useState<string | null>(null);

  const getTypeInfo = (typeId: string) => CONTENT_TYPES.find(t => t.id === typeId);

  const selectPattern = (pattern: typeof PATTERNS[0]) => {
    setActivePattern(pattern.name);
    onPatternSelect?.(pattern.sequence);
  };

  // Generate upcoming 9 slots based on active pattern
  const getUpcoming9 = () => {
    const pattern = PATTERNS.find(p => p.name === activePattern);
    if (!pattern) return null;
    const slots: string[] = [];
    for (let i = 0; i < 9; i++) {
      slots.push(pattern.sequence[i % pattern.sequence.length]);
    }
    return slots;
  };

  const upcoming = getUpcoming9();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-primary" />
          Content Rotation
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Plan your content rhythm — alternate types for a curated, intentional feed
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pattern Presets */}
        <div className="space-y-2">
          {PATTERNS.map(pattern => (
            <button
              key={pattern.name}
              onClick={() => selectPattern(pattern)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                activePattern === pattern.name
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-accent/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{pattern.name}</span>
                {activePattern === pattern.name && (
                  <Check className="h-3.5 w-3.5 text-primary" />
                )}
              </div>
              <div className="flex items-center gap-1 mb-1.5">
                {pattern.sequence.map((typeId, i) => {
                  const info = getTypeInfo(typeId);
                  return (
                    <span key={i} className="flex items-center gap-0.5">
                      {i > 0 && <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />}
                      <Badge variant="secondary" className={`text-[9px] px-1 py-0 ${info?.color}`}>
                        {info?.emoji} {info?.label}
                      </Badge>
                    </span>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">{pattern.description}</p>
            </button>
          ))}
        </div>

        {/* Mini grid preview of pattern */}
        {upcoming && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Your next 9 posts would look like:</p>
            <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden border border-border">
              {upcoming.map((typeId, i) => {
                const info = getTypeInfo(typeId);
                return (
                  <div
                    key={i}
                    className="aspect-square flex flex-col items-center justify-center bg-muted/50 gap-1"
                  >
                    <span className="text-lg">{info?.emoji}</span>
                    <span className="text-[9px] font-medium text-muted-foreground">{info?.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

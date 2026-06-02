import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SKILLS } from "@/skills/registry";
import { CAPABILITIES } from "@/capabilities/registry";
import { useIsAdmin } from "@/hooks/useIsAdmin";

/**
 * Admin: skill catalog.
 * Each registered skill is procedural glue — it composes capabilities into
 * a workflow. This page proves the skill runner is real and shows which
 * capabilities each skill spends. (EMERGENCE.md §IV — Skills & composition.)
 */
export default function SkillCatalog() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!isAdmin) return <div className="p-6"><Card><CardContent className="p-6 text-muted-foreground">Admin only.</CardContent></Card></div>;

  const skills = Object.values(SKILLS);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Skill Catalog</h1>
        <p className="text-sm text-muted-foreground">
          {skills.length} skills registered. Skills compose capabilities — they never bypass entitlements,
          and every step writes to <code className="text-[10px]">shell_telemetry</code> so adoption is visible.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {skills.map((skill) => (
          <Card key={skill.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{skill.name}</span>
                <Badge variant="outline" className="text-[10px] uppercase">{skill.tier}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <p className="text-muted-foreground">{skill.description}</p>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Composes</div>
                <div className="flex flex-wrap gap-1">
                  {skill.capabilities.map((capKey) => {
                    const cap = CAPABILITIES[capKey];
                    return (
                      <Badge key={capKey} variant="secondary" className="text-[10px] font-mono">
                        {cap?.label ?? capKey}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              {skill.triggers.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Triggers</div>
                  <div className="flex flex-wrap gap-1">
                    {skill.triggers.slice(0, 4).map((t) => (
                      <span key={t} className="text-[10px] text-muted-foreground italic">"{t}"</span>
                    ))}
                  </div>
                </div>
              )}
              {skill.docPath && (
                <div className="text-[10px] text-muted-foreground font-mono">{skill.docPath}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground">
          Skill telemetry flows into <Link to="/admin/shells" className="text-primary hover:underline">Shell Health</Link>
          {" "}— filter on <code>metadata.kind = "skill_step"</code> to see which playbooks run end-to-end.
        </CardContent>
      </Card>
    </div>
  );
}

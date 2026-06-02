import { useEffect, useId, useState } from "react";

export function MermaidDiagram({ chart }: { chart: string }) {
  const [svg, setSvg] = useState("");
  const id = useId().replace(/:/g, "-");

  useEffect(() => {
    let active = true;

    const render = async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({ startOnLoad: false, securityLevel: "loose", theme: "neutral" });
      const { svg } = await mermaid.render(`mermaid-${id}`, chart);
      if (active) setSvg(svg);
    };

    render().catch(() => {
      if (active) setSvg("");
    });

    return () => {
      active = false;
    };
  }, [chart, id]);

  if (!svg) {
    return <div className="text-sm text-muted-foreground">Rendering architecture diagram…</div>;
  }

  return <div className="overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}

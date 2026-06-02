import { useEffect, useMemo, useRef } from "react";
import cytoscape from "cytoscape";

interface ContactGraphProps {
  contact: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
  };
  taskCount: number;
  submissionCount: number;
  conversationCount: number;
}

export function ContactGraph({ contact, taskCount, submissionCount, conversationCount }: ContactGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const elements = useMemo(() => {
    const nodes = [
      { data: { id: "contact", label: contact.name || "Contact", kind: "primary" } },
      { data: { id: "tasks", label: `${taskCount} tasks`, kind: "meta" } },
      { data: { id: "forms", label: `${submissionCount} forms`, kind: "meta" } },
      { data: { id: "messages", label: `${conversationCount} messages`, kind: "meta" } },
    ];

    const edges = [
      { data: { source: "contact", target: "tasks" } },
      { data: { source: "contact", target: "forms" } },
      { data: { source: "contact", target: "messages" } },
    ];

    if (contact.email) {
      nodes.push({ data: { id: "email", label: contact.email, kind: "detail" } });
      edges.push({ data: { source: "contact", target: "email" } });
    }
    if (contact.phone) {
      nodes.push({ data: { id: "phone", label: contact.phone, kind: "detail" } });
      edges.push({ data: { source: "contact", target: "phone" } });
    }
    if (contact.company) {
      nodes.push({ data: { id: "company", label: contact.company, kind: "detail" } });
      edges.push({ data: { source: "contact", target: "company" } });
    }

    return [...nodes, ...edges];
  }, [contact, conversationCount, submissionCount, taskCount]);

  useEffect(() => {
    if (!containerRef.current) return;

    const graph = cytoscape({
      container: containerRef.current,
      elements,
      layout: { name: "concentric", animate: false },
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "text-wrap": "wrap",
            "text-max-width": "120",
            "font-size": 11,
            color: "#0f172a",
            "background-color": "#dbeafe",
            width: 54,
            height: 54,
            "text-valign": "center",
            "text-halign": "center",
          },
        },
        {
          selector: 'node[kind = "primary"]',
          style: {
            "background-color": "#8b5cf6",
            color: "#ffffff",
            width: 72,
            height: 72,
            "font-size": 12,
            "font-weight": 700,
          },
        },
        {
          selector: 'node[kind = "detail"]',
          style: {
            "background-color": "#e2e8f0",
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#cbd5e1",
            "target-arrow-color": "#cbd5e1",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
          },
        },
      ],
    });

    return () => graph.destroy();
  }, [elements]);

  return <div ref={containerRef} className="h-[320px] rounded-md border bg-muted/20" />;
}

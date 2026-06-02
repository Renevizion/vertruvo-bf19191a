import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { FlyerTemplate } from "./FlyerTemplates";

export interface FlyerData {
  header: Record<string, string>;
  rows: Record<string, string>[];
  footer: Record<string, string>;
  bullets: string[];
}

interface FlyerEditorFormProps {
  template: FlyerTemplate;
  data: FlyerData;
  onChange: (data: FlyerData) => void;
}

export function FlyerEditorForm({ template, data, onChange }: FlyerEditorFormProps) {
  const updateHeader = (key: string, value: string) => {
    onChange({ ...data, header: { ...data.header, [key]: value } });
  };

  const updateFooter = (key: string, value: string) => {
    onChange({ ...data, footer: { ...data.footer, [key]: value } });
  };

  const updateRow = (index: number, key: string, value: string) => {
    const rows = [...data.rows];
    rows[index] = { ...rows[index], [key]: value };
    onChange({ ...data, rows });
  };

  const addRow = () => {
    const empty: Record<string, string> = {};
    template.columns.forEach(c => (empty[c.key] = ""));
    onChange({ ...data, rows: [...data.rows, empty] });
  };

  const removeRow = (index: number) => {
    onChange({ ...data, rows: data.rows.filter((_, i) => i !== index) });
  };

  const updateBullets = (text: string) => {
    onChange({ ...data, bullets: text.split("\n").filter(Boolean) });
  };

  return (
    <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2">
      {/* Header Fields */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Header Info</h4>
        {template.headerFields.map(f => (
          <div key={f.key}>
            <Label className="text-xs">{f.label}</Label>
            <Input
              value={data.header[f.key] || ""}
              onChange={e => updateHeader(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="mt-1"
            />
          </div>
        ))}
      </div>

      {/* Table Rows (schedule / program) */}
      {template.columns.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Schedule Rows</h4>
            <Button size="sm" variant="outline" onClick={addRow}>
              <Plus className="h-3 w-3 mr-1" /> Row
            </Button>
          </div>
          {data.rows.map((row, ri) => (
            <div key={ri} className="flex gap-2 items-end">
              {template.columns.map(col => (
                <div key={col.key} className="flex-1 min-w-0">
                  {ri === 0 && <Label className="text-[10px] text-muted-foreground">{col.label}</Label>}
                  <Input
                    value={row[col.key] || ""}
                    onChange={e => updateRow(ri, col.key, e.target.value)}
                    placeholder={col.label}
                    className="text-xs h-8"
                  />
                </div>
              ))}
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeRow(ri)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Bullets (for promo template) */}
      {template.category === "promo" && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Rules / Bullet Points</h4>
          <Textarea
            value={data.bullets.join("\n")}
            onChange={e => updateBullets(e.target.value)}
            placeholder="One rule per line&#10;Courts may be booked one week ahead&#10;24-hour cancellation notice required"
            rows={5}
            className="text-xs"
          />
        </div>
      )}

      {/* Footer Fields */}
      {template.footerFields && template.footerFields.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Footer Info</h4>
          {template.footerFields.map(f => (
            <div key={f.key}>
              <Label className="text-xs">{f.label}</Label>
              <Input
                value={data.footer[f.key] || ""}
                onChange={e => updateFooter(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="mt-1"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

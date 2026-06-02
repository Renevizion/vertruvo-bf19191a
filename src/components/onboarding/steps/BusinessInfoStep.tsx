import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { VERTICAL_LIST, VERTICAL_PRESETS, inferVerticals, type VerticalId } from "@/lib/vertical-presets";

// Backwards-compat: existing code imports `BusinessTypeValue` (the human label)
// because business_settings.business_category stores the label string.
export type BusinessTypeValue = string;

/** Legacy helper kept for callers that pass split fields. */
export const inferBusinessTypes = (inputs: {
  businessName: string;
  website: string;
  phone: string;
  businessDescription: string;
}): BusinessTypeValue[] => {
  const text = [inputs.businessName, inputs.website, inputs.phone, inputs.businessDescription].join(" ");
  return inferVerticals(text).map((id) => VERTICAL_PRESETS[id].label);
};

interface BusinessInfoStepProps {
  businessName: string;
  setBusinessName: (v: string) => void;
  website: string;
  setWebsite: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  businessDescription: string;
  setBusinessDescription: (v: string) => void;
  businessType: BusinessTypeValue | null;
  setBusinessType: (v: BusinessTypeValue) => void;
  suggestedBusinessTypes: BusinessTypeValue[];
  city: string;
  setCity: (v: string) => void;
  stateProvince: string;
  setStateProvince: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  scrapingWebsite: boolean;
  onWebsiteBlur: () => void;
}

export const BusinessInfoStep = ({
  businessName, setBusinessName,
  website, setWebsite,
  phone, setPhone,
  businessDescription, setBusinessDescription,
  businessType, setBusinessType,
  suggestedBusinessTypes,
  city, setCity,
  stateProvince, setStateProvince,
  country, setCountry,
  scrapingWebsite, onWebsiteBlur,
}: BusinessInfoStepProps) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Tell us about your business</h3>
        <p className="text-sm text-muted-foreground">
          We'll use this to personalize your Thermi experience
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="business-name">Business Name *</Label>
          <Input
            id="business-name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Acme Inc."
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website URL</Label>
          <div className="relative">
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              onBlur={onWebsiteBlur}
              placeholder="https://yourcompany.com"
            />
            {scrapingWebsite && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            We'll auto-fill details from your website
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Business Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Business Description</Label>
          <Textarea
            id="description"
            value={businessDescription}
            onChange={(e) => setBusinessDescription(e.target.value)}
            placeholder="What does your business do?"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Business Type *</Label>
          <p className="text-xs text-muted-foreground">
            Pick the closest fit. Thermi will tailor your pipeline stages, sidebar, and AI tone to match.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {VERTICAL_LIST.map((preset) => {
              const isSelected = businessType === preset.label;
              const isSuggested = suggestedBusinessTypes.includes(preset.label);

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setBusinessType(preset.label)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left transition-colors",
                    isSelected ? "border-primary bg-accent" : "border-border hover:border-primary/50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{preset.label}</span>
                    {isSelected ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : isSuggested ? (
                      <Sparkles className="h-4 w-4 text-primary" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{preset.hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Business Location</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            <Input value={stateProvince} onChange={(e) => setStateProvince(e.target.value)} placeholder="State / Province" />
          </div>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
        </div>
      </div>
    </div>
  );
};

// Backwards-compat: some callers still import BUSINESS_TYPE_OPTIONS.
export const BUSINESS_TYPE_OPTIONS = VERTICAL_LIST.map((v) => ({
  value: v.label,
  hint: v.hint,
  keywords: v.keywords,
}));

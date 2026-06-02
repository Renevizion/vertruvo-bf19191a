import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const LICENSE_VERSION = "3.0";

interface ClickWrapGateProps {
  userId: string;
  email: string;
  onAccepted: () => void;
}

export function ClickWrapGate({ userId, email, onAccepted }: ClickWrapGateProps) {
  const { toast } = useToast();
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!checked) return;
    setLoading(true);
    let recorded = false;
    try {
      // Preferred path: edge function (captures server-side IP)
      const { error } = await supabase.functions.invoke("record-license-acceptance", {
        body: { user_id: userId, email, license_version: LICENSE_VERSION },
      });
      if (!error) recorded = true;
      else console.warn("[ClickWrap] edge fn failed, falling back to direct insert", error);
    } catch (err) {
      console.warn("[ClickWrap] edge fn threw, falling back to direct insert", err);
    }

    if (!recorded) {
      try {
        const { error: insertErr } = await supabase
          .from("license_acceptances")
          .insert({
            user_id: userId,
            email,
            license_version: LICENSE_VERSION,
            user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
          });
        if (insertErr && !`${insertErr.message}`.toLowerCase().includes("duplicate")) throw insertErr;
        recorded = true;
      } catch (err) {
        console.error("[ClickWrap] direct insert failed", err);
        toast({
          title: "Couldn't record acceptance",
          description: "Please refresh and try again, or contact legal@thermi.com.",
          variant: "destructive",
        });
      }
    }

    setLoading(false);
    if (recorded) onAccepted();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">End User License Agreement</h1>
            <p className="text-xs text-muted-foreground">Thermi Platform · Version {LICENSE_VERSION} · You must accept to continue</p>
          </div>
        </div>

        {/* License text */}
        <ScrollArea className="flex-1 px-6 py-4 min-h-0">
          <div className="prose prose-sm max-w-none text-foreground space-y-4 text-sm leading-relaxed">
            <p className="font-semibold text-base">THERMI PLATFORM END USER LICENSE AGREEMENT</p>
            <p>Last updated: May 27, 2026 · Effective upon acceptance</p>

            <p>This End User License Agreement ("Agreement") is a legally binding contract between you ("User," "Partner," or "Operator") and Milord Ventures LLC, doing business as Thermi ("Company," "we," "us," or "our"), governing your access to and use of the Thermi platform, software, AI agents, workflows, templates, data structures, and all associated intellectual property (collectively, the "Platform").</p>

            <p className="font-semibold">BY CLICKING "I AGREE AND ACCEPT," YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE LEGALLY BOUND BY THIS AGREEMENT. IF YOU DO NOT AGREE, YOU MUST NOT ACCESS OR USE THE PLATFORM.</p>

            <p className="font-semibold">1. GRANT OF LICENSE</p>
            <p>Subject to your compliance with this Agreement, the Company grants you a limited, non-exclusive, non-transferable, non-sublicensable, revocable license to access and use the Platform solely for your internal business operations. This license does not include the right to resell, sublicense, white-label, or redistribute the Platform or any component thereof without a separate written reseller agreement executed by an authorized officer of the Company.</p>

            <p className="font-semibold">2. INTELLECTUAL PROPERTY OWNERSHIP</p>
            <p>The Platform, including but not limited to all software code, AI agent architectures, automation workflows, call scripts, pipeline structures, UI/UX designs, data models, API designs, and documentation, is and shall remain the exclusive intellectual property of Milord Ventures LLC. No title or ownership of any intellectual property is transferred to you under this Agreement. All rights not expressly granted herein are reserved by the Company.</p>

            <p className="font-semibold">3. RESTRICTIONS ON USE</p>
            <p>You expressly agree that you will NOT:</p>
            <p>(a) Reverse engineer, decompile, disassemble, or attempt to derive the source code, underlying algorithms, or architecture of any portion of the Platform;</p>
            <p>(b) Copy, reproduce, modify, translate, adapt, or create derivative works based on the Platform or any component thereof;</p>
            <p>(c) Use the Platform to build, develop, or assist in building a competing product or service;</p>
            <p>(d) Share, disclose, or transfer your login credentials or access to any third party;</p>
            <p>(e) Scrape, harvest, or systematically extract data, templates, workflows, or configurations from the Platform;</p>
            <p>(f) Remove, obscure, or alter any proprietary notices, labels, or marks on the Platform;</p>
            <p>(g) Use the Platform in any manner that violates applicable law or regulation.</p>

            <p className="font-semibold">4. CONFIDENTIALITY</p>
            <p>You acknowledge that the Platform contains trade secrets and confidential information of the Company. You agree to maintain the confidentiality of all non-public aspects of the Platform and to take reasonable measures to prevent unauthorized disclosure. This obligation survives termination of this Agreement.</p>

            <p className="font-semibold">5. AUDIT TRAIL AND CONSENT TO LOGGING</p>
            <p>By accepting this Agreement, you consent to the Company recording your acceptance, including your user account identifier, email address, IP address, browser user agent, and the date and time of acceptance, for the purpose of maintaining an enforceable audit trail. This record constitutes evidence of your agreement to these terms.</p>

            <p className="font-semibold">6. TERMINATION</p>
            <p>The Company may terminate your access to the Platform immediately and without notice if you breach any provision of this Agreement. Upon termination, you must immediately cease all use of the Platform and destroy any copies of Platform materials in your possession.</p>

            <p className="font-semibold">7. DISCLAIMER OF WARRANTIES</p>
            <p>THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. THE COMPANY DISCLAIMS ALL WARRANTIES INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>

            <p className="font-semibold">8. LIMITATION OF LIABILITY</p>
            <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE COMPANY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE PLATFORM, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. THE COMPANY'S TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNTS PAID BY YOU IN THE THREE (3) MONTHS PRECEDING THE CLAIM.</p>

            <p className="font-semibold">9. GOVERNING LAW AND DISPUTE RESOLUTION</p>
            <p>This Agreement shall be governed by and construed in accordance with the laws of the State of Connecticut, without regard to its conflict of law provisions. Any dispute arising from this Agreement shall be resolved exclusively in the state or federal courts located in Connecticut, and you hereby consent to personal jurisdiction in such courts.</p>

            <p className="font-semibold">10. ENTIRE AGREEMENT</p>
            <p>This Agreement constitutes the entire agreement between you and the Company regarding the subject matter herein and supersedes all prior agreements, representations, and understandings. Any modification must be in writing and signed by an authorized representative of the Company.</p>

            <p className="font-semibold">Contact: legal@thermi.com · Milord Ventures LLC · Connecticut, USA</p>
          </div>
        </ScrollArea>

        {/* Acceptance footer */}
        <div className="px-6 py-5 border-t border-border space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Your acceptance will be recorded with your IP address and timestamp as a legally binding audit record. You must scroll through and read the full agreement above before accepting.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="accept-license"
              checked={checked}
              onCheckedChange={(v) => setChecked(v === true)}
              className="mt-0.5"
            />
            <label htmlFor="accept-license" className="text-sm cursor-pointer leading-relaxed">
              I have read, understand, and agree to be legally bound by the Thermi End User License Agreement (Version {LICENSE_VERSION}). I acknowledge that clicking "I Agree and Accept" constitutes my electronic signature and creates a legally enforceable contract.
            </label>
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={!checked || loading}
            onClick={handleAccept}
          >
            {loading ? "Recording acceptance…" : "I Agree and Accept"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            If you do not agree, close this window. You will not be able to access the platform without accepting.
          </p>
        </div>
      </div>
    </div>
  );
}

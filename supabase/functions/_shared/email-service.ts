import { sendLovableEmail } from 'npm:@lovable.dev/email-js'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// Shared email service utilities for Kiruvo
// Emails use the configured Kiruvo sender domain with proper From Name.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface EmailConfig {
  fromName: string;        // Business name (e.g., "My Business")
  fromEmail: string;       // Platform email (e.g., "noreply@mail.kiruvo.com")
  replyToEmail: string;    // Business email for replies
  replyToName?: string;    // Business name for reply-to
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  config: EmailConfig;
  replyToken?: string;     // Unique token to track replies
  tags?: { name: string; value: string }[];
}

export interface SendEmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

/**
 * Generate a unique reply token for tracking email replies
 */
export function generateReplyToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Build the reply-to address with tracking token
 * Format: reply-{token}@mail.kiruvo.com
 */
export function buildReplyToAddress(replyToken: string, fallbackEmail: string): string {
  // If we have a verified domain, use it for reply tracking
  // Otherwise fall back to business email
  const replyDomain = Deno.env.get("KIRUVO_REPLY_DOMAIN");
  if (replyDomain) {
    return `reply-${replyToken}@${replyDomain}`;
  }
  return fallbackEmail;
}

function generateUnsubscribeToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function getOrCreateUnsubscribeToken(email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: existingToken, error: lookupError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (lookupError) throw new Error('Failed to prepare email unsubscribe token');
  if (existingToken?.used_at) throw new Error('Recipient has unsubscribed');
  if (existingToken?.token) return existingToken.token;

  const token = generateUnsubscribeToken();
  const { error: tokenError } = await supabase
    .from('email_unsubscribe_tokens')
    .upsert(
      { token, email: normalizedEmail },
      { onConflict: 'email', ignoreDuplicates: true },
    );

  if (tokenError) throw new Error('Failed to prepare email unsubscribe token');

  const { data: storedToken, error: readBackError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (readBackError || !storedToken?.token) {
    throw new Error('Failed to confirm email unsubscribe token');
  }

  return storedToken.token;
}

/**
 * Send email via the configured sender domain
 * - From Name: Business name (what recipient sees)
 * - From Email: Platform sending domain
 * - Reply-To: Business email (where replies go)
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.error("LOVABLE_API_KEY not configured");
    return { success: false, error: "Email service not configured" };
  }

  const { to, subject, html, text, config, replyToken, tags } = params;
  const senderDomain = Deno.env.get("KIRUVO_SENDER_DOMAIN") || "notify.kiruvo.com";
  
  // Build from address: "Business Name <platform@mail.kiruvo.com>"
  const fromAddress = `${config.fromName} <${config.fromEmail}>`;
  
  // Build reply-to with optional tracking
  let replyTo = config.replyToEmail;
  if (replyToken) {
    replyTo = buildReplyToAddress(replyToken, config.replyToEmail);
  }
  
  const toAddresses = Array.isArray(to) ? to : [to];
  
  try {
    const results = [];
    for (const recipient of toAddresses) {
      const unsubscribeToken = await getOrCreateUnsubscribeToken(recipient);
      const response = await sendLovableEmail(
        {
          to: recipient,
          sender_domain: senderDomain,
          from: fromAddress,
          subject,
          html,
          text: text || html.replace(/<[^>]*>/g, ''),
          purpose: "transactional",
          label: tags?.find((tag) => tag.name === "type")?.value || "direct",
          idempotency_key: crypto.randomUUID(),
          unsubscribe_token: unsubscribeToken,
          message_id: crypto.randomUUID(),
        },
        { apiKey, sendUrl: Deno.env.get("LOVABLE_SEND_URL") }
      );
      results.push(response);
    }

    const emailId = results[0]?.id || results[0]?.message_id || crypto.randomUUID();
    console.log("Email sent successfully:", emailId);
    return { success: true, emailId };
  } catch (e) {
    console.error("Error calling email service:", e);
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/**
 * Get email configuration for a workspace
 */
export async function getWorkspaceEmailConfig(
  supabase: any,
  workspaceId: string
): Promise<EmailConfig> {
  // Get business settings for the workspace
  const { data: businessSettings } = await supabase
    .from("business_settings")
    .select("business_name, business_email")
    .eq("workspace_id", workspaceId)
    .single();

  const platformEmail = Deno.env.get("KIRUVO_FROM_EMAIL") || "noreply@kiruvo.com";

  return {
    fromName: businessSettings?.business_name || "Kiruvo",
    fromEmail: platformEmail,
    replyToEmail: businessSettings?.business_email || platformEmail,
    replyToName: businessSettings?.business_name,
  };
}

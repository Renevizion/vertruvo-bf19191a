import { format } from "date-fns";

interface ParsedActivity {
  summary: string;
  emailBody?: string | null;
  details?: Record<string, string>;
  fullJson?: Record<string, any>;
}

/**
 * Parses a raw activity description (which may be JSON) into a human-readable format.
 */
export function parseActivityDescription(description: string | null): ParsedActivity | null {
  if (!description) return null;

  // Try parsing as JSON
  let parsed: Record<string, any>;
  try {
    parsed = JSON.parse(description);
  } catch {
    return { summary: description };
  }

  // Auto-response or AI outreach activity (any activity carrying an email_body)
  if (parsed.email_body || (parsed.message && typeof parsed.message === 'string' && (parsed.message.includes('auto-response') || parsed.message.includes('outreach') || parsed.message.includes('AI-crafted')))) {
    const details: Record<string, string> = {};
    if (parsed.recipient) {
      details['To'] = parsed.recipient;
    }
    if (parsed.responded_at) {
      details['Sent at'] = format(new Date(parsed.responded_at), "MMM dd, yyyy 'at' h:mm a");
    }
    if (parsed.response_time_ms) {
      details['Response time'] = `${(parsed.response_time_ms / 1000).toFixed(1)}s`;
    }
    return {
      summary: parsed.message,
      emailBody: parsed.email_body || null,
      details,
      fullJson: parsed,
    };
  }

  // Form submission activity
  if (parsed.form_id || parsed.form_name || parsed.submission_data) {
    const summary = `Form "${parsed.form_name || 'Unknown'}" submitted`;
    const details: Record<string, string> = {};
    
    if (parsed.submission_data && typeof parsed.submission_data === 'object') {
      Object.entries(parsed.submission_data).forEach(([key, value]) => {
        details[key.replace(/_/g, ' ')] = Array.isArray(value) ? (value as string[]).join(', ') : String(value || '—');
      });
    }
    if (parsed.submitted_at) {
      details['Submitted'] = format(new Date(parsed.submitted_at), "MMM dd, yyyy 'at' h:mm a");
    }
    if (parsed.device_type) {
      details['Device'] = parsed.device_type;
    }

    return {
      summary,
      details,
      fullJson: parsed,
    };
  }

  // Workflow / audit log entity blob: {"entity":"workflow","entityId":"...","changes":[...]}
  if (parsed.entity && (parsed.entityId || parsed.entity_id)) {
    const entityLabel = String(parsed.entity).replace(/_/g, ' ');
    const id = String(parsed.entityId || parsed.entity_id);
    const shortId = id.length > 8 ? id.slice(0, 8) + '…' : id;
    const changeCount = Array.isArray(parsed.changes) ? parsed.changes.length : 0;
    const summary = changeCount > 0
      ? `${entityLabel} updated (${changeCount} change${changeCount === 1 ? '' : 's'})`
      : `${entityLabel} event`;
    const details: Record<string, string> = {
      'Entity': entityLabel,
      'ID': shortId,
    };
    if (changeCount > 0) details['Changes'] = String(changeCount);
    return { summary, details, fullJson: parsed };
  }

  // Generic JSON — show message field or first string field as summary
  if (parsed.message && typeof parsed.message === 'string') {
    return { summary: parsed.message, fullJson: parsed };
  }

  // Last resort: collapse JSON into "key: value" pairs instead of raw braces
  try {
    const entries = Object.entries(parsed)
      .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
      .slice(0, 3)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${String(v)}`);
    if (entries.length > 0) {
      return { summary: entries.join(' · '), fullJson: parsed };
    }
  } catch {
    // ignore
  }

  // Fallback: show raw description
  return { summary: description };
}

/**
 * Returns a short one-line summary for an activity description.
 */
export function getActivitySummary(description: string | null): string {
  const parsed = parseActivityDescription(description);
  if (!parsed) return '';
  return parsed.summary;
}

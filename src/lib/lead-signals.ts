// Pure, deterministic signal derivation for a lead.
// No network calls. Produces score, trend, summary line, and a suggested next move
// from data already loaded in the lead detail surface.

export interface LeadSignalInput {
  lead: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    source?: string;
    value: number;
    stage_id: string | null;
    created_at: string;
  };
  activities: Array<{ id: string; type: string; created_at: string }>;
  stageName?: string | null;
}

export interface SuggestedMove {
  label: string;
  hint?: string;
  action:
    | 'send_email'
    | 'call'
    | 'book'
    | 'sell'
    | 'task'
    | 'advance_stage'
    | 'add_contact';
}

export interface LeadSignals {
  score: number; // 0-100
  bucket: 'Cold' | 'Warm' | 'Hot';
  trend: number; // delta vs last week
  summaryLine: string;
  suggestedMove: SuggestedMove;
  reasoning: string[]; // for tooltip
}

const DAY = 1000 * 60 * 60 * 24;

const bucketFor = (score: number): LeadSignals['bucket'] =>
  score >= 70 ? 'Hot' : score >= 40 ? 'Warm' : 'Cold';

function computeScore(
  input: LeadSignalInput,
  cutoff?: number,
): { score: number; reasoning: string[] } {
  const { lead, activities } = input;
  const now = Date.now();
  const filtered = cutoff
    ? activities.filter((a) => new Date(a.created_at).getTime() <= cutoff)
    : activities;

  const reasoning: string[] = [];
  let score = 30; // baseline

  // Recency of last touch
  const lastTouch = filtered[0] ? new Date(filtered[0].created_at).getTime() : null;
  if (lastTouch) {
    const hours = (now - lastTouch) / (1000 * 60 * 60);
    if (hours < 6) { score += 25; reasoning.push('Active in last 6h (+25)'); }
    else if (hours < 48) { score += 15; reasoning.push('Active in last 48h (+15)'); }
    else if (hours < 24 * 7) { score += 5; reasoning.push('Active this week (+5)'); }
    else { score -= 10; reasoning.push('Quiet 7d+ (-10)'); }
  } else {
    score -= 5;
    reasoning.push('No activity yet (-5)');
  }

  // Volume in last 14 days
  const recent14 = filtered.filter(
    (a) => now - new Date(a.created_at).getTime() < 14 * DAY,
  ).length;
  if (recent14 >= 5) { score += 15; reasoning.push(`${recent14} touches in 14d (+15)`); }
  else if (recent14 >= 2) { score += 8; reasoning.push(`${recent14} touches in 14d (+8)`); }

  // Value
  if (lead.value >= 1000) { score += 10; reasoning.push('High value (+10)'); }
  else if (lead.value >= 250) { score += 5; reasoning.push('Mid value (+5)'); }

  // Age penalty (stale, no movement)
  const ageDays = (now - new Date(lead.created_at).getTime()) / DAY;
  if (ageDays > 30 && recent14 === 0) {
    score -= 15;
    reasoning.push('Stale 30d+ (-15)');
  }

  // Source quality (light)
  const goodSources = ['referral', 'website', 'form', 'booking'];
  if (lead.source && goodSources.some((s) => lead.source!.toLowerCase().includes(s))) {
    score += 5;
    reasoning.push(`Source: ${lead.source} (+5)`);
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasoning };
}

function buildSummary(input: LeadSignalInput): string {
  const { activities, lead, stageName } = input;
  const now = Date.now();
  const touches = activities.length;
  const last = activities[0];

  const parts: string[] = [];
  parts.push(`${touches} touch${touches === 1 ? '' : 'es'}`);

  if (last) {
    const ago = humanAgo(now - new Date(last.created_at).getTime());
    parts.push(`last ${prettyType(last.type)} ${ago}`);
  } else {
    parts.push('no activity yet');
  }

  if (stageName) {
    const ageDays = Math.floor((now - new Date(lead.created_at).getTime()) / DAY);
    if (ageDays >= 3) parts.push(`in ${stageName} for ${ageDays}d`);
    else parts.push(`in ${stageName}`);
  }

  return parts.join(' · ');
}

function humanAgo(ms: number): string {
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function prettyType(t: string): string {
  const map: Record<string, string> = {
    email_sent: 'email',
    email_received: 'reply',
    call: 'call',
    note: 'note',
    sms: 'text',
    booking: 'booking',
    sale: 'sale',
  };
  return map[t] || t.replace(/_/g, ' ');
}

function suggestMove(input: LeadSignalInput, score: number): SuggestedMove {
  const { lead, activities, stageName } = input;
  const lastType = activities[0]?.type;
  const lastAt = activities[0] ? new Date(activities[0].created_at).getTime() : 0;
  const hoursSince = lastAt ? (Date.now() - lastAt) / 3_600_000 : Infinity;

  if (!lead.email && !lead.phone) {
    return { label: 'Add contact info', action: 'add_contact', hint: 'No way to reach this lead yet' };
  }

  if (lastType === 'email_received' && hoursSince < 24) {
    return { label: 'Reply now', action: 'send_email', hint: 'They responded recently' };
  }

  if (score >= 70) {
    return { label: 'Book a call', action: 'book', hint: 'Hot — push to a meeting' };
  }

  if (stageName && /qualified|proposal|negotiat/i.test(stageName)) {
    return { label: 'Close & charge', action: 'sell', hint: 'Late-stage — try the sale' };
  }

  if (hoursSince > 24 * 5) {
    return { label: 'Follow up', action: 'send_email', hint: `Last touch ${humanAgo(hoursSince * 3_600_000)}` };
  }

  if (activities.length === 0) {
    return { label: 'Send first outreach', action: 'send_email', hint: 'No touches yet' };
  }

  return { label: 'Log next step', action: 'task', hint: 'Keep momentum' };
}

export function deriveLeadSignals(input: LeadSignalInput): LeadSignals {
  const { score, reasoning } = computeScore(input);
  const lastWeekCutoff = Date.now() - 7 * DAY;
  const { score: prior } = computeScore(input, lastWeekCutoff);
  const trend = score - prior;

  return {
    score,
    bucket: bucketFor(score),
    trend,
    summaryLine: buildSummary(input),
    suggestedMove: suggestMove(input, score),
    reasoning,
  };
}

# Kiruvo Email System Documentation

## Overview

Kiruvo uses **Resend** as the email service provider for all email functionality. This provides reliable delivery, tracking, and inbound email parsing.

---

## How Email Sending Works

### From/Reply-To Pattern

When emails are sent from Kiruvo, they use this pattern:

| Header | Value | Purpose |
|--------|-------|---------|
| **From Name** | Business Name (e.g., "Tennis Club") | What recipient sees as the sender |
| **From Email** | `noreply@mail.kiruvo.com` | Platform sending domain (verified with Resend) |
| **Reply-To** | Business Email (e.g., `tennis@example.com`) | Where replies are directed |

**Why this pattern?**
- All emails send from Kiruvo's verified domain (better deliverability)
- Recipients see the business name, not "Kiruvo"
- Replies go to the business email and are captured by Kiruvo's inbound system

### Example

Tennis Club sends a campaign:
- Recipient sees: **From: Tennis Club**
- Recipient replies → Goes to Tennis Club's business email
- Kiruvo captures the reply → Shows in Inbox

---

## Email Functions

### 1. `send-email` - General Purpose Email

**Use for:** One-off emails, inbox messages, direct communication

```typescript
// From frontend:
await supabase.functions.invoke('send-email', {
  body: {
    workspaceId: 'uuid',
    to: 'recipient@example.com',
    subject: 'Hello',
    body: 'Email content...',
    contactId: 'uuid', // optional - links to contact
    leadId: 'uuid',    // optional - links to lead
  }
});
```

**Features:**
- Uses workspace business settings for From Name
- Creates conversation thread in Inbox
- Tracks message with reply token for inbound handling

---

### 2. `send-campaign-email` - Email Campaigns

**Use for:** Mass emails to email lists

```typescript
await supabase.functions.invoke('send-campaign-email', {
  body: {
    campaignId: 'uuid',
    workspaceId: 'uuid',
    testEmail: 'test@example.com', // optional - for testing
  }
});
```

**Features:**
- Sends to all subscribers in selected lists
- Deduplicates recipients
- Tracks delivery metrics (sent, delivered, bounced)
- Batches sends (10 at a time)

---

### 3. `send-workflow-email` - Workflow Automation Emails

**Use for:** Automated emails triggered by workflows

```typescript
await supabase.functions.invoke('send-workflow-email', {
  body: {
    workspaceId: 'uuid',
    to: 'recipient@example.com',
    subject: 'Follow-up',
    body: 'Automated content...',
    contactId: 'uuid',
    leadId: 'uuid',
    workflowId: 'uuid',
    workflowRunId: 'uuid',
  }
});
```

**Features:**
- Links emails to workflow runs for tracking
- Creates conversation if contact/lead provided
- Logs activity for audit trail

---

## Inbound Email Handling

### How Replies Work

1. Outbound emails include a tracking Reply-To: `reply-{token}@mail.kiruvo.com`
2. When recipient replies, Resend catches it via MX records
3. Resend posts to `inbound-email` webhook
4. Kiruvo parses the token to find original conversation
5. Reply is added to conversation thread in Inbox

### Inbound Webhook

**Endpoint:** `/functions/v1/inbound-email`

Receives:
- Sender email and name
- Subject line
- Body (text and HTML)
- Reply token from address

Actions:
- Matches to original conversation
- Creates message in thread
- Updates conversation status to "open"
- Logs activity

---

## Resend Webhook Events

**Endpoint:** `/functions/v1/resend-webhook`

Handles these Resend events:

| Event | Action |
|-------|--------|
| `email.delivered` | Update message status |
| `email.opened` | Track opens (campaigns) |
| `email.clicked` | Track clicks (campaigns) |
| `email.bounced` | Mark subscriber as bounced |
| `email.complained` | Unsubscribe complainant |

---

## Configuration Required

### 1. RESEND_API_KEY Secret ✅

Already configured. Get from [Resend Dashboard](https://resend.com/api-keys).

### 2. Verified Sending Domain

For production, verify your domain in Resend:
1. Go to [Resend Domains](https://resend.com/domains)
2. Add `mail.kiruvo.com` (or your domain)
3. Add DNS records (SPF, DKIM, DMARC)
4. Wait for verification

**Without verified domain:** Uses `onboarding@resend.dev` (limited)

### 3. Inbound Email (MX Records)

To receive replies in Kiruvo:
1. In Resend, go to Inbound Emails
2. Add your reply domain (e.g., `mail.kiruvo.com`)
3. Set webhook URL to your inbound-email function
4. Add MX records to your DNS

### 4. Optional Environment Variables

Set these in Secrets for customization:

| Variable | Default | Description |
|----------|---------|-------------|
| `KIRUVO_FROM_EMAIL` | `noreply@kiruvo.com` | Sending email address |
| `KIRUVO_REPLY_DOMAIN` | (none) | Domain for reply tracking |

---

## Email Types Summary

| Email Type | Function | Who Uses It | Reply Tracking |
|------------|----------|-------------|----------------|
| Campaign emails | `send-campaign-email` | Email Lists page | Yes |
| Workflow emails | `send-workflow-email` | Automations | Yes |
| Inbox messages | `send-email` | Inbox page | Yes |
| Test emails | `send-campaign-email` (with testEmail) | Testing | No |

---

## Database Tables

### `inbound_emails`
Stores all incoming email replies for processing.

### `messages` (updated)
- `reply_token`: Unique token for tracking replies
- `resend_email_id`: Resend's message ID

### `email_campaign_metrics`
Tracks campaign performance (opens, clicks, bounces).

---

## Troubleshooting

### Emails not sending
1. Check RESEND_API_KEY is set
2. Verify domain in Resend if using custom domain
3. Check edge function logs

### Replies not appearing
1. Verify MX records are set up
2. Check inbound-email webhook URL in Resend
3. Check inbound_emails table for unmatched emails

### Low deliverability
1. Verify your sending domain
2. Set up SPF, DKIM, DMARC records
3. Monitor bounce rates and clean lists

---

## Quick Setup Checklist

- [x] RESEND_API_KEY configured
- [ ] Sending domain verified in Resend
- [ ] Inbound email MX records added
- [ ] Webhook URLs configured in Resend:
  - Events webhook: `https://dpbbylcycltexyknejcb.supabase.co/functions/v1/resend-webhook`
  - Inbound webhook: `https://dpbbylcycltexyknejcb.supabase.co/functions/v1/inbound-email`
- [ ] Business email set in workspace settings

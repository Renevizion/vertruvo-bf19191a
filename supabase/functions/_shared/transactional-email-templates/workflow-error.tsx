import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Img, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Kiruvo"
const LOGO_URL = "https://dpbbylcycltexyknejcb.supabase.co/storage/v1/object/public/email-assets/kiruvo-logo.png"

interface WorkflowErrorProps {
  workflowName?: string
  errorMessage?: string
  failedNode?: string
  occurredAt?: string
  executionId?: string
}

const WorkflowErrorEmail = ({ workflowName, errorMessage, failedNode, occurredAt, executionId }: WorkflowErrorProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>⚠️ Workflow failed: {workflowName || 'Unknown'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoBanner}>
          <Img src={LOGO_URL} alt="Kiruvo" width="44" height="44" style={logoImg} />
          <Text style={logoText}>Kiruvo</Text>
        </Section>
        <Section style={errorBanner}>
          <Text style={errorIcon}>🚨</Text>
        </Section>
        <Heading style={h1}>Workflow Error</Heading>
        <Text style={text}>
          One of your automations encountered an error and could not complete.
        </Text>
        <Section style={errorCard}>
          <Text style={detailLabel}>Workflow</Text>
          <Text style={detailValue}>{workflowName || 'Unknown'}</Text>
          {failedNode && (
            <>
              <Text style={detailLabel}>Failed step</Text>
              <Text style={detailValue}>{failedNode}</Text>
            </>
          )}
          <Text style={detailLabel}>Error</Text>
          <Text style={errorValue}>{errorMessage || 'An unexpected error occurred'}</Text>
          <Text style={detailLabel}>Occurred at</Text>
          <Text style={detailValue}>{occurredAt || new Date().toISOString()}</Text>
          {executionId && (
            <>
              <Text style={detailLabel}>Execution ID</Text>
              <Text style={detailValue}>{executionId}</Text>
            </>
          )}
        </Section>
        <Section style={ctaSection}>
          <Button style={ctaButton} href="https://kiruvo.com/automations">
            View Workflow →
          </Button>
        </Section>
        <Text style={textSmall}>
          This error may resolve on its own if it was a temporary issue. If it
          persists, review the workflow configuration for the failed step.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>— {SITE_NAME} Automation Engine</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WorkflowErrorEmail,
  subject: (data: Record<string, any>) => `🚨 Workflow Failed: ${data.workflowName || 'Automation Error'}`,
  displayName: 'Workflow error alert',
  previewData: {
    workflowName: 'New Lead Follow-up',
    errorMessage: 'Failed to send email: recipient address not found',
    failedNode: 'Send Welcome Email',
    occurredAt: 'March 23, 2026 at 4:12 PM',
    executionId: 'exec-a7b3c9d1',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", wordBreak: 'break-word' as const }
const container = { padding: '0', width: '100%', maxWidth: '560px', margin: '0 auto', overflow: 'hidden' as const }
const logoBanner = { backgroundColor: 'hsl(161, 93%, 30%)', padding: '20px 25px', borderRadius: '8px 8px 0 0', display: 'flex' as const, alignItems: 'center' as const, gap: '12px' }
const logoImg = { borderRadius: '8px' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0', letterSpacing: '-0.5px' }
const errorBanner = { textAlign: 'center' as const, padding: '20px 25px 0' }
const errorIcon = { fontSize: '48px', margin: '0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#dc2626', margin: '12px 25px 12px', lineHeight: '1.3', textAlign: 'center' as const }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 25px 16px' }
const textSmall = { fontSize: '12px', color: '#999', lineHeight: '1.5', margin: '0 25px 16px' }
const errorCard = { margin: '8px 25px 20px', padding: '16px 20px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }
const detailLabel = { fontSize: '11px', color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '12px 0 2px', fontWeight: '600' as const }
const detailValue = { fontSize: '14px', color: '#0d0d0d', margin: '0 0 0', fontFamily: "'Inconsolata', monospace" }
const errorValue = { fontSize: '13px', color: '#dc2626', margin: '0 0 0', fontFamily: "'Inconsolata', monospace", lineHeight: '1.4' }
const ctaSection = { textAlign: 'center' as const, margin: '0 25px 16px' }
const ctaButton = { backgroundColor: '#dc2626', color: '#ffffff', padding: '12px 28px', borderRadius: '6px', fontSize: '14px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e5e5', margin: '20px 25px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 25px 30px' }

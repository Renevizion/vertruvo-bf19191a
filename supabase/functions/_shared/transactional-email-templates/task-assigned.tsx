import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr, Section, Img, Button,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Kiruvo"
const LOGO_URL = "https://dpbbylcycltexyknejcb.supabase.co/storage/v1/object/public/email-assets/kiruvo-logo.png"

interface TaskAssignedProps {
  assigneeName?: string
  taskTitle?: string
  taskDescription?: string
  priority?: string
  dueDate?: string
  assignedBy?: string
}

const TaskAssignedEmail = ({ assigneeName, taskTitle, taskDescription, priority, dueDate, assignedBy }: TaskAssignedProps) => {
  const priorityColors: Record<string, string> = {
    high: '#dc2626',
    medium: '#f59e0b',
    low: '#22c55e',
  }
  const priorityColor = priorityColors[(priority || 'medium').toLowerCase()] || '#f59e0b'

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>New task assigned: {taskTitle || 'Untitled task'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoBanner}>
            <Img src={LOGO_URL} alt="Kiruvo" width="44" height="44" style={logoImg} />
            <Text style={logoText}>Kiruvo</Text>
          </Section>
          <Heading style={h1}>📋 New Task Assigned</Heading>
          <Text style={text}>
            {assigneeName ? `Hi ${assigneeName}, a` : 'A'} new task has been assigned to you
            {assignedBy ? ` by ${assignedBy}` : ''}.
          </Text>
          <Section style={taskCard}>
            <Text style={taskTitleStyle}>{taskTitle || 'Untitled Task'}</Text>
            {taskDescription && <Text style={taskDesc}>{taskDescription}</Text>}
            <Section style={metaRow}>
              <Text style={{ ...priorityBadge, backgroundColor: priorityColor }}>
                {(priority || 'Medium').toUpperCase()}
              </Text>
            </Section>
            {dueDate && (
              <>
                <Text style={detailLabel}>Due date</Text>
                <Text style={detailValue}>{dueDate}</Text>
              </>
            )}
          </Section>
          <Section style={ctaSection}>
            <Button style={ctaButton} href="https://kiruvo.com/tasks">
              View Task →
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>— The {SITE_NAME} Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: TaskAssignedEmail,
  subject: (data: Record<string, any>) => `Task Assigned: ${data.taskTitle || 'New Task'}`,
  displayName: 'Task assigned notification',
  previewData: {
    assigneeName: 'Marcus',
    taskTitle: 'Follow up with Enterprise lead',
    taskDescription: 'Review the proposal and schedule a follow-up call with Acme Corp by end of week.',
    priority: 'high',
    dueDate: 'March 28, 2026',
    assignedBy: 'Emily Rodriguez',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", wordBreak: 'break-word' as const }
const container = { padding: '0', width: '100%', maxWidth: '560px', margin: '0 auto', overflow: 'hidden' as const }
const logoBanner = { backgroundColor: 'hsl(161, 93%, 30%)', padding: '20px 25px', borderRadius: '8px 8px 0 0', display: 'flex' as const, alignItems: 'center' as const, gap: '12px' }
const logoImg = { borderRadius: '8px' }
const logoText = { fontSize: '22px', fontWeight: 'bold' as const, color: '#ffffff', margin: '0', letterSpacing: '-0.5px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0d0d0d', margin: '24px 25px 12px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 25px 16px' }
const taskCard = { margin: '8px 25px 20px', padding: '16px 20px', backgroundColor: '#f8faf9', borderRadius: '8px', border: '1px solid #e5ebe8' }
const taskTitleStyle = { fontSize: '16px', fontWeight: '600' as const, color: '#0d0d0d', margin: '0 0 6px' }
const taskDesc = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 12px' }
const metaRow = { margin: '0 0 12px' }
const priorityBadge = { fontSize: '10px', fontWeight: '700' as const, color: '#ffffff', padding: '3px 10px', borderRadius: '12px', display: 'inline-block' as const, margin: '0', letterSpacing: '0.5px' }
const detailLabel = { fontSize: '11px', color: '#999', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '0 0 2px', fontWeight: '600' as const }
const detailValue = { fontSize: '14px', color: '#0d0d0d', margin: '0', fontFamily: "'Inconsolata', monospace" }
const ctaSection = { textAlign: 'center' as const, margin: '0 25px 24px' }
const ctaButton = { backgroundColor: 'hsl(161, 93%, 30%)', color: '#ffffff', padding: '12px 28px', borderRadius: '6px', fontSize: '14px', fontWeight: '600' as const, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e5e5', margin: '20px 25px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0 25px 30px' }

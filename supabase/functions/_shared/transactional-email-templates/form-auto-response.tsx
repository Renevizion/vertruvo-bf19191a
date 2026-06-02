import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Kiruvo"

interface FormAutoResponseProps {
  recipientName?: string
  businessName?: string
  formName?: string
  customMessage?: string
}

const FormAutoResponseEmail = ({ recipientName, businessName, formName, customMessage }: FormAutoResponseProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{businessName || SITE_NAME} received your submission</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {recipientName ? `Hi ${recipientName},` : 'Hi there,'}
        </Heading>
        <Text style={text}>
          Thank you for reaching out{businessName ? ` to ${businessName}` : ''}! We received your{formName ? ` "${formName}"` : ''} submission and will be in touch shortly.
        </Text>
        {customMessage && (
          <>
            <Hr style={hr} />
            <Text style={text}>{customMessage}</Text>
          </>
        )}
        <Text style={footer}>
          Best regards,<br />
          The {businessName || SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FormAutoResponseEmail,
  subject: (data: Record<string, any>) => `${data.businessName || SITE_NAME} received your submission`,
  displayName: 'Form auto-response',
  previewData: { recipientName: 'Jane', businessName: 'Acme Corp', formName: 'Contact Us', customMessage: 'We typically respond within 24 hours.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", wordBreak: 'break-word' as const }
const container = { padding: '20px 25px', width: '100%', maxWidth: '560px', margin: '0 auto', overflow: 'hidden' as const }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 20px', wordBreak: 'break-word' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0', lineHeight: '1.5' }

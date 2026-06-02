import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Kiruvo'

interface Props {
  brand?: string
  platform?: string
  caption?: string
  imageUrl?: string | null
  approveUrl?: string
  editUrl?: string
  reasonLabel?: string
}

const SocialPostSuggestion = ({
  brand = 'your brand',
  platform = 'Instagram',
  caption = '',
  imageUrl = null,
  approveUrl = '#',
  editUrl = '#',
  reasonLabel = 'Time to post',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{reasonLabel} — preview, approve, or edit your {platform} post</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={kicker}>{SITE_NAME} · Posting coach</Text>
        <Heading style={h1}>{reasonLabel}</Heading>
        <Text style={text}>
          Here's a ready-to-post draft for <strong>{brand}</strong> on {platform}. Approve it to publish immediately, or open the editor to tweak first.
        </Text>

        {imageUrl ? (
          <Section style={imageWrap}>
            <Img src={imageUrl} alt="Post preview" width="520" style={image} />
          </Section>
        ) : null}

        <Section style={captionBox}>
          <Text style={captionText}>{caption}</Text>
        </Section>

        <Section style={{ textAlign: 'center', margin: '28px 0 12px' }}>
          <Button href={approveUrl} style={primaryBtn}>Approve &amp; Post Now</Button>
        </Section>
        <Section style={{ textAlign: 'center', margin: '0 0 24px' }}>
          <Button href={editUrl} style={secondaryBtn}>Edit first</Button>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          You're getting this because Posting Coach is on for {brand}. Adjust cadence or turn off email nudges in {SITE_NAME} → Social → Coach settings.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SocialPostSuggestion,
  subject: (d: Record<string, any>) => `${d?.reasonLabel || 'Time to post'} — ${d?.platform || 'social'} draft ready`,
  displayName: 'Social posting coach',
  previewData: {
    brand: 'Acme Studio',
    platform: 'Instagram',
    caption: 'Sundays were made for slow mornings and warm light. ☕',
    imageUrl: null,
    approveUrl: 'https://example.com/approve',
    editUrl: 'https://example.com/edit',
    reasonLabel: 'Time for your next post',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const kicker = { fontSize: '12px', textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#059669', fontWeight: 600, margin: '0 0 8px' }
const h1 = { fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 12px', lineHeight: 1.3 }
const text = { fontSize: '15px', color: '#475569', lineHeight: 1.6, margin: '0 0 20px' }
const imageWrap = { textAlign: 'center' as const, margin: '0 0 16px' }
const image = { borderRadius: '12px', maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto' }
const captionBox = { background: '#f8fafc', borderLeft: '3px solid #059669', borderRadius: '8px', padding: '14px 16px', margin: '0 0 8px' }
const captionText = { fontSize: '14px', color: '#0f172a', lineHeight: 1.6, margin: 0, wordBreak: 'break-word' as const }
const primaryBtn = { background: '#059669', color: '#ffffff', padding: '14px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const secondaryBtn = { background: '#ffffff', color: '#059669', padding: '12px 26px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block', border: '1.5px solid #059669' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: '#94a3b8', lineHeight: 1.5, margin: 0 }

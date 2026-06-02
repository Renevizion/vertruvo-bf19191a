/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as systemTest } from './system-test.tsx'
import { template as welcome } from './welcome.tsx'
import { template as bookingConfirmation } from './booking-confirmation.tsx'
import { template as paymentReceipt } from './payment-receipt.tsx'
import { template as contactConfirmation } from './contact-confirmation.tsx'
import { template as taskAssigned } from './task-assigned.tsx'
import { template as leadWon } from './lead-won.tsx'
import { template as paymentFailed } from './payment-failed.tsx'
import { template as trialExpiring } from './trial-expiring.tsx'
import { template as subscriptionCancelled } from './subscription-cancelled.tsx'
import { template as passwordChanged } from './password-changed.tsx'
import { template as staffInvitation } from './staff-invitation.tsx'
import { template as formSubmissionNotify } from './form-submission-notify.tsx'
import { template as workflowError } from './workflow-error.tsx'
import { template as formAutoResponse } from './form-auto-response.tsx'
import { template as dripDay2 } from './drip-day2-first-workflow.tsx'
import { template as dripDay5 } from './drip-day5-progress.tsx'
import { template as dripDay10 } from './drip-day10-power-features.tsx'
import { template as dripDay13 } from './drip-day13-final-warning.tsx'

import { template as customerWelcome } from './customer-welcome.tsx'
import { template as customerPasswordReset } from './customer-password-reset.tsx'
import { template as socialPostSuggestion } from './social-post-suggestion.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'system-test': systemTest,
  'welcome': welcome,
  'booking-confirmation': bookingConfirmation,
  'payment-receipt': paymentReceipt,
  'contact-confirmation': contactConfirmation,
  'task-assigned': taskAssigned,
  'lead-won': leadWon,
  'payment-failed': paymentFailed,
  'trial-expiring': trialExpiring,
  'subscription-cancelled': subscriptionCancelled,
  'password-changed': passwordChanged,
  'staff-invitation': staffInvitation,
  'form-submission-notify': formSubmissionNotify,
  'workflow-error': workflowError,
  'form-auto-response': formAutoResponse,
  'drip-day2-first-workflow': dripDay2,
  'drip-day5-progress': dripDay5,
  'drip-day10-power-features': dripDay10,
  'drip-day13-final-warning': dripDay13,
  'customer-welcome': customerWelcome,
  'customer-password-reset': customerPasswordReset,
  'social-post-suggestion': socialPostSuggestion,
}

import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

import { template as applicationConfirmation } from './application-confirmation'
import { template as enrollmentConfirmation } from './enrollment-confirmation'
import { template as enrollmentApproved } from './enrollment-approved'

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'application-confirmation': applicationConfirmation,
  'enrollment-confirmation': enrollmentConfirmation,
  'enrollment-approved': enrollmentApproved,
}

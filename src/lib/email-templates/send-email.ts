import * as React from 'react'
import { render } from '@react-email/render'
import { Resend } from 'resend'
import { TEMPLATES } from './registry'

// Server-only: reads RESEND_API_KEY. Never import from client components.

const SITE_NAME = "The Mandarin League"
const FROM_DOMAIN = "themandarinleague.bond"

export type SendTemplateEmailResult =
  | { sent: true }
  | { sent: false; reason: 'recipient_suppressed' | string }

export interface SendTemplateEmailOptions {
  templateData?: Record<string, any>
  idempotencyKey?: string
  replyTo?: string
}

/**
 * Renders a registered template and sends it through Resend API.
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {}
): Promise<SendTemplateEmailResult> {
  const apiKey = process.env['RESEND_API_KEY'] || process.env['LOVABLE_API_KEY']
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  const template = TEMPLATES[templateName]
  if (!template) {
    throw new Error(
      `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`
    )
  }

  const recipient = template.to || to
  if (!recipient) {
    throw new Error('Recipient is required (the template defines no fixed recipient)')
  }

  const templateData = options.templateData ?? {}
  const element = React.createElement(template.component, templateData)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  const fromEmail = process.env['RESEND_FROM'] || `${SITE_NAME} <noreply@${FROM_DOMAIN}>`
  const resend = new Resend(apiKey)

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: recipient,
      subject,
      html,
      text,
      replyTo: options.replyTo,
      headers: options.idempotencyKey ? { 'X-Entity-Ref-ID': options.idempotencyKey } : undefined,
    })

    if (error) {
      console.error('[Resend Error]', error)
      return { sent: false, reason: error.message }
    }

    return { sent: true }
  } catch (error) {
    console.error('[Resend Exception]', error)
    throw error
  }
}

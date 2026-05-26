import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendInviteEmail({
  to,
  inviterName,
  documentTitle,
  inviteUrl,
  role,
}: {
  to: string
  inviterName: string
  documentTitle: string
  inviteUrl: string
  role: 'viewer' | 'editor'
}) {
  return resend.emails.send({
    from: 'Typewriter <onboarding@resend.dev>',
    to,
    subject: `${inviterName} shared a document with you`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #111111;">
        <h1 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Document shared with you</h1>
        <p style="color: #6B6B6B; margin-bottom: 24px;">
          <strong style="color: #111111;">${inviterName}</strong> has invited you to ${role === 'editor' ? 'edit' : 'view'}
          the document <strong style="color: #111111;">"${documentTitle}"</strong> on Typewriter.
        </p>
        <a href="${inviteUrl}"
           style="display: inline-block; background: #111111; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 500;">
          Open document
        </a>
        <p style="color: #AAAAAA; font-size: 12px; margin-top: 32px;">
          This invitation expires in 7 days. If you don't have a Typewriter account, you'll be prompted to create one.
        </p>
      </body>
      </html>
    `,
  })
}

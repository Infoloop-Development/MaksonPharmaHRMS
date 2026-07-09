# MAMS — On-Prem SMTP Setup (Welcome Emails)

Welcome emails are sent automatically when an administrator creates a user via **Settings → Users** or **Admin Console → Users & roles**. The email includes the login address, temporary password, sign-in link, and first-time password-change instructions. Branding (logo, company name, colors) comes from **Organization** settings.

**Bug reporting emails** (same SMTP / local dev outbox):

| Event | Who receives email |
|-------|-------------------|
| New bug submitted | All active users with **manage bug reports** permission (IT Admins) |
| Bug assigned | Assignee |
| Bug resolved | Original reporter |
| @mention on bug comment | Mentioned IT Admin |

## Prerequisites

- Node API running (`mams-server`) with PM2 or similar
- An internal SMTP relay or corporate mail server reachable from the MAMS server
- `PUBLIC_APP_URL` set to the URL users open in their browser (e.g. `https://mams.yourcompany.com`)

## Configure `mams-server/.env`

```env
MAIL_ENABLED=true
PUBLIC_APP_URL=https://mams.yourcompany.com

SMTP_HOST=mail.yourcompany.internal
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=mams-notify@yourcompany.com
SMTP_PASS=your-smtp-password
SMTP_FROM=MAMS <noreply@yourcompany.com>
```

| Variable | Purpose |
|----------|---------|
| `MAIL_ENABLED` | Must be `true` to send welcome emails |
| `PUBLIC_APP_URL` | Login link in email (`{url}/login`) |
| `SMTP_HOST` / `SMTP_PORT` | Your mail relay |
| `SMTP_SECURE` | `true` for port 465 (TLS); `false` for STARTTLS on 587 |
| `SMTP_USER` / `SMTP_PASS` | Optional if relay allows unauthenticated send from LAN |
| `SMTP_FROM` | From address shown to recipients |

## Apply and restart

```bash
cd /opt/mams/current
pm2 restart mams-server
```

## Test

1. Sign in as Organization Admin.
2. Open **Users & roles** → **Add User**.
3. If SMTP is configured, the modal shows: *"A branded welcome email… will be sent."*
4. Create a test user with a real inbox you can check.
5. Confirm the email includes your company logo (if uploaded in Organization settings), credentials, and **Sign in to MAMS** button.

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| Modal says email not configured | `MAIL_ENABLED` is not `true`; restart server after changing `.env` |
| User created but no email | Check `/var/log/mams/server-error.log` for `welcome_email_failed` |
| Wrong login link in email | `PUBLIC_APP_URL` must match the browser URL (no trailing slash) |
| Logo missing in email | Upload logo under **Settings → Brand Assets**; logo is embedded from org settings |
| Toast: welcome email could not be sent | SMTP host, port, credentials, or firewall — see server logs |

## Security notes

- Welcome emails contain the temporary password in plain text (required for first login).
- Users are forced to change password on first sign-in (`mustChangePassword`).
- Rotate SMTP credentials if `.env` was shared in a handoff package.

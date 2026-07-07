# Secret rotation after handoff exposure

If a `.env` file containing real credentials was included in a zip, repo clone, or other handoff, treat those secrets as compromised and rotate them immediately.

## MongoDB Atlas

1. Sign in to [MongoDB Atlas](https://cloud.mongodb.com/) → your project → **Database Access**.
2. Edit the database user used by `MONGO_URI` → **Edit Password** → generate a new strong password.
3. Update `MONGO_URI` in production (Render/host) and local `.env` with the new password.
4. Restart the API so it reconnects with the new URI.
5. Review Atlas **Network Access** and **Database Access** audit logs for unexpected connections.

## JWT secrets

1. Generate new secrets (32+ bytes, base64):

   ```bash
   openssl rand -base64 32
   ```

2. Set new values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in production and local `.env`.
3. Restart the API.
4. **All users must sign in again** — existing access and refresh tokens become invalid.

## Other tokens (if present in `.env`)

- `COMPLIANCE_AUTOGEN_CRON_SECRET` — rotate and update the cron job header.
- SMTP credentials — rotate in your mail provider if they were exposed.
- Device `pushToken` / `apiKey` values stored in MongoDB — regenerate in Hanvon/eSSL admin and update device records.

## Prevention

- Never commit `.env`; use `.env.example` with placeholders only.
- Do not ship handoff archives that include `.env`.
- Run `git log --all -- .env` to confirm `.env` was never committed; if it was, rotate secrets and consider `git filter-repo` after legal/ops approval.

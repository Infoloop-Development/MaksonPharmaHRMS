# Enable outgoing email for MAMS (Microsoft 365 / Outlook)

**For:** IT or whoever manages `makson-group.com` email in Microsoft 365  
**Purpose:** Let the **MAMS HR system** send automatic welcome emails when a new user is created  
**Sender mailbox:** `noreply@makson-group.com`  
**App password name already created:** `SMTP Emailing`

MAMS is **not** asking for access to anyone’s personal inbox. It only needs permission for **one system mailbox** to **send** emails.

---

## What we are seeing (error)

When MAMS tries to send mail, Microsoft returns:

> **535 5.7.139 — Authentication unsuccessful. User is locked by your organization’s security defaults policy.**

This means: the app password is fine, but **Microsoft 365 is blocking SMTP sign-in** for that mailbox.  
Please complete the steps below.

---

## Step 1 — Sign in to Microsoft 365 Admin

1. Open a browser and go to: **https://admin.microsoft.com**
2. Sign in with an **administrator** account (not a normal employee account).

---

## Step 2 — Turn on “Authenticated SMTP” for the mailbox

This allows `noreply@makson-group.com` to send mail through `smtp.office365.com`.

### Option A (new admin center)

1. Go to **Users** → **Active users**
2. Click **`noreply@makson-group.com`**
3. Open the **Mail** tab (or **Manage email apps**)
4. Find **Authenticated SMTP** (sometimes called **SMTP AUTH**)
5. Turn it **ON** / **Enabled**
6. **Save**

### Option B (Exchange admin center)

1. Go to **https://admin.exchange.microsoft.com**
2. **Recipients** → **Mailboxes**
3. Click **`noreply@makson-group.com`**
4. **Mailbox** → **Manage email apps settings** (or **Email apps**)
5. Enable **Authenticated SMTP**
6. **Save**

---

## Step 3 — Security Defaults (important)

If **Security defaults** is ON for the whole company, it often **blocks SMTP** even after Step 2.

An admin must do **one** of these:

### Choice 1 — Recommended for one system mailbox

1. In **Microsoft 365 Admin** → **Identity** → **Overview** (or **Azure AD** → **Properties**)
2. Check if **Security defaults** is **On**
3. If yes, either:
   - Turn **Security defaults** **Off** (only if your company policy allows), **or**
   - Ask your Microsoft partner / IT lead to add an **exception** so `noreply@makson-group.com` can use SMTP

### Choice 2 — Use an SMTP relay instead

If you do **not** want to allow SMTP AUTH, set up an **internal SMTP relay** that accepts mail from the MAMS server and sends it through Exchange.  
Then send us:

- Relay server name (e.g. `mail.makson-group.internal`)
- Port (often `25` or `587`)
- Whether username/password is required

We will put those details in the MAMS server configuration.

---

## Step 4 — Confirm the mailbox is set up correctly

Please confirm:

| Check | Should be |
|-------|-----------|
| Mailbox exists | `noreply@makson-group.com` |
| Mailbox type | **User mailbox** with a license (not only a shared mailbox without send rights) |
| MFA | Can stay on — we use an **app password**, not the normal password |
| App password | Name: **SMTP Emailing** — regenerate if you changed SMTP settings |

---

## Step 5 — Test (optional, for IT)

After saving changes, wait **15–30 minutes** (Microsoft sometimes needs time).

**Settings MAMS will use (for your reference):**

| Setting | Value |
|---------|--------|
| SMTP server | `smtp.office365.com` |
| Port | `587` |
| Encryption | STARTTLS (not SSL on port 465) |
| Username | `noreply@makson-group.com` |
| Password | App password **SMTP Emailing** (not the normal login password) |

---

## Step 6 — Tell us when done

Reply with:

- [ ] Authenticated SMTP is **ON** for `noreply@makson-group.com`
- [ ] Security defaults updated **or** SMTP relay details provided
- [ ] App password **SMTP Emailing** is still valid (or send a new one securely — not by group chat)

We will test again from MAMS.

---

## What MAMS sends (so you know it is legitimate)

Only **welcome emails** when HR creates a new user:

- Login email address  
- Temporary first-time password  
- Link to sign in  
- Instruction to change password on first login  

No marketing, no bulk mail, no access to read other people’s email.

---

## If you cannot enable SMTP AUTH

That is OK. Tell us and provide either:

1. **SMTP relay** details (see Step 3 Choice 2), or  
2. Another approved **outbound email service** (host, port, username, password, from address)

We will configure MAMS to use that instead.

---

## Contact

**System:** MAMS (Makson Attendance Management System)  
**Mailbox:** `noreply@makson-group.com`  
**Error code:** `535 5.7.139` (Security defaults / SMTP AUTH blocked)

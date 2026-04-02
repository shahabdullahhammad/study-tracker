# Go-live checklist — do these in order

Your **live site** is **https://primestudytracker.vercel.app**. It talks to **production Convex**: **`beaming-opossum-343`**.

Local development (`npm run dev`) can use a **different** Convex deployment (**`artful-penguin-599`**) from `.env.local`. OAuth apps need the **correct redirect URL for each environment** you use.

---

## Step 1 — Open the right places (bookmarks)

| What | Link |
|------|------|
| Convex Dashboard | https://dashboard.convex.dev |
| Your live app | https://primestudytracker.vercel.app |
| Vercel project (env vars) | htt   ps://vercel.com → your team → **study-tracker** → **Settings** → **Environment Variables** |

---

## Step 2 — Confirm Vercel has these (Production)

In **Vercel → study-tracker → Settings → Environment Variables** (filter **Production**):

| Name | Should be (production Convex) |
|------|--------------------------------|
| `VITE_CONVEX_URL` | `https://beaming-opossum-343.convex.cloud` |
| `VITE_CONVEX_SITE_URL` | `https://beaming-opossum-343.convex.site` |

If you change them, trigger a **Redeploy** (Deployments → … → Redeploy).

---

## Step 3 — Convex production: what’s already there

In **Convex Dashboard** → project **study-tracker** → **Deployments** → select **Production** (`beaming-opossum-343`) → **Settings** → **Environment Variables**, you should already see things like:

- `SITE_URL` = `https://primestudytracker.vercel.app`
- `JWT_PRIVATE_KEY` and `JWKS` (do not delete)
- Optional: `ALLOW_CLIENT_DEBUG_LOGS` (debugging only)

---

## Step 4 — OAuth: use the PRODUCTION callback host

For **sign-in on the live Vercel app**, every provider’s **redirect / callback URL** must use:

**ossum-343.convex.site`**

(not `artful-penguin-599`, not `vercel.app` — Convex Auth uses the `.convex.site` URL for OAuth.)

Copy these **exact** lines into each provider:

**Google — Authorized redirect URI**
`https://beaming-op
```
https://beaming-opossum-343.convex.site/api/auth/callback/google
```

**GitHub — Authorization callback URL**

```
https://beaming-opossum-343.convex.site/api/auth/callback/github
```

**Discord — Redirect**

```
https://beaming-opossum-343.convex.site/api/auth/callback/discord
```

**GitHub only — Homepage URL**

```
https://primestudytracker.vercel.app
```

---

## Step 5 — Create or update OAuth apps (browser only — you must log in)

Do this in each provider’s console (you cannot skip logging in):

1. **Google** — [Google Cloud Console](https://console.cloud.google.com/)
   - If Google asks for the **OAuth consent screen** first (**App name**, **User support email**):
     - **App name:** `PRIME Study Tracker` (or any name you like).
     - **User support email:** pick **your own Gmail** from the dropdown (required).
     - Later steps may ask for **Developer contact email** — use the same email.
     - While the app is in **Testing**, add **your Gmail** under **Test users** so you can sign in.
   - Then: **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID** → type **Web application** → add the **Google** redirect URI from Step 4 → save → copy **Client ID** and **Client secret**.

2. **GitHub** — [GitHub → Settings → Developer settings → OAuth Apps](https://github.com/settings/developers) → your app (or create one) → set **Homepage URL** and **Authorization callback URL** → copy **Client ID** and generate **Client secret**.

3. **Discord** — [Discord Developer Portal](https://discord.com/developers/applications) → your app → **OAuth2** → add **Redirect** → enable scopes **identify** and **email** → copy **Client ID** and **Client secret**.

*(More detail: see `OAUTH_SETUP.md`.)*

---

## Step 6 — Paste secrets into Convex **Production**

Convex Dashboard → **Production** deployment → **Settings** → **Environment Variables** → **Add** (or edit) **exact names**:

| Variable name | Value |
|---------------|--------|
| `AUTH_GOOGLE_ID` | Google Client ID |
| `AUTH_GOOGLE_SECRET` | Google Client secret |
| `AUTH_GITHUB_ID` | GitHub Client ID |
| `AUTH_GITHUB_SECRET` | GitHub Client secret |
| `AUTH_DISCORD_ID` | Discord Application / Client ID |
| `AUTH_DISCORD_SECRET` | Discord Client secret |

You can add **only** the providers you use (e.g. just GitHub).

Save. Wait a minute, then test the live site again.

---

## Step 7 — Test the live app

1. Open **https://primestudytracker.vercel.app** in a private/incognito window.
2. Click **Continue with …** for a provider you configured.
3. You should return **signed in** and see the dashboard.

If it fails: read the error text, then in Convex **Logs** (same deployment) look for auth errors. Most issues are a **wrong redirect URI** (typo or wrong deployment name) or a **secret only set on Dev** but not **Production**.

---

## Step 8 — Optional: local dev with OAuth (`artful-penguin-599`)

Only if you want sign-in to work on **localhost** too:

1. In **Google / GitHub / Discord**, add a **second** redirect URL using **`artful-penguin-599`**:

   `https://artful-penguin-599.convex.site/api/auth/callback/google` (and same for github / discord).

2. In Convex, open the **Development** deployment → **Environment Variables** → add the same `AUTH_*` variables there (or copy from Production if you use the same OAuth apps).

---

## Step 9 — Site owner (optional)

The app treats **`abuabdullah3382@gmail.com`** as site owner (see `convex/admin.ts`). To change that, set **`OWNER_EMAIL`** in Convex **Production** env.

---

## Step 10 — Later: remove debug tooling

When everything works, you can remove client debug logging and the `debugIngest` / `ALLOW_CLIENT_DEBUG_LOGS` setup from the codebase and Convex env (optional cleanup).

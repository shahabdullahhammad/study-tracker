# Sign-in setup — very simple step-by-step

**Which deployment?**

- **Live site (Vercel)** — **https://primestudytracker.vercel.app** — use deployment **`beaming-opossum-343`**. Redirect URLs must start with `https://beaming-opossum-343.convex.site/...`  
- **Local dev** (`npm run dev`) — often **`artful-penguin-599`** from `.env.local` — use `https://artful-penguin-599.convex.site/...` in OAuth if you test sign-in locally.

**Fast ordered checklist:** see **`GO_LIVE_CHECKLIST.md`** in this folder.

The detailed steps below still use **`artful-penguin-599`** as the example name. For production, replace **`artful-penguin-599`** with **`beaming-opossum-343`** everywhere you paste a URL.

This guide is for someone who is **new to computers**. Follow the steps **in order**. Use **Google Chrome** or **Microsoft Edge** (any normal web browser is fine).

---

## Words you will see

- **Website address (URL)** — the line at the **top** of the browser that starts with `https://`. You can click it, select all, and copy.
- **Copy and paste** — select text with the mouse, press **Ctrl+C** (hold Ctrl, tap C) to copy. Click where you want it, press **Ctrl+V** to paste.
- **Sign in / Log in** — enter your email and password to open your account.

---

## What you are doing (big picture)

Your study app needs **permission** to sign people in with Google, GitHub, or Discord.  
You will:

1. Open three **separate** websites (Google, GitHub, Discord) and create a small “app” on each.
2. Each site will give you two **secret codes** (Client ID and Client secret).
3. You will put those codes in **Convex** (the backend for this project).

**You do not need to install anything.** Everything is done in the browser.

---

## Numbers you must use (copy exactly)

These are **fixed** for this project. When a form asks for a **redirect URL** or **callback URL**, use the right line below.

**Google — paste this one line only (when asked for “Authorized redirect URI”):**

```
https://artful-penguin-599.convex.site/api/auth/callback/google
```

**GitHub — paste this one line (when asked for “Authorization callback URL”):**

```
https://artful-penguin-599.convex.site/api/auth/callback/github
```

**Discord — paste this one line (when asked for “Redirect”):**

```
https://artful-penguin-599.convex.site/api/auth/callback/discord
```

**Homepage for GitHub (when asked for “Homepage URL”):**

```
https://primestudytracker.vercel.app
```

Do **not** add a space at the start or end. Do **not** change `https` to `http`.

---

# Part A — Open Convex (where the secrets go)

You will come back here **after** each provider (Google, GitHub, Discord).

### Step A1 — Open Convex in the browser

1. Go to: **https://dashboard.convex.dev**
2. **Sign in** with the same account you used for this project (email + password or Google).

### Step A2 — Open your project

1. You should see a list of projects. Click the one named like **study-tracker** (or the project you use for this app).

### Step A3 — Open Environment Variables

1. On the left side of the screen, find **Settings** and click it.
2. Click **Environment Variables** (under Settings).

### Step A4 — How to add one variable

1. You will see a button like **Add** or **Add variable**. Click it.
2. You will type a **Name** (exact letters, no spaces) and a **Value** (the secret from Google, GitHub, or Discord).
3. Choose **Production** (or “All” / “Production and Development” if your screen offers that) so the live site can use it.
4. Click **Save**.

**Repeat** Part A whenever this guide says “add these to Convex.”

---

# Part B — Google (sign in with Google)

Do this **only** if you want a **Continue with Google** button to work.

### Step B1 — Open Google Cloud

1. In the browser, open: **https://console.cloud.google.com**
2. Sign in with your **Google** account (the same Gmail you use is fine).

### Step B2 — Create or pick a project

1. Near the top, you may see a **project name** or “Select a project.” Click it.
2. Click **New Project**.
3. **Project name:** type anything, for example `Study Tracker`.
4. Click **Create**.
5. Wait until it finishes, then make sure this new project is **selected** (you see its name at the top).

### Step B3 — Turn on the Google login screen (consent screen)

1. Open the **menu** (three lines ☰) on the top left if you need it. Go to:  
   **APIs & Services** → **OAuth consent screen**
2. If it asks **User Type**, choose **External** (unless you use Google Workspace for a company — then ask your admin).
3. Click **Create**.
4. **App name:** type `Study Tracker` (or any name).
5. **User support email:** pick your email from the list.
6. **Developer contact email:** your email.
7. Click **Save and Continue** until you can click **Back to Dashboard** or finish the steps.  
   If it asks for **Scopes**, you can **Save and Continue** without adding extra scopes.  
   If it asks for **Test users**, click **Add users** and add **your own Gmail** so you can test while the app is in “Testing” mode.

### Step B4 — Create the OAuth client

1. In the left menu, click **Credentials**.
2. Click **Create Credentials** at the top.
3. Click **OAuth client ID**.
4. If it says you must configure the consent screen first, go back to Step B3.

### Step B5 — Choose “Web application”

1. **Application type:** choose **Web application**.
2. **Name:** type `Study Tracker Web` (any name is fine).

### Step B6 — Add the redirect address

1. Find **Authorized redirect URIs** (or “Authorized redirect URLs”).
2. Click **Add URI** or **+ ADD URI**.
3. **Paste** this **exact** line (use Ctrl+V):

```
https://artful-penguin-599.convex.site/api/auth/callback/google
```

4. Click **Create** (or **Save**).

### Step B7 — Copy the two codes

1. A box will show **Your Client ID** and **Client secret**.
2. **Copy** the Client ID first. Keep this tab open or paste it into Notepad temporarily.
3. **Copy** the Client secret.

### Step B8 — Put them in Convex

1. Go back to **Convex** → **Settings** → **Environment Variables** (Part A).
2. Add a variable:
   - **Name:** `AUTH_GOOGLE_ID`  
   - **Value:** paste your **Client ID**
3. Add another variable:
   - **Name:** `AUTH_GOOGLE_SECRET`  
   - **Value:** paste your **Client secret**
4. Save both. Use **Production** (or all environments).

---

# Part C — GitHub (sign in with GitHub)

### Step C1 — Sign in to GitHub

1. Open: **https://github.com**
2. Sign in. If you have no account, click **Sign up** and create one first.

### Step C2 — Open OAuth Apps

1. Click your **profile picture** (top right) → **Settings**.
2. Scroll the **left** menu all the way down.
3. Click **Developer settings**.
4. Click **OAuth Apps**.

### Step C3 — Register a new app

1. Click **New OAuth App** (or **Register a new application**).

### Step C4 — Fill every box on the form

GitHub shows **four** main fields. Use **exactly** this:

| Field on GitHub | What to type or paste |
|-----------------|------------------------|
| **Application name** | `PRIME Study Tracker` |
| **Homepage URL** | `https://primestudytracker.vercel.app` |
| **Application description** | `Study tracker web app — sign-in with GitHub.` (You can copy that whole sentence, or write any short description. It is only shown to you on GitHub, not to users.) |
| **Authorization callback URL** | `https://artful-penguin-599.convex.site/api/auth/callback/github` |

**Copy-paste block for the callback (must match exactly):**

```
https://artful-penguin-599.convex.site/api/auth/callback/github
```

1. Click inside **Application name** → type: `PRIME Study Tracker`
2. Click inside **Homepage URL** → paste: `https://primestudytracker.vercel.app`
3. Click inside **Application description** → paste: `Study tracker web app — sign-in with GitHub.`
4. Click inside **Authorization callback URL** → paste the long `https://artful-penguin-599...` line above.
5. Click **Register application** (green button at the bottom).

### Step C5 — Copy Client ID and create a secret

1. You will see **Client ID**. **Copy** it.
2. Click **Generate a new client secret**.
3. **Copy** the new **Client secret** right away (you might not see it again).

### Step C6 — Put them in Convex

1. Convex → **Settings** → **Environment Variables**.
2. Add:
   - **Name:** `AUTH_GITHUB_ID` → **Value:** GitHub Client ID  
   - **Name:** `AUTH_GITHUB_SECRET` → **Value:** GitHub Client secret  
3. Save. Use **Production**.

---

# Part D — Discord (sign in with Discord)

### Step D1 — Sign in to Discord

1. Open: **https://discord.com** and log in (browser is fine).

### Step D2 — Open the Developer Portal

1. Open: **https://discord.com/developers/applications**
2. Log in if asked.

### Step D3 — Create an application

1. Click **New Application**.
2. **Name:** type `Study Tracker` (or any name).
3. Click **Create**.

### Step D4 — Add the redirect

1. On the **left**, click **OAuth2**.
2. Click **General** if you see it under OAuth2.
3. Find **Redirects** (or “Redirect URLs”).
4. Click **Add Redirect** (or **Add Redirect URL**).
5. Paste:

```
https://artful-penguin-599.convex.site/api/auth/callback/discord
```

6. Click **Save Changes** at the bottom if there is a save button.

### Step D5 — Copy Client ID and secret

1. Still under **OAuth2**, find **Client ID**. **Copy** it.
2. Find **Client Secret**. Click **Reset Secret** or **View** if needed, then **copy** the secret.

### Step D6 — Turn on the right permissions (scopes)

1. On the left, still under **OAuth2**, open **URL Generator** (if your screen has it).
2. Under **Scopes**, check:
   - **identify**
   - **email**
3. You do not need to use the generated URL for this project — Convex handles login. The important part is that the app can read basic profile info.

### Step D7 — Put them in Convex

1. Convex → **Settings** → **Environment Variables**.
2. Add:
   - **Name:** `AUTH_DISCORD_ID` → **Value:** Discord **Client ID** (same as “Application ID” on the **General Information** page for your app).
   - **Name:** `AUTH_DISCORD_SECRET` → **Value:** Discord **Client secret**
3. Save. Use **Production**.

---

# Part E — Check that it works

### Step E1 — Wait a short time

1. After saving variables in Convex, wait **1–2 minutes** (sometimes it is instant).

### Step E2 — Open your app

1. Open: **https://primestudytracker.vercel.app**
2. Click **Continue with Google** (or GitHub / Discord).
3. You should see that provider’s login page, then return to the app **signed in**.

### Step E3 — If something fails

1. Read the **error message** on the screen (take a photo if needed).
2. Go back and check that **every redirect URL** matches **exactly** the lines in this guide (no typo, no extra space).
3. In Convex, check that **names** are exactly:  
   `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`.
4. In Google, if the app is in **Testing**, your Gmail must be listed under **Test users**.

---

## You can skip providers you do not need

- Only **Google** → do Part B only.  
- Only **GitHub** → Part C only.  
- Only **Discord** → Part D only.

---

## Already done for you (do not change unless you know why)

These are set on Convex by the developer. **Do not** paste Google/GitHub/Discord codes into these names:

- `SITE_URL`
- `JWT_PRIVATE_KEY`
- `JWKS`

If sign-in worked before and broke after changing those, ask the person who maintains the project.

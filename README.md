# Dom the Don · Viewer Games

A [Wheel of Names](https://wheelofnames.com/)-style spinner built for TikTok LIVE, with:

- Dom the Don maroon / black / gold wheel theme
- Email + password operator login
- Private **Display URL** (OBS-friendly) only visible when logged in
- **TikFinity** webhook so chat `!enter` adds viewers to the next round
- Shuffle, clear round, weighted entries (`@name:2`), remove-winner, spin sync, winner history

## Stack

- Next.js (App Router)
- Auth.js (NextAuth) credentials
- Prisma + PostgreSQL
- Railway-ready (`railway.toml`)

## Local setup

1. Copy env file:

```bash
cp .env.example .env
```

2. Set `DATABASE_URL` to a Postgres database and generate a secret:

```bash
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Put that value in `AUTH_SECRET`.

3. Install + migrate + run:

```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000), register an operator account, open the dashboard.

## Railway + GitHub

1. Push this repo to GitHub.
2. In Railway → **New Project** → **Deploy from GitHub repo**.
3. Add a **PostgreSQL** plugin and link it (sets `DATABASE_URL`).
4. Add variables:

| Variable | Value |
|---|---|
| `AUTH_SECRET` | long random string |
| `AUTH_URL` | your Railway public URL, e.g. `https://xxx.up.railway.app` |

5. Deploy. First boot runs `prisma migrate deploy`.

## TikFinity `!enter` setup

1. Log into the dashboard and copy the **TikFinity webhook** URL.
2. In TikFinity → **Actions & Events** → create Action → **Trigger Webhook**.
3. Paste the webhook URL (includes `?secret=...`).
4. Optional JSON body:

```json
{
  "secret": "<same secret from dashboard>",
  "username": "%username%",
  "nickname": "%nickname%",
  "userId": "%userId%"
}
```

5. Create Event → chat command `!enter` → trigger that action.

Viewers typing `!enter` are added to the next round. Use **Clear round** between games.

## Display URL (streamer / OBS)

On the logged-in dashboard, copy **Display URL** and add it as a Browser Source in OBS.  
That page is wheel-only (no admin controls). Rotate the link anytime from the dashboard.

## Main operator features

- Edit entries (one per line) and **Update**
- Weighted entries: `@user:3`
- **Shuffle** / **Clear round**
- **Spin** (also click the wheel)
- Remove winner after spin (toggle)
- Duplicate `!enter` as extra weight (toggle)
- Spin duration
- Recent winners list
- Rotate display URL + webhook secret

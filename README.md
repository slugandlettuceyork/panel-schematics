# Electrical Panel Schematic Site

A small static site that shows your distribution boards as clickable schematics.
Anyone with the link (or the QR code) can view circuit notes; one shared login
can edit them. Built for exactly your situation: poorly/inconsistently labelled
panels, multiple boards, more boards coming later.

## What's in here

```
index.html            — directory of all panels + search across everything
panel.html             — the actual schematic (?p=slug picks which panel)
reset-password.html    — where the "forgot password" email link lands
assets/panels-data.js  — the fixed schematic layout (positions, printed labels, phase)
assets/app.js          — Supabase connection, login, search, the popup logic
assets/style.css        — styling
supabase-schema.sql    — run once in Supabase to set up the notes table
```

Nothing here is a build step — it's plain HTML/JS. You can open `index.html`
directly, or host the whole folder as-is.

## 1. Create your Supabase project

Use your **new work account**, not any account already connected here.

1. Go to supabase.com → New project. Free tier is plenty for this.
2. Once it's created, open **SQL Editor** → paste the contents of
   `supabase-schema.sql` → Run. This creates the `circuit_notes` table
   and the security rules (anyone can read, only signed-in users can write).
3. Go to **Authentication → Users → Add user**. Create *one* login for
   editing, e.g. `edits@yourcompany.com` with a password of your choice.
   This is the single shared "edit mode" login for the whole site.
4. Go to **Settings → API**. Copy the **Project URL** and the **anon public**
   key.
5. Open `assets/app.js` and paste them in at the top:
   ```js
   const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1...(long string)";
   ```

## 2. Password reset (email)

Supabase Auth has this built in — `reset-password.html` handles it.

1. In Supabase: **Authentication → URL Configuration** → add the URL you'll
   host this site at (e.g. `https://yourname.github.io/panels/`) to
   **Redirect URLs**.
2. On any panel page, click a breaker → "Sign in to edit" → "Forgot password?"
   → enter the editor email → Supabase sends a reset link → it opens
   `reset-password.html` on your live site → set a new password.
3. By default Supabase sends these emails from its own shared sender, which
   works fine for a low-volume internal tool like this. If you want it to
   come from your own domain later, Supabase's **Authentication → Email
   Templates / SMTP Settings** lets you plug in your own mail provider —
   optional, not needed to get started.

## 3. Hosting

Any static host works — GitHub Pages, Netlify, Cloudflare Pages, or your
own server. Simplest options:

- **GitHub Pages**: push this folder to a repo, enable Pages on the `main`
  branch, done. URL will be `https://<you>.github.io/<repo>/`.
- **Netlify**: drag-and-drop the folder onto app.netlify.com/drop.

Whichever URL you end up with, that's what your QR code should point to
(the `index.html` directory page, or straight to a specific
`panel.html?p=bar-kitchen` if you want a QR code per board on the actual
cabinet doors — handy, since then scanning the code on Board B opens Board B
directly).

## 4. Adding your 2 extra panels later

No new files needed. Open `assets/panels-data.js` and add a new entry to
the `PANELS` object, following the pattern of the existing ones — a slug,
a title, and a `circuits` array. It'll automatically show up on the
directory page and be reachable at `panel.html?p=your-new-slug`.

## About the data already in here

I transcribed the four boards from your photos as best I could — printed
labels are used as-is. Anything handwritten, crossed out, or ambiguous is
marked with an orange **verify** badge and a note explaining what's
uncertain, rather than me guessing. A few things worth checking first:

- **Bar & Kitchen board**: two breakers with no printed label, near
  handwritten "MICROWAVE" and "MICROWAVE 2" — position of these two on the
  actual panel should be double-checked.
- **Cellar / Board B**: handwritten note top-right reads "NEW CELLAR 'DB' 'E'"
  — may be this board's real name/ID.
- **Office/Comms board**: breaker 2 has a typed "Cct. Unidentified" label
  with "FIRE ALARM" written above it, while breaker 6 is typed "Fire Alarm"
  — worth confirming which one actually is the fire alarm circuit.
- **Mains/HVAC board**: the "Kitchen Fryer" group has two breakers (C16 +
  C40) and some illegible handwriting alongside — worth a quick check.

None of this blocks using the site — it's exactly what the notes field is
for. Fill in the real answers as you (manually, safely) verify each circuit,
and the "verify" badge is just there so nobody mistakes a guess for a
confirmed fact until it's been checked.

## Safety note

This tool is documentation only. It does not control anything and has no
way to know the true live state of any circuit. Always confirm a circuit is
dead with a proving unit / meter before working on it, regardless of what
any label — printed, handwritten, or in this site — says.

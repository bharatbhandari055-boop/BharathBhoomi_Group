# Bharath Bhoomi — connected website + admin dashboard

A single Node.js app that serves:
- `/` — your public site (fetches content live from the database)
- `/admin` — your admin dashboard (edit content, photo, products, view customers — changes appear on the live site immediately)

## 1. Deploy to Render (recommended, has a free tier)

1. Create a free account at https://render.com
2. Push this folder to a GitHub repository (or use Render's "Deploy from a Git repo" flow — a public or private repo both work).
3. In Render: **New → PostgreSQL** → create a free database. Copy its **Internal Database URL**.
4. In Render: **New → Web Service** → connect your repo.
   - Build command: `npm install`
   - Start command: `npm start`
5. Under **Environment**, add these variables:
   - `DATABASE_URL` = the Postgres URL from step 3
   - `JWT_SECRET` = any long random string (e.g. generate one at https://www.uuidgenerator.net)
   - `ADMIN_USERNAME` = your chosen admin username
   - `ADMIN_PASSWORD` = your chosen admin password
6. Deploy. Once it's live, open Render's **Shell** tab for this service and run:
   ```
   npm run seed
   ```
   This creates your admin login using `ADMIN_USERNAME`/`ADMIN_PASSWORD`. Run it again any time to change the password.
7. Visit `https://your-app.onrender.com` for the site, and `/admin` for the dashboard.

## 2. Point your domain at it

In Render, open your Web Service → **Settings → Custom Domains** → add your domain, then update your domain's DNS records as Render instructs (usually a CNAME). This can take a few minutes to a few hours to go live.

## 3. Using the admin dashboard

Go to `https://yourdomain.com/admin`, sign in with the username/password from step 5, and edit:
- **Content** — headline, about text, tags, contact details
- **Photo** — the hero image
- **Products** — add, remove
- **Customers** — every real contact-form submission from your site appears here automatically, plus you can log entries manually

Every change saves straight to the database and appears on the live site immediately — no re-uploading files.

## Local development (optional)

```
cp .env.example .env   # fill in a local Postgres URL, or use a free one from Render/Neon/Supabase
npm install
npm run seed
npm start
```
Then visit http://localhost:3000 and http://localhost:3000/admin.

## Notes

- Passwords are hashed (bcrypt); sessions use signed tokens (JWT) that expire after 7 days.
- The hero photo is stored directly in the database as the uploaded image — no extra file storage needed.
- To add a second admin login later, run `npm run seed` again with different `ADMIN_USERNAME`/`ADMIN_PASSWORD` values.

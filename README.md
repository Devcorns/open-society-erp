# Open Society ERP (open-society-erp)

Open Society ERP is a multi-tenant society/residential management platform (SaaS-style) combining a Node.js + Express + MongoDB backend with an Angular frontend. It includes features for tenants, users, maintenance billing, complaints, visitors, inventory, parking, subscriptions (Stripe), and platform-level admin tooling.

## Features

- Multi-tenancy and role-based access control (Platform Owner, Super Admin, Society Admin, Sub Admin, User)
- Authentication with JWT (access + refresh tokens)
- Stripe integration for subscription billing
- Core modules: Residents, Maintenance, Complaints, Visitors, Inventory, Parking, Subscriptions, Analytics
- Seed script to populate demo data and sample accounts

## Quickstart (local)

1. Backend

- Copy `backend/.env.example` to `backend/.env` and update values (MongoDB URI, Stripe keys, JWT secrets).
- Install and run:

```powershell
cd backend
npm install
npm run seed   # optional: seeds demo data
npm start
```

Default backend port: `5000` (see `backend/.env`).

2. Frontend

```powershell
cd frontend
npm install
npx ng serve --proxy-config proxy.conf.json --open
```

Frontend runs at `http://localhost:4200` and proxies `/api` to the backend.

## Demo credentials

- Platform Owner: `owner@societytracker.com` / `PlatformOwner@2024!`
- Super Admin: `superadmin@societytracker.com` / `SuperAdmin@2024!`
- Society Admin: `admin@greenvalley.com` / `SocietyAdmin@2024!`
- Resident: `ankit@resident.com` / `Resident@2024!`

## Notes

- Do NOT commit real secrets. Keep `.env` files out of Git history (see `.gitignore`).
- If you plan to push this repository to GitHub, create a new remote repository (for example `devcorns/open-society-erp`) and push the `main` branch.

## Useful commands to push to GitHub

Using the GitHub CLI (`gh`):

```bash
gh auth login
gh repo create devcorns/open-society-erp --public --description "Open-source Society ERP" --confirm
git branch -M main
git remote add origin https://github.com/devcorns/open-society-erp.git
git push -u origin main
```

Or using `curl` + PAT to create the repo, then push:

```bash
curl -H "Authorization: token <YOUR_PAT>" -d '{"name":"open-society-erp","private":false}' https://api.github.com/user/repos
# then add remote and push as above
```

## License

MIT

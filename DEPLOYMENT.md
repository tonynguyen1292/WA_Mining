# AWS Deployment Runbook

Deploys the existing `docker-compose.prod.yml` stack (Postgres + FastAPI + nginx-fronted React build) to a single AWS EC2 instance. Chosen deliberately over ECS/RDS/ALB: it's the only architecture here that's genuinely free for a meaningful stretch of time, it reuses images and compose files already built and tested in this repo, and it has the fewest moving parts to tear down cleanly afterward.

**Status: not yet executed.** This machine has no AWS CLI and no AWS credentials configured, so nothing below has been run. Follow it yourself via the AWS Console (steps below assume that), or hand over credentials for it to be run on your behalf — either way, **stop at the "Before you launch anything" cost gate and read it first.**

## Architecture

```
Internet
   │  HTTP :80 only
   ▼
EC2 instance (t2.micro / t3.micro, free-tier eligible)
   └── docker compose -f docker-compose.prod.yml
         ├── frontend (nginx :80) ── proxies /api, /health, /docs → backend:8000
         ├── backend  (FastAPI, internal-only, no host port)
         └── db       (Postgres, internal-only, no host port)
```

Only port 80 (and 22 for your own SSH access) is ever exposed — the nginx `/api` reverse-proxy added for this deployment (see `frontend/nginx.conf`) means the backend and database never need a public port.

## Before you launch anything: cost gate

Per your instruction: **nothing here should incur a charge without you being notified first.** Do these two things before creating any AWS resource:

1. **Check your Free Tier status.** AWS Console → search "Billing" → **Free Tier** page. Confirm you're within the 12-month free tier window (from account creation) and that `t2.micro` or `t3.micro` (whichever your account shows as free-tier-eligible — it varies by account/region) still shows unused hours.
2. **Set a $1 budget alert.** AWS Console → **Billing** → **Budgets** → Create budget → "Zero spend budget" template, your email for alerts. This is itself free and means you get notified the moment anything starts billing, before it shows up on a statement.

What's actually free (first 12 months, one account):
| Resource | Free tier allowance |
|---|---|
| EC2 `t2.micro`/`t3.micro` | 750 hrs/month (i.e. one instance running 24/7) |
| EBS storage (gp2/gp3) | 30 GB |
| Data transfer out | 100 GB/month (across all AWS services combined) |

What can quietly bill even within the free tier:
- An **Elastic IP allocated but not attached to a running instance** bills immediately — either don't allocate one (use the instance's default public IP, which changes on stop/start) or make sure it stays attached.
- Running **more than one instance**, or this instance alongside others, splits your 750 free hours across all of them.
- Anything left running **past the 12-month window**.

## Step 1 — Launch the EC2 instance

Via AWS Console → **EC2** → **Launch instance**:
- AMI: **Ubuntu Server 22.04 LTS** (or Amazon Linux 2023 — commands below assume Ubuntu; Amazon Linux differs slightly, noted where it matters)
- Instance type: `t2.micro` or `t3.micro` — whichever your account's Free Tier page showed as eligible
- Key pair: create a new one, download the `.pem`, keep it somewhere safe (you'll need it for SSH; it can't be re-downloaded)
- Storage: default 8 GB gp3 is fine (well under the 30 GB free allowance)
- Security group — create new, with exactly:
  - SSH (22) from **My IP** only (not 0.0.0.0/0 — no reason to expose SSH to the whole internet)
  - HTTP (80) from **Anywhere (0.0.0.0/0)**
  - Nothing else. No port 8000, no port 5432 — the nginx proxy is the only public entry point.

Launch it, then note the **public IPv4 address** from the instance's detail page — you'll need it for every step below (referred to as `<EC2_IP>`).

## Step 2 — Connect and install Docker

```
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@<EC2_IP>
```

On the instance:

```
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER
```

Log out and back in (`exit`, then SSH again) so the `docker` group membership takes effect.

## Step 3 — Clone and configure

```
git clone https://github.com/tonynguyen1292/WA_Mining.git
cd WA_Mining
export VITE_API_BASE_URL=http://<EC2_IP>
export CORS_ORIGINS=http://<EC2_IP>
```

Replace `<EC2_IP>` with the real address from Step 1. `VITE_API_BASE_URL` is a *build-time* value baked into the static JS bundle, so it must be set before the next step, not after.

## Step 4 — Build, start, and seed

```
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml exec backend python -m app.db.seed
```

The seed step validates as it goes (see `backend/README.md#seeding`) and prints `Seeded 421 sites from Major_Resource_Projects.csv` on success.

## Step 5 — Verify

- `http://<EC2_IP>/` — Dashboard should load with real KPIs (421 total sites, 356 total projects)
- `http://<EC2_IP>/health` — `{"status":"ok"}`
- `http://<EC2_IP>/docs` — interactive API docs

## Updating after a code change

```
cd WA_Mining
git pull
docker compose -f docker-compose.prod.yml up --build -d
```

The database volume (`pg_data_prod`) persists across this — no need to reseed unless the data itself changed.

## Teardown (stop all billing)

```
docker compose -f docker-compose.prod.yml down -v
```

Then in the AWS Console: **EC2** → select the instance → **Instance state** → **Terminate**. If you allocated an Elastic IP, **release** it separately (terminating the instance doesn't automatically release an EIP). Terminating removes the EBS volume too (default behavior for the root volume), so there's nothing left running or billing.

## Not covered here (see root README's Future Improvements)

TLS/custom domain, auto-restart on instance reboot (currently a manual `docker compose up -d` after a stop/start), horizontal scaling, and automated CD (this is a manual runbook, not a pipeline that deploys on every push).

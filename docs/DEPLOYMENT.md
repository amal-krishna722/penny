# Penny: Deployment

How the Penny backend is hosted, how to update it and how to fix it when something breaks. No secrets live in this file. Real keys stay in `backend/.env` locally and on the server only.

---

## 1. Live URLs

| What | URL |
|---|---|
| **Live app (frontend on Vercel)** | `https://penny-chi-one.vercel.app` |
| **API base URL** | `https://45-77-216-120.sslip.io` |
| Health check | `https://45-77-216-120.sslip.io/health` → `{"ok":true}` |
| Interactive API docs | `https://45-77-216-120.sslip.io/docs` |
| iPhone Shortcut endpoint | `https://45-77-216-120.sslip.io/receipt?source=shortcut` |
| Frontend env var | `NEXT_PUBLIC_API_URL=https://45-77-216-120.sslip.io` |

Opening the bare base URL shows `{"detail":"Not Found"}`. That is expected: there is no route at `/`. It still proves the server is reachable.

---

## 2. The server

| Setting | Value |
|---|---|
| Provider | Vultr (paid from the $100 MLH credit) |
| Instance name / hostname | `penny-api` |
| Type and plan | Shared CPU, `vc2-1c-1gb` (1 vCPU, 1 GB RAM, 25 GB SSD) |
| OS | Ubuntu 24.04 LTS x64 |
| Location | New York, US |
| Public IP | `45.77.216.120` |
| Extras | none (Automatic Backups, DDoS protection, VPC all off) |
| Cost | $5.00/mo (about $0.007/hr), drawn from MLH credit |
| Login | `ssh root@45.77.216.120`, SSH key only (password login is off). Only Amal's laptop has a key; to get access, send Amal your public key (`~/.ssh/id_ed25519.pub`). Emergency access: Vultr → instance → View Console. |

**Billing reminder:** the MLH credit expires 30 days after signup. **Destroy the instance** (Vultr → Compute → Instances → penny-api → Destroy) before then. Stopping it is not enough; stopped servers still bill.

---

## 3. How a request reaches the code

```
Browser / iPhone Shortcut / Frontend
        │  HTTPS (port 443)
        ▼
Caddy  (reverse proxy, automatic Let's Encrypt certificate for 45-77-216-120.sslip.io)
        │  HTTP on 127.0.0.1:8000 (internal only)
        ▼
uvicorn running app.main:app  (managed by systemd service "penny")
        │
        ▼
FastAPI app → MongoDB Atlas, Gemini, Nessie
```

- **sslip.io** is a free DNS service: `45-77-216-120.sslip.io` resolves to `45.77.216.120`. It lets Caddy get a real HTTPS certificate without buying a domain.
- **Caddy** handles HTTPS and forwards everything to the app.
- **systemd** keeps the app running, restarts it if it crashes and starts it on reboot.
- uvicorn only listens on `127.0.0.1`, so the app cannot be reached directly from the internet except through Caddy.

---

## 4. Files on the server

| Path | What it is |
|---|---|
| `/root/penny/` | the cloned GitHub repo (`amal-krishna722/penny`) |
| `/root/penny/backend/.venv/` | Python virtual environment |
| `/root/penny/backend/.env` | real API keys (same 7 variables as SPEC section 6) |
| `/etc/systemd/system/penny.service` | systemd service that runs the API |
| `/etc/caddy/Caddyfile` | Caddy config for HTTPS |

### `/etc/systemd/system/penny.service`
```ini
[Unit]
Description=Penny API
After=network.target

[Service]
WorkingDirectory=/root/penny/backend
ExecStart=/root/penny/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

### `/etc/caddy/Caddyfile`
```
45-77-216-120.sslip.io {
    reverse_proxy 127.0.0.1:8000
}
```

### Firewall (ufw)
Open: `22` (SSH), `80` and `443` (Caddy). Port `8000` was opened for the first test and then closed again.

### Environment variables in the server `.env`
`GEMINI_API_KEY`, `NESSIE_API_KEY`, `NESSIE_CUSTOMER_ID`, `NESSIE_ACCOUNT_ID`, `MONGODB_URI`, `API_SECRET`, `FRONTEND_URL`

`FRONTEND_URL` is a comma-separated list of the frontends allowed to call the API (CORS): currently `http://localhost:3000,https://penny-chi-one.vercel.app`. The server and every laptop share the same MongoDB Atlas database, so data seeded or synced locally also shows up on the live API.

---

## 5. Updating the server after a merge to `main`

```bash
ssh root@45.77.216.120
cd ~/penny && git pull
cd backend && source .venv/bin/activate && pip install -r requirements.txt
systemctl restart penny
systemctl status penny        # should say active (running); press q to exit
```
Then check `https://45-77-216-120.sslip.io/health`.

If `.env` gets a new variable, also run `nano /root/penny/backend/.env`, add it and restart.

---

## 6. Common tasks

| Task | Command |
|---|---|
| See if the API is running | `systemctl status penny` |
| Restart the API | `systemctl restart penny` |
| Last 50 lines of API logs | `journalctl -u penny -n 50` |
| Follow API logs live | `journalctl -u penny -f` (Ctrl+C to stop) |
| Restart Caddy | `systemctl restart caddy` |
| Caddy logs | `journalctl -u caddy -n 50` |
| Edit server keys | `nano /root/penny/backend/.env` then `systemctl restart penny` |
| Run the app by hand for debugging | `systemctl stop penny`, then from `backend/` with the venv active: `uvicorn app.main:app --host 127.0.0.1 --port 8000` (restart the service afterwards) |

---

## 7. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| `systemctl status penny` says **failed** | Read `journalctl -u penny -n 50`. Usually a missing `.env` key, a missing package (run `pip install -r requirements.txt`) or a Python error in newly pulled code. |
| HTTPS page does not load | Check `journalctl -u caddy -n 50`. Make sure ports 80 and 443 are open (`ufw status`). |
| Frontend shows **"Failed to fetch"** or a CORS error | The frontend's address must be listed in `FRONTEND_URL` in the server `.env` (comma-separated, e.g. `http://localhost:3000,https://penny-chi-one.vercel.app`). Add it, then `systemctl restart penny`. |
| Shortcut gets `401` | The `X-API-Key` header doesn't match `API_SECRET` in the server `.env`. |
| `git pull` asks for a password | Use a GitHub fine-grained token with Contents: Read-only on the `penny` repo as the password. |
| Bare URL shows `Not Found` | Normal. Use `/health` or `/docs`. Optional: add a redirect from `/` to `/docs` in `main.py` (shared file, ask first). |

---

## 8. The frontend on Vercel

| Setting | Value |
|---|---|
| URL | `https://penny-chi-one.vercel.app` |
| Project | imported from the `amal-krishna722/penny` GitHub repo |
| Root Directory | `frontend` |
| Environment variables | `NEXT_PUBLIC_API_URL=https://45-77-216-120.sslip.io`, `NEXT_PUBLIC_API_SECRET` (same value as `API_SECRET`) |

- **Vercel redeploys by itself** on every push to `main`. Frontend changes go live in a minute or two; nothing to do on the server.
- **Backend changes still need section 5** (pull and restart on the Vultr server).
- If the Vercel URL ever changes, add the new one to `FRONTEND_URL` on the server and restart, or the site shows "Failed to fetch".
- Changing a `NEXT_PUBLIC_` variable in Vercel needs a **redeploy** (Deployments, then Redeploy) to take effect.

---

## 9. For the Devpost write-up (Best Use of Vultr)

The FastAPI backend runs on a Vultr Cloud Compute instance (Ubuntu 24.04, New York) as a systemd service, behind Caddy for automatic HTTPS. The iPhone Shortcut and the Next.js dashboard (deployed on Vercel) both talk to this single public endpoint, and it connects to MongoDB Atlas, Gemini and Capital One's Nessie API.

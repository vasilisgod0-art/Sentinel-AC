# Sentinel AC

A FiveM anticheat system with a backend dashboard and resource integration.

## Project structure

- `backend/` - Express backend that stores alerts, players, bans, and configuration.
- `frontend/` - Browser dashboard UI.
- `resources/sentinel_ac/` - FiveM anticheat resource with client/server detection.

## Requirements

- Node.js 18+ and npm installed on your machine.
- A FiveM server to load the `resources/sentinel_ac` resource.

## Setup

1. Install backend dependencies:

```powershell
cd c:\Users\vasil\Desktop\sentinel-dashboard\backend
npm install
```

2. Start the backend server:

```powershell
npm start
```

3. Open the dashboard in a browser:

- For a hosted deployment, point your domain to the `frontend/` folder and proxy `/api/` requests to `http://localhost:4000`.
- For local testing, you can open `frontend/index.html`, but a real website should serve it from a web server.

## FiveM resource installation

1. Copy the `resources/sentinel_ac` folder into your FiveM server `resources/` directory.
2. Add the following line to `server.cfg`:

```
ensure sentinel_ac
```

3. Start your server.
4. Update `resources/sentinel_ac/config.lua` if your backend is running on a different host or port.

## How it works

- The resource performs periodic client-side checks for teleportation, unauthorized weapons, speed hacks, invisibility, and godmode.
- Alerts are sent to the backend via HTTP.
- The backend stores alerts and bans in a local JSON database.
- The dashboard shows recent alerts, tracked players, ban history, and configuration controls.

## Notes

- This is a starter implementation. Production use should add authentication, secure the API, and harden ban handling.
- The anticheat resource uses basic checks and should be expanded for real-world use.

## Deployment

To use this as a real website, host the backend and frontend on a public server or VPS. You can deploy the backend on Node.js hosting and serve the frontend from the same origin for a clean SaaS-style experience.

Recommended steps:

1. Upload the project to your server.
2. Install Node.js and dependencies:

```bash
cd /path/to/sentinel-dashboard/backend
npm install
```

3. Start the backend with a process manager such as PM2, or use a reverse proxy like Nginx:

```bash
npx pm2 start server.js --name sentinel-backend
```

4. Point your domain to the server and configure Nginx or Apache to serve `frontend/` and proxy API requests to the backend.

### Free deployment with Render

If you want a free public URL without buying a server, you can use Render.com:

1. Create a Render account.
2. Connect your repository to Render.
3. Add `render.yaml` to the project root (already included).
4. Deploy the service.

Render will host the backend and static frontend together if you keep the current Express static file setup.

Example Nginx proxy block:

```nginx
server {
  listen 80;
  server_name your-domain.com;

  root /path/to/sentinel-dashboard/frontend;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:4000/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

5. Update `resources/sentinel_ac/config.lua` if your backend URL is not on the same server.

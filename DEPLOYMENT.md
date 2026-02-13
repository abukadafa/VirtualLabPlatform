# Deploying the Virtual Lab Platform Online

Since the platform is currently running on your local machine, it is not accessible from the public internet by default. To make it available "anywhere," you have two main options:

## Option 1: Temporary Public Access (Local Tunneling)
This is the fastest way to demo the platform online without moving your files to a server.

### 1. Use ngrok (Recommended)
[ngrok](https://ngrok.com/) creates a secure tunnel from your local machine to the internet.

1.  **Download ngrok**: Follow instructions at [ngrok.com](https://ngrok.com/download).
2.  **Authenticate**: Run `ngrok config add-authtoken <YOUR_TOKEN>`.
3.  **Tunnel your Frontend**:
    ```bash
    ngrok http 5173
    ```
    *This will give you a public URL like `https://random-id.ngrok-free.app` that points to your Vite app.*

### 2. Use Cloudflare Tunnel (Free & Secure)
Allows you to use a custom domain if you have one.
1.  Install the `cloudflared` CLI.
2.  Run `cloudflared tunnel --url http://localhost:5173`.

---

## Option 2: Permanent Cloud Deployment (AWS/DigitalOcean/GCP)
For a production environment that stays online 24/7, you should deploy to a Cloud Provider.

### Prerequisites:
- A Virtual Private Server (VPS) with at least 4GB RAM (to handle Docker labs).
- Docker and Docker Compose installed on the VPS.

### Steps:
1.  **Upload the Code**: Use `git` to push your repo to GitHub and then `clone` it onto the server.
2.  **Environment Variables**: Create a `.env` file on the server with production values.
3.  **Run with Docker**:
    ```bash
    docker-compose up -d --build
    ```
4.  **Reverse Proxy**: Set up Nginx or Caddy to handle SSL (HTTPS) and route traffic to your containers.

---

## Important Security Note
> [!WARNING]
> When you expose the platform publicly, anyone with the link can reach your login page. Ensure you have strong passwords for the Admin and Facilitator accounts.

> [!TIP]
> If you choose Option 2, I can help you generate the necessary **Nginx configuration** and **Production Docker Setup**.

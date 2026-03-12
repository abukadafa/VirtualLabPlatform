# 🌐 Deploying the Virtual Lab Platform Online

To make the platform **always accessible** from the internet, you have two primary methods depending on whether you have a dedicated server (VPS) or want to host it from your local machine securely.

---

## 🚀 Option 1: Professional Production Deployment (VPS)
This is the recommended method for a 24/7 stable environment. Use a provider like **DigitalOcean**, **Linode**, or **Hetzner**.

### 📋 Prerequisites
- A VPS with at least **4GB RAM** (8GB recommended for multiple concurrent labs).
- **Docker** and **Docker Compose** installed.
- A **Domain Name** (e.g., `virtuallab.com`).

### 🛠️ Step-by-Step Setup
1.  **Clone the Repository** on your server:
    ```bash
    git clone <your-repo-url>
    cd VirtualLabPlatform
    ```

2.  **Configure Environment Variables**:
    Create a `.env.production` file (use `.env.production.example` as a template).
    ```bash
    cp .env.production.example .env.production
    nano .env.production
    ```
    *Set your domain and secure secrets here.*

3.  **Run the Deployment Script**:
    I've created a helper script to build the frontend and start the production containers:
    ```bash
    ./deploy-production.sh
    ```

4.  **SSL (HTTPS) Setup with Certbot**:
    Once Nginx is running, secure it with a free SSL certificate:
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d your-domain.com
    ```

---

## 🛡️ Option 2: Secure Home Hosting (Cloudflare Tunnel)
If you want to host from your local machine but make it **always accessible** without opening ports on your router.

### 📋 Prerequisites
- A **Cloudflare account** (Free).
- A domain managed by Cloudflare.

### 🛠️ Step-by-Step Setup
1.  **Install Cloudflared**:
    Follow the [official guide](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/install-cloudflare-tunnel/) to install `cloudflared` on your machine.

2.  **Authenticate & Create Tunnel**:
    ```bash
    cloudflared tunnel login
    cloudflared tunnel create lab-tunnel
    ```

3.  **Configure Routing**:
    ```bash
    cloudflared tunnel route dns lab-tunnel your-domain.com
    ```

4.  **Start the Tunnel**:
    Run this in a separate terminal or as a service:
    ```bash
    cloudflared tunnel run lab-tunnel --url http://localhost:80
    ```
    *Now, anyone can visit `https://your-domain.com` and they will reach your local lab platform!*

---

## 📝 Post-Deployment Checklist
- [ ] **Change Default Passwords**: Ensure Admin and Facilitator accounts have strong, unique passwords.
- [ ] **Monitor Resources**: Use `docker stats` to ensure the labs aren't consuming too much RAM.
- [ ] **Backup Database**: Use the scripts in `docker/scripts/` to schedule daily backups.

> [!NOTE]
> All API calls in the frontend are now configured to use relative paths (`/api`) in production, meaning they will work automatically behind any reverse proxy (Nginx, Cloudflare, etc.).

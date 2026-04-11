# Vaultwarden Setup Summary

## Achievements in Resolving Vaultwarden (VW) Errors

### Initial VW Error (`WebCryptoFunctionService`)
- **Problem**: Vaultwarden displayed a `WebCryptoFunctionService` error in the browser console, indicating an issue with secure connections (likely due to HTTP usage or certificate problems).
- **Solution**:
  - Identified that VW required HTTPS to resolve the error, as `WebCrypto` APIs need a secure context.
  - Initially attempted to use Caddy as a reverse proxy for HTTPS, but **Caddy did not play well with Nginx** (OMV’s default web server), causing conflicts.
  - Switched to **OMV’s Nginx** to proxy VW, using OMV’s self-signed certificate (`/etc/ssl/certs/openmediavault-2b42d824-5258-43a5-a950-1c676ca40962.crt`).
  - Configured Nginx to serve VW at `https://omv-elbo.local:8443`, ensuring **proper termination of TLS endpoints**, which resolved the VW errors:
    ```
    server {
        listen 8443 ssl;
        server_name omv-elbo.local;
        ssl_certificate /etc/ssl/certs/openmediavault-2b42d824-5258-43a5-a950-1c676ca40962.crt;
        ssl_certificate_key /etc/ssl/private/openmediavault-2b42d824-5258-43a5-a950-1c676ca40962.key;
        location / {
            proxy_pass http://127.0.0.1:8222;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Port 8443;
        }
        add_header Permissions-Policy "geolocation=(), microphone=(), camera=()";
    }
    ```
  - Added a `Permissions-Policy` header to minimize console warnings.

### Avahi Limitations and Hostname Resolution
- **Problem**: Avahi failed to advertise custom hostnames (e.g., `vault-omv-elbo.local`), resulting in a `Failed to resolve service 'Vaultwarden'` timeout error.
- **Solution**:
  - Simplified the setup by using `omv-elbo.local` with different ports (e.g., `8443` for VW) instead of aliasing hostnames.
  - Configured Avahi to advertise VW as `omv-elbo - Vaultwarden` on port `8443`.

### Caddy Cleanup
- **Problem**: Caddy, initially used as a reverse proxy, conflicted with OMV’s Nginx and was left running in a broken state, detected by Cockpit.
- **Solution**:
  - Removed Caddy entirely (processes, systemd service, Docker containers, and configuration files like `/etc/caddy/Caddyfile`).
  - Ensured OMV’s Nginx handled all proxying, avoiding conflicts.

### Cockpit TLS and Routing Issues
- **Problem**: Cockpit had connection failures on ports `9090` (direct) and `9091` (via Nginx) due to TLS handshake errors (`gnutls_handshake failed`).
- **Solution**:
  - Configured Cockpit to use OMV’s certificate, resolving TLS issues.
  - Restricted Cockpit to `127.0.0.1:9090` for local access via SSH tunneling (`http://localhost:9090`).
  - Disabled Nginx routing for Cockpit (removed `/etc/nginx/sites-enabled/cockpit`).

## Future Plan: Subdomain-Like Names for Services
- **Objective**: Replace port-based URLs (e.g., `https://omv-elbo.local:8443`) with subdomain-like names (e.g., `https://vaultwarden.local`, `https://gitea.local`, `https://registry.local`, `https://cockpit.local`).
- **Plan**:
  - Set up **dnsmasq** on `omv-elbo.local` (`192.168.0.225`) to resolve local hostnames to IPs (e.g., `vaultwarden.local` → `192.168.0.225`).
  - Update Nginx to route based on hostnames instead of ports (e.g., `vaultwarden.local` → `127.0.0.1:8222`).
  - Keep Avahi running for service discovery, complementing dnsmasq.

## Certificate Trust Approaches Considered
We explored several approaches to eliminate security warnings caused by self-signed certificates:

1. **Trust Self-Signed Certificates on Each Device**
   - **Approach**: Trust OMV’s self-signed certificate on each device.
   - **Pros**:
     - No external access or public domain needed.
     - Works for local networks.
     - No renewal hassle (self-signed certificates can have long validity).
   - **Cons**:
     - Must be done on every device (not scalable for 20+ devices).
     - Inconvenient for new devices/users.
     - Teaches users to ignore warnings, which can be risky.

2. **Create a Local Certificate Authority (LCA)**
   - **Approach**: Create an LCA, sign certificates for all services, and trust the LCA on each device.
   - **Pros**:
     - More scalable than trusting individual certificates.
     - Works for local domains without external access.
     - Centralized certificate management.
   - **Cons**:
     - Requires trusting the LCA on each device (less convenient for 20+ devices).
     - No global trust chain; external devices see warnings unless the LCA is trusted.

3. **Use Let’s Encrypt with a Public Domain**
   - **Approach**: Use a registered domain (e.g., `linkedintennis.com`) to obtain a Let’s Encrypt certificate via DNS-01 challenge, map the domain to `192.168.0.225` internally.
   - **Pros**:
     - Globally trusted (chains to ISRG Root X1).
     - No manual trust needed on devices.
     - Free.
   - **Cons**:
     - Requires a public domain.
     - DNS-01 challenge needs manual TXT record updates (or API automation).
     - Certificates expire every 90 days (requires renewal).
     - Internal mapping requires hosts file edits or a local DNS server.

4. **Sign LCA with a Commercial CA**
   - **Approach**: Have a commercial CA (e.g., DigiCert) sign your LCA certificate, creating an intermediate CA that chains to a trusted root.
   - **Pros**:
     - Globally trusted.
     - Centralized management for internal domains.
   - **Cons**:
     - Expensive (thousands of dollars annually).
     - Complex (identity verification, compliance, key management).
     - Not practical for a home setup.

## DNS Options Considered
We explored DNS options to improve hostname resolution and complement Avahi:

1. **Continue Using Avahi (mDNS)**
   - **Approach**: Rely on Avahi for service discovery and hostname resolution.
   - **Pros**:
     - Zero-configuration.
     - Works on ad-hoc networks (same subnet).
   - **Cons**:
     - Limited to `.local` domains; struggles with custom hostnames.
     - mDNS doesn’t cross subnets without a reflector.
     - Not all devices support mDNS.

2. **Set Up a Local DNS Server (dnsmasq)**
   - **Approach**: Use dnsmasq on `omv-elbo.local` for local hostname resolution.
   - **Pros**:
     - Reliable resolution (static mappings).
     - Custom hostnames (e.g., `vaultwarden.local`).
     - Works for all devices.
     - Forwards non-local queries to upstream DNS.
   - **Cons**:
     - Requires configuration.
     - Not zero-configuration.
     - Doesn’t work across subnets unless reachable.

3. **Combine dnsmasq and Avahi**
   - **Approach**: Use dnsmasq for primary resolution, Avahi for service discovery and mDNS fallback.
   - **Pros**:
     - Reliable resolution (dnsmasq) and zero-config discovery (Avahi).
     - Works for devices without Avahi.
     - mDNS fallback for ad-hoc networks.
   - **Cons**:
     - More complex setup.
     - Cross-subnet discovery needs an mDNS reflector.

## Current State
- **DNS and Certificates**:
  - No changes made; we discussed setting up dnsmasq and Let’s Encrypt certificates but have not implemented them.
  - Services use OMV’s self-signed certificate, causing warnings unless manually trusted.
- **Last Action**:
  - Disabled Nginx routing for Cockpit (removed `/etc/nginx/sites-enabled/cockpit`).
  - Cockpit is accessible locally on `127.0.0.1:9090` via SSH tunneling (`http://localhost:9090`).
- **Vaultwarden**:
  - Created folders for categories:
    - `Family Documents`: For IDs, passports, birth certificates.
    - `Legal Documents`: For contracts, titles, certificates of ownership.
    - `Financial`: For banking/credit card info.
    - `Startups`: For startup-related info.
    - `API Keys`: For API keys.
    - `Miscellaneous`: For other items.
  - Explored on-the-road use:
    - Export a subset of the vault as JSON for offline access.
    - Discussed future remote access via VPN or reverse proxy (not implemented).

## Next Steps
- Consider implementing the dnsmasq + Avahi setup for subdomain-like names.
- Explore Let’s Encrypt certificates for `linkedintennis.com` to eliminate security warnings.
- Configure Nginx for Docker Registry, Gitea, and potentially Cockpit using hostname-based routing.


##############################

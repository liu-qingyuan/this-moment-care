# care.q1ngyuan.top deployment

This Moment is published as static files. The production server does not install project dependencies, compile TypeScript, accept session content, or expose a content API.

## Deployment contract

- `npm run deploy:care` is the routine release entrypoint.
- The command refuses a dirty Git worktree before running `npm run check` or uploading anything.
- Only the generated `dist/` contents are packaged as a release artifact.
- Releases live under `/opt/this-moment-care/releases`; `current` and `previous` are server-side symlinks.
- `this-moment-care-static` uses `nginx:1.27-alpine` and binds only to `127.0.0.1:18082`.
- The container provides `/healthz`, hashed static assets, and `index.html` fallback.
- Host Nginx terminates TLS for `care.q1ngyuan.top` and proxies to the loopback port.
- The origin certificate and private key are generated on the server. The key remains root-owned with mode `600` and is never included in Git, a release archive, or deployment logs.

## First server preparation

Prerequisites are local Node/npm, Git, `ssh`, `scp`, and `tar`; the server needs Docker Compose, Nginx, OpenSSL, curl, and systemd. DNS must already proxy `care.q1ngyuan.top` to the host through Cloudflare.

From a trusted checkout:

```sh
npm run bootstrap:care
```

Bootstrap installs only the Compose and Nginx configuration, creates a host-specific origin certificate on the server when absent, verifies Nginx syntax, and leaves the existing Nushu site untouched. It is safe to rerun after deployment configuration changes.

## Routine release

Commit all intended source changes first, then run:

```sh
npm run deploy:care
```

The command runs the local quality gate, uploads one versioned static archive, activates it, checks the loopback container and origin TLS route, then verifies the Cloudflare HTTPS page title and a representative local asset. A failed activation or verification restores `previous` and rechecks the restored service.

Supported overrides:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DEPLOY_HOST` | `q1ngyuan.top` | SSH/SCP target |
| `DEPLOY_PATH` | `/opt/this-moment-care` | Remote deployment root |
| `PUBLIC_URL` | `https://care.q1ngyuan.top` | Cloudflare URL to verify |
| `PUBLIC_HOST` | `care.q1ngyuan.top` | Host Nginx and origin certificate name during bootstrap |
| `ORIGIN_URL` | `https://<PUBLIC_HOST>` | Direct origin route verified over loopback TLS |
| `CHECK_CMD` | `npm run check` | Local pre-upload quality command |
| `PUBLIC_CHECK_CMD` | `node scripts/verify-care.mjs` | Public identity check command |

Overrides are explicit environment variables, for example:

```sh
DEPLOY_HOST=server-alias PUBLIC_URL=https://care.example.test npm run deploy:care
```

## Health and routing checks

Container health is separate from origin and public routing:

```sh
ssh q1ngyuan.top 'curl -fsS http://127.0.0.1:18082/healthz'
ssh q1ngyuan.top 'curl -fsS --resolve care.q1ngyuan.top:443:127.0.0.1 --cacert /opt/this-moment-care/tls/care.q1ngyuan.top.crt https://care.q1ngyuan.top/'
node scripts/verify-care.mjs https://care.q1ngyuan.top
```

Confirm that Docker exposes no public port:

```sh
ssh q1ngyuan.top 'docker port this-moment-care-static && ss -ltn "sport = :18082"'
```

## Logs and manual rollback

Inspect service state without reading or storing browser session content:

```sh
ssh q1ngyuan.top 'docker logs --tail 100 this-moment-care-static'
ssh q1ngyuan.top 'journalctl -u nginx --since "30 minutes ago" --no-pager'
```

Find the active and retained release:

```sh
ssh q1ngyuan.top 'readlink /opt/this-moment-care/current; readlink /opt/this-moment-care/previous'
```

To restore `previous`, use the current release id shown above:

```sh
ssh q1ngyuan.top 'bash -s -- rollback /opt/this-moment-care <current-release-id>' < scripts/remote-care-release.sh
```

The rollback command restarts the container on the retained release and repeats the internal and origin checks before reporting success.

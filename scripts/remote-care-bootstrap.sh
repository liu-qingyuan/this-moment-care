#!/usr/bin/env bash
set -euo pipefail

deploy_path="${1:-}"
public_host="${2:-}"
config_tarball="${3:-}"
site_path="/etc/nginx/sites-available/${public_host}"
site_link="/etc/nginx/sites-enabled/${public_host}"
container_name="this-moment-care-static"

fail() {
  printf '[remote-care-bootstrap] %s\n' "$*" >&2
  exit 1
}

[[ "${deploy_path}" =~ ^/opt/[A-Za-z0-9._/-]+$ ]] || fail "DEPLOY_PATH must be an absolute path under /opt."
[[ "${public_host}" =~ ^[A-Za-z0-9.-]+$ ]] || fail "Invalid PUBLIC_HOST."
[[ -f "${config_tarball}" ]] || fail "Missing bootstrap archive."

stage="$(mktemp -d)"
site_backup=""
cleanup() {
  rm -rf "${stage}"
  rm -f "${config_tarball}"
  [[ -z "${site_backup}" ]] || rm -f "${site_backup}"
}
trap cleanup EXIT

tar -C "${stage}" -xzf "${config_tarball}"
[[ -f "${stage}/compose.yml" ]] || fail "Bootstrap archive is missing compose.yml."
[[ -f "${stage}/nginx/default.conf" ]] || fail "Bootstrap archive is missing container Nginx config."
[[ -f "${stage}/nginx/care.q1ngyuan.top.conf.template" ]] || fail "Bootstrap archive is missing host Nginx template."

if ss -H -ltn 'sport = :18082' | grep -q .; then
  docker inspect "${container_name}" >/dev/null 2>&1 || fail "127.0.0.1:18082 is already in use by another service."
fi

install -d -m 0755 "${deploy_path}" "${deploy_path}/releases" "${deploy_path}/nginx"
install -d -m 0700 "${deploy_path}/tls"
install -m 0644 "${stage}/compose.yml" "${deploy_path}/compose.yml"
install -m 0644 "${stage}/nginx/default.conf" "${deploy_path}/nginx/default.conf"

certificate_path="${deploy_path}/tls/${public_host}.crt"
private_key_path="${deploy_path}/tls/${public_host}.key"
if [[ -e "${certificate_path}" || -e "${private_key_path}" ]]; then
  [[ -f "${certificate_path}" && -f "${private_key_path}" ]] || fail "TLS certificate and key must either both exist or both be absent."
else
  printf '[remote-care-bootstrap] Generating host-specific origin certificate on the server\n'
  openssl req -x509 -newkey rsa:2048 -sha256 -nodes -days 3650 \
    -subj "/CN=${public_host}" \
    -addext "subjectAltName=DNS:${public_host}" \
    -keyout "${private_key_path}" \
    -out "${certificate_path}" >/dev/null 2>&1
fi
chown root:root "${certificate_path}" "${private_key_path}"
chmod 0644 "${certificate_path}"
chmod 0600 "${private_key_path}"

escaped_deploy_path="${deploy_path//&/\\&}"
escaped_public_host="${public_host//&/\\&}"
sed \
  -e "s|__DEPLOY_PATH__|${escaped_deploy_path}|g" \
  -e "s|__PUBLIC_HOST__|${escaped_public_host}|g" \
  "${stage}/nginx/care.q1ngyuan.top.conf.template" > "${stage}/host.conf"

if [[ -e "${site_path}" ]]; then
  site_backup="$(mktemp)"
  cp -a "${site_path}" "${site_backup}"
fi
install -m 0644 "${stage}/host.conf" "${site_path}"
ln -sfn "${site_path}" "${site_link}"

if ! nginx -t; then
  rm -f "${site_link}"
  if [[ -n "${site_backup}" ]]; then
    cp -a "${site_backup}" "${site_path}"
    ln -sfn "${site_path}" "${site_link}"
  else
    rm -f "${site_path}"
  fi
  nginx -t || true
  fail "Host Nginx rejected the care virtual host; previous configuration restored."
fi
systemctl reload nginx

(cd "${deploy_path}" && docker compose config -q)
docker pull nginx:1.27-alpine >/dev/null
if [[ -L "${deploy_path}/current" ]]; then
  (cd "${deploy_path}" && docker compose up -d --force-recreate)
fi

openssl x509 -in "${certificate_path}" -noout -checkend 86400 >/dev/null
[[ "$(stat -c '%a' "${private_key_path}")" == "600" ]] || fail "TLS private key permissions are not 600."
printf '[remote-care-bootstrap] Ready: %s -> 127.0.0.1:18082\n' "${public_host}"

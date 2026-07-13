#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
deploy_host="${DEPLOY_HOST:-q1ngyuan.top}"
deploy_path="${DEPLOY_PATH:-/opt/this-moment-care}"
public_host="${PUBLIC_HOST:-care.q1ngyuan.top}"
ssh_bin="${SSH_BIN:-ssh}"
scp_bin="${SCP_BIN:-scp}"
remote_script="${repo_root}/scripts/remote-care-bootstrap.sh"

shell_quote() {
  printf '%q' "$1"
}

cd "${repo_root}"
[[ -f deploy/care/compose.yml ]] || {
  printf '[bootstrap-care] Missing deploy/care configuration.\n' >&2
  exit 1
}

temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/this-moment-care-bootstrap.XXXXXX")"
config_tarball="${temp_dir}/bootstrap.tar.gz"
remote_tarball="/tmp/this-moment-care-bootstrap-$$.tar.gz"
trap 'rm -rf "${temp_dir}"' EXIT

COPYFILE_DISABLE=1 tar --no-xattrs -C deploy/care -czf "${config_tarball}" .
printf '[bootstrap-care] Uploading server configuration to %s\n' "${deploy_host}"
"${scp_bin}" "${config_tarball}" "${deploy_host}:${remote_tarball}" >/dev/null

command="bash -s -- $(shell_quote "${deploy_path}") $(shell_quote "${public_host}") $(shell_quote "${remote_tarball}")"
"${ssh_bin}" "${deploy_host}" "${command}" < "${remote_script}"
printf '[bootstrap-care] Server is ready for npm run deploy:care\n'

#!/usr/bin/env bash
set -euo pipefail

repo_root="${DEPLOY_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
check_cmd="${CHECK_CMD:-npm run check}"
deploy_host="${DEPLOY_HOST:-q1ngyuan.top}"
deploy_path="${DEPLOY_PATH:-/opt/this-moment-care}"
public_url="${PUBLIC_URL:-https://care.q1ngyuan.top}"
public_host="${PUBLIC_HOST:-$(node -e 'process.stdout.write(new URL(process.argv[1]).hostname)' "${public_url}")}"
origin_url="${ORIGIN_URL:-https://${public_host}}"
public_check_cmd="${PUBLIC_CHECK_CMD:-npm run verify:care}"
ssh_bin="${SSH_BIN:-ssh}"
scp_bin="${SCP_BIN:-scp}"
remote_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/remote-care-release.sh"

log() {
  printf '[deploy-care] %s\n' "$*"
}

fail() {
  printf '[deploy-care] %s\n' "$*" >&2
  exit 1
}

shell_quote() {
  printf '%q' "$1"
}

remote_action() {
  local action="$1"
  shift
  local command="PUBLIC_HOST=$(shell_quote "${public_host}") ORIGIN_URL=$(shell_quote "${origin_url}") bash -s -- $(shell_quote "${action}") $(shell_quote "${deploy_path}")"
  local argument

  for argument in "$@"; do
    command+=" $(shell_quote "${argument}")"
  done

  "${ssh_bin}" "${deploy_host}" "${command}" < "${remote_script}"
}

cd "${repo_root}"

[[ -f package.json ]] || fail "Run this command from the This Moment repository."
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "Deployment requires a Git worktree."

if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
  fail "Git worktree must be clean before deployment."
fi

log "Running local check: ${check_cmd}"
bash -o pipefail -c "${check_cmd}"

[[ -f dist/index.html ]] || fail "Missing dist/index.html after the local check."

if [[ -n "$(git status --porcelain --untracked-files=all)" ]]; then
  fail "Local check changed the Git worktree; refusing to upload."
fi

release_id="$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short=12 HEAD)"
temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/this-moment-care.XXXXXX")"
tarball="${temp_dir}/release.tar.gz"
remote_tarball="/tmp/this-moment-care-${release_id}.tar.gz"
trap 'rm -rf "${temp_dir}"' EXIT

log "Packaging production static release ${release_id}"
COPYFILE_DISABLE=1 tar --no-xattrs -C dist -czf "${tarball}" .

log "Uploading static release to ${deploy_host}:${remote_tarball}"
"${scp_bin}" "${tarball}" "${deploy_host}:${remote_tarball}" >/dev/null

log "Activating release on ${deploy_host}"
if ! remote_action activate "${release_id}" "${remote_tarball}"; then
  fail "Remote activation failed; the remote release manager restored the previous release."
fi

log "Verifying public identity: ${public_url}"
if ! PUBLIC_URL="${public_url}" bash -o pipefail -c "${public_check_cmd}"; then
  log "Public verification failed; requesting rollback"
  remote_action rollback "${release_id}" || fail "Public verification failed and remote rollback also failed."
  remote_action verify-restored || fail "Rollback completed but the restored release did not pass verification."
  PUBLIC_URL="${public_url}" bash -o pipefail -c "${public_check_cmd}" || fail "Rollback completed but the restored public URL did not pass verification."
  fail "Public verification failed; previous release restored."
fi

remote_action confirm "${release_id}"
log "Deployment complete: ${public_url} (${release_id})"

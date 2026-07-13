#!/usr/bin/env bash
set -euo pipefail

action="${1:-}"
deploy_path="${2:-}"
release_id="${3:-}"
remote_tarball="${4:-}"
public_host="${PUBLIC_HOST:-care.q1ngyuan.top}"
origin_url="${ORIGIN_URL:-https://${public_host}}"
certificate_path="${CERTIFICATE_PATH:-${deploy_path}/tls/${public_host}.crt}"

[[ -n "${action}" && -n "${deploy_path}" ]] || {
  printf 'Usage: remote-care-release.sh <action> <deploy-path> [arguments...]\n' >&2
  exit 2
}

case "${action}" in
  activate | rollback | verify-restored | confirm)
    ;;
  *)
    printf 'Unknown remote release action: %s\n' "${action}" >&2
    exit 2
    ;;
esac

fail() {
  printf '[remote-care-release] %s\n' "$*" >&2
  exit 1
}

run_compose() {
  if [[ -n "${COMPOSE_CMD:-}" ]]; then
    bash -o pipefail -c "${COMPOSE_CMD}"
    return
  fi

  (cd "${deploy_path}" && docker compose up -d --force-recreate)
}

stop_compose() {
  if [[ -n "${COMPOSE_DOWN_CMD:-}" ]]; then
    bash -o pipefail -c "${COMPOSE_DOWN_CMD}"
    return
  fi

  (cd "${deploy_path}" && docker compose down)
}

run_internal_check() {
  if [[ -n "${INTERNAL_CHECK_CMD:-}" ]]; then
    bash -o pipefail -c "${INTERNAL_CHECK_CMD}"
    return
  fi

  [[ "$(curl -fsS --max-time 20 http://127.0.0.1:18082/healthz)" == "ok" ]]
}

run_origin_check() {
  if [[ -n "${ORIGIN_CHECK_CMD:-}" ]]; then
    bash -o pipefail -c "${ORIGIN_CHECK_CMD}"
    return
  fi

  local response_file asset_path
  response_file="$(mktemp)"

  if ! curl -fsS --max-time 20 \
    --resolve "${public_host}:443:127.0.0.1" \
    --cacert "${certificate_path}" \
    "${origin_url}/" > "${response_file}"; then
    rm -f "${response_file}"
    return 1
  fi
  if ! grep -Fq '<title>This Moment · 此刻</title>' "${response_file}" || grep -Fqi 'Welcome to nginx!' "${response_file}"; then
    rm -f "${response_file}"
    return 1
  fi

  asset_path="$(grep -Eo '/assets/[^"'"'"'[:space:]]+' "${response_file}" | sed -n '1p')"
  rm -f "${response_file}"
  [[ -n "${asset_path}" ]] || return 1
  curl -fsS --max-time 20 \
    --resolve "${public_host}:443:127.0.0.1" \
    --cacert "${certificate_path}" \
    "${origin_url%/}${asset_path}" >/dev/null
}

run_restored_check() {
  if [[ -n "${RESTORED_CHECK_CMD:-}" ]]; then
    bash -o pipefail -c "${RESTORED_CHECK_CMD}"
    return
  fi

  run_internal_check && run_origin_check
}

replace_link() {
  local target="$1"
  local link="$2"
  local next_link="${link}.next"

  rm -f "${next_link}"
  ln -s "${target}" "${next_link}"
  if mv --help 2>&1 | grep -q -- '-T'; then
    mv -Tf "${next_link}" "${link}"
  else
    mv -fh "${next_link}" "${link}"
  fi
}

restore_target() {
  local target="$1"

  if [[ -n "${target}" ]]; then
    replace_link "${target}" "${deploy_path}/current"
    run_compose
    run_restored_check
    return
  fi

  rm -f "${deploy_path}/current"
  stop_compose
}

validate_release_id() {
  [[ "${release_id}" =~ ^[A-Za-z0-9._-]+$ ]] || fail "Invalid release id: ${release_id}"
}

activate_release() {
  validate_release_id
  [[ -f "${deploy_path}/compose.yml" ]] || fail "Missing ${deploy_path}/compose.yml. Run bootstrap first."
  [[ -f "${remote_tarball}" ]] || fail "Missing uploaded release: ${remote_tarball}"
  trap 'rm -f "${remote_tarball}"' EXIT

  mkdir -p "${deploy_path}/releases"
  local release_path="${deploy_path}/releases/${release_id}"
  local staged_path="${release_path}.staged"
  local old_target=""

  [[ ! -e "${release_path}" && ! -e "${staged_path}" ]] || fail "Release already exists: ${release_id}"
  if [[ -L "${deploy_path}/current" ]]; then
    old_target="$(readlink "${deploy_path}/current")"
  fi

  if tar -tzf "${remote_tarball}" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
    fail "Release archive contains an unsafe path."
  fi

  mkdir "${staged_path}"
  tar -C "${staged_path}" -xzf "${remote_tarball}"
  find "${staged_path}" -name '._*' -type f -delete
  if [[ -n "$(find "${staged_path}" -type l -print -quit)" ]]; then
    rm -rf "${staged_path}"
    fail "Release archive must not contain symbolic links."
  fi
  [[ -f "${staged_path}/index.html" ]] || fail "Release is missing index.html."
  [[ -d "${staged_path}/assets" ]] || fail "Release is missing assets/."
  mv "${staged_path}" "${release_path}"

  if [[ -n "${old_target}" ]]; then
    replace_link "${old_target}" "${deploy_path}/previous"
  else
    rm -f "${deploy_path}/previous"
  fi

  replace_link "releases/${release_id}" "${deploy_path}/current"
  if ! run_compose; then
    restore_target "${old_target}" || fail "Activation failed and the previous release could not be restored."
    fail "Container activation failed; previous release restored."
  fi
  if ! run_internal_check; then
    restore_target "${old_target}" || fail "Health verification failed and the previous release could not be restored."
    fail "Internal health verification failed; previous release restored."
  fi
  if ! run_origin_check; then
    restore_target "${old_target}" || fail "Origin verification failed and the previous release could not be restored."
    fail "Origin verification failed; previous release restored."
  fi

  printf '[remote-care-release] Activated %s\n' "${release_id}"
}

rollback_release() {
  validate_release_id
  local current_target=""
  local previous_target=""

  [[ -L "${deploy_path}/current" ]] && current_target="$(readlink "${deploy_path}/current")"
  [[ "${current_target}" == "releases/${release_id}" ]] || fail "Release ${release_id} is not current."
  [[ -L "${deploy_path}/previous" ]] || fail "No previous successful release is available."
  previous_target="$(readlink "${deploy_path}/previous")"
  restore_target "${previous_target}" || fail "Previous release could not be restored."
  printf '[remote-care-release] Rolled back %s to %s\n' "${release_id}" "${previous_target}"
}

confirm_release() {
  validate_release_id
  [[ -L "${deploy_path}/current" ]] || fail "No current release."
  [[ "$(readlink "${deploy_path}/current")" == "releases/${release_id}" ]] || fail "Release ${release_id} is not current."

  local keep_current="releases/${release_id}"
  local keep_previous=""
  [[ -L "${deploy_path}/previous" ]] && keep_previous="$(readlink "${deploy_path}/previous")"

  local candidate relative
  for candidate in "${deploy_path}"/releases/*; do
    [[ -d "${candidate}" ]] || continue
    relative="releases/$(basename "${candidate}")"
    if [[ "${relative}" != "${keep_current}" && "${relative}" != "${keep_previous}" ]]; then
      rm -rf "${candidate}"
    fi
  done
  printf '[remote-care-release] Confirmed %s\n' "${release_id}"
}

case "${action}" in
  activate)
    [[ -n "${release_id}" && -n "${remote_tarball}" ]] || fail "activate requires a release id and tarball path."
    activate_release
    ;;
  rollback)
    [[ -n "${release_id}" ]] || fail "rollback requires a release id."
    rollback_release
    ;;
  verify-restored)
    run_restored_check || fail "Restored release verification failed."
    ;;
  confirm)
    [[ -n "${release_id}" ]] || fail "confirm requires a release id."
    confirm_release
    ;;
esac

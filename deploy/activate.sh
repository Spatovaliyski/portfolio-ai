#!/usr/bin/env bash
set -euo pipefail
base="${1:?deployment root required}"
id="${2:?release UUID required}"
variant="${3:-$id}"
[[ "$base" =~ ^/[a-zA-Z0-9/_-]+$ && "$base" != / && "$id" =~ ^[a-f0-9-]{36}$ && "$variant" =~ ^[a-zA-Z0-9_-]{1,160}$ ]] || exit 2
mkdir -p "$base/releases" "$base/shared/assets" "$base/shared/media" "$base/shared/social"
exec 9>"$base/activation.lock"
flock -x 9
candidate="$base/releases/$variant"
test -f "$candidate/release.json"
if test -f "$base/current/release.json"; then
  active_id="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["releaseId"])' "$base/current/release.json")"
  if test "$active_id" = "$id"; then cat "$base/current/release.json"; exit 0; fi
fi
# Content hashes are immutable. A retry never replaces a retained file with different bytes.
for kind in assets media social; do
  while IFS= read -r -d '' file; do
    relative="${file#"$candidate/$kind/"}"
    destination="$base/shared/$kind/$relative"
    mkdir -p "$(dirname "$destination")"
    if test -f "$destination"; then cmp --silent "$file" "$destination" || { echo 'Immutable asset collision'; exit 1; }
    else cp "$file" "$destination"; fi
  done < <(find "$candidate/$kind" -type f -print0)
done
python3 - "$candidate/release.json" "$base/current/release.json" "$id" <<'PY'
import json,sys,os
new=json.load(open(sys.argv[1]))
assert new['releaseId']==sys.argv[3] and isinstance(new['generation'],int) and new['generation']>0
if os.path.exists(sys.argv[2]):
    old=json.load(open(sys.argv[2]))
    assert new['generation']>old['generation'] or new['releaseId']==old['releaseId'], 'Older activation rejected'
PY
# Smoke-test the uploaded files before switching the live symlink.
python3 -m http.server 8091 --bind 127.0.0.1 --directory "$candidate" >"$base/candidate-smoke.log" 2>&1 &
smoke_pid=$!
trap 'kill "$smoke_pid" 2>/dev/null || true' EXIT
for attempt in {1..30}; do curl -fsS http://127.0.0.1:8091/release.json >/dev/null && break || sleep .2; done
for path in / /projects/ /pet-projects/ /github/ /resume/ /admin/; do curl -fsS "http://127.0.0.1:8091$path" >/dev/null; done
test "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8091/a-missing-route)" = 404
kill "$smoke_pid"; trap - EXIT
previous="$(readlink "$base/current" || true)"
ln -sfn "$candidate" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
if ! sudo -n nginx -t || ! sudo -n systemctl reload nginx; then
  if test -n "$previous"; then ln -sfn "$previous" "$base/current.restore"; mv -Tf "$base/current.restore" "$base/current"; sudo -n systemctl reload nginx; fi
  echo 'Nginx validation or reload failed; previous release restored' >&2
  exit 1
fi
cat "$base/current/release.json"

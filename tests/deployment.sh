#!/usr/bin/env bash
set -euo pipefail
base="/tmp/portfolio-activation-test-$$"
[[ "$base" =~ ^/tmp/portfolio-activation-test-[0-9]+$ ]] || exit 2
mkdir -p "$base/mockbin"
trap 'rm -rf -- "$base"' EXIT
cat > "$base/mockbin/sudo" <<'SH'
#!/usr/bin/env bash
if [[ "${FAIL_RELOAD:-0}" = 1 && "$*" = *"systemctl reload"* ]]; then exit 1; fi
exit 0
SH
chmod +x "$base/mockbin/sudo"
export PATH="$base/mockbin:$PATH"
make_release() {
  local id="$1" generation="$2"
  mkdir -p "$base/releases/$id"/{assets,media,social,projects,pet-projects,github,resume,admin}
  printf '{"releaseId":"%s","generation":%s,"buildId":"proof"}' "$id" "$generation" > "$base/releases/$id/release.json"
  for page in '' projects pet-projects github resume admin; do echo '<h1>Proof</h1>' > "$base/releases/$id/$page/index.html"; done
  printf '%s' "$id" > "$base/releases/$id/assets/$id.js"
}
a=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
b=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb
c=cccccccc-cccc-4ccc-8ccc-cccccccccccc
make_release "$a" 1;make_release "$b" 2;make_release "$c" 3
bash deploy/activate.sh "$base" "$a" >/dev/null
bash deploy/activate.sh "$base" "$b" >/dev/null
test -f "$base/shared/assets/$a.js"
test "$(readlink "$base/current")" = "$base/releases/$b"
if bash deploy/activate.sh "$base" "$a" >/dev/null 2>&1; then echo 'Older generation was accepted'; exit 1; fi
bash deploy/activate.sh "$base" "$b" >/dev/null
if FAIL_RELOAD=1 bash deploy/activate.sh "$base" "$c" >/dev/null 2>&1; then echo 'Failed reload was accepted'; exit 1; fi
test "$(readlink "$base/current")" = "$base/releases/$b"
echo 'Atomic activation, immutable retained assets, repeated activation, ordering and failed-reload recovery passed.'

#!/usr/bin/env bash
set -euo pipefail
root=/var/www/spatovaliyski.com/runtime
release="${1:?release directory required}"
[[ "$release" =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid application revision' >&2; exit 1; }
candidate="$root/releases/$release"
test -f "$candidate/dist/server/index.js"
test -s /etc/portfolio/runtime.env
if ! id portfolio-runtime >/dev/null 2>&1; then useradd --system --home /nonexistent --shell /usr/sbin/nologin portfolio-runtime; fi
if [ ! -x "$root/node/bin/node" ]; then
  case "$(uname -m)" in x86_64) arch=x64 ;; aarch64) arch=arm64 ;; *) echo 'Unsupported Node architecture' >&2; exit 1 ;; esac
  archive="node-v24.16.0-linux-$arch.tar.xz"
  temp=$(mktemp -d)
  trap 'rm -rf "$temp"' EXIT
  curl --fail --silent --show-error "https://nodejs.org/dist/v24.16.0/$archive" -o "$temp/$archive"
  curl --fail --silent --show-error https://nodejs.org/dist/v24.16.0/SHASUMS256.txt -o "$temp/checksums"
  (cd "$temp"; awk -v file="$archive" '$2==file {print}' checksums | sha256sum -c -)
  mkdir -p "$root/node"
  tar -xJf "$temp/$archive" --strip-components=1 -C "$root/node"
fi
export PATH="$root/node/bin:$PATH"
cd "$candidate"
npm ci --omit=dev --no-audit --no-fund
chown -R portfolio-runtime:portfolio-runtime "$candidate"
install -m 644 "$candidate/deploy/runtime.service" /etc/systemd/system/portfolio-runtime.service
mkdir -p "$root/assets"
if [ -d /var/www/spatovaliyski.com/current/assets ]; then
  cp -an /var/www/spatovaliyski.com/current/assets/. "$root/assets/"
fi
cp -an "$candidate/dist/client/assets/." "$root/assets/"
ln -sfn "$candidate" "$root/current"
systemctl daemon-reload
systemctl enable portfolio-runtime
systemctl restart portfolio-runtime
for attempt in {1..20}; do
  if curl --fail --silent http://127.0.0.1:4173/healthz >/dev/null; then break; fi
  if [ "$attempt" = 20 ]; then echo 'Runtime could not load Supabase content' >&2; exit 1; fi
  sleep 1
done
install -d /etc/nginx/snippets
install -m 644 "$candidate/deploy/portfolio-security.conf" /etc/nginx/snippets/portfolio-security.conf
python3 "$candidate/deploy/configure_nginx.py"
nginx -t
systemctl reload nginx
echo "Deployed application $release; content updates are now served directly from Supabase."

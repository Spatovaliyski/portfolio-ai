"""Connect the canonical site to the runtime, preserving TLS and other host blocks."""
import os
import re
import shlex
import subprocess
from pathlib import Path

def without_comment_lines(config):
    return re.sub(r"(?m)^[ \t]*#.*$", "", config)


def block_end(config, start):
    depth, quote, comment, escaped = 0, None, False, False
    for i in range(start, len(config)):
        c = config[i]
        if comment:
            if c == "\n":
                comment = False
            continue
        if escaped:
            escaped = False
            continue
        if c == "\\":
            escaped = True
            continue
        if quote:
            if c == quote:
                quote = None
            continue
        if c in "\"'":
            quote = c
        elif c == "#":
            comment = True
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return i + 1
    raise SystemExit("Unbalanced Nginx server block.")

def canonical_servers(config):
    matches = []
    for match in re.finditer(r"(?m)^[ \t]*server\s*\{", config):
        start = match.start()
        end = block_end(config, config.index("{", start))
        block = config[start:end]
        clean = without_comment_lines(block)
        names = re.search(r"server_name\s+([^;]+);", clean)
        if (names and "spatovaliyski.com" in names[1].split()
                and re.search(r"listen\s+[^;]*\b443\b", clean)):
            matches.append((start, end, block, names[0]))
    return matches


dump = subprocess.check_output(["nginx", "-T"], stderr=subprocess.DEVNULL, text=True)
chunks = re.split(r"# configuration file (.*?):\n", dump)
configured = os.environ.get("PORTFOLIO_NGINX_SITE", "")
paths = list(dict.fromkeys(chunks[i] for i in range(1, len(chunks), 2)
                           if canonical_servers(chunks[i + 1])))
if not configured and len(paths) != 1:
    raise SystemExit("Set PORTFOLIO_NGINX_SITE to the canonical Nginx site file.")
site = Path(configured or paths[0])
if not site.is_absolute() or not site.resolve().is_relative_to("/etc/nginx"):
    raise SystemExit("Unexpected Nginx configuration path.")
text = site.read_text()
matches = canonical_servers(text)
if len(matches) != 1:
    raise SystemExit("Cannot identify a unique canonical HTTPS server block.")
start, end, old, names = matches[0]
ssl = []
visited = set()


def collect_ssl(config):
    config = without_comment_lines(config)
    ssl.extend(re.findall(r"\bssl_[a-zA-Z0-9_]+\s+[^;]+;", config))
    for include in re.findall(r"\binclude\s+([^;]+);", config):
        for name in shlex.split(include):
            path = Path(name) if name.startswith("/") else Path("/etc/nginx") / name
            if path.exists() and path.is_file() and path not in visited:
                visited.add(path)
                collect_ssl(path.read_text())


collect_ssl(old)
if not any(re.match(r"ssl_certificate\s", s) for s in ssl) or not any(re.match(r"ssl_certificate_key\s", s) for s in ssl):
    raise SystemExit("Keep explicit TLS certificate directives in the canonical site or its include.")
template = (Path(__file__).parent / "nginx.conf").read_text()
template = template[:template.index("\nserver {", 1)]
template = re.sub(r"\s*ssl_[a-zA-Z0-9_]+\s+[^;]+;", "", template)
template = template.replace("    server_name             spatovaliyski.com;", "    " + names)
template = template.replace("    include                 /etc/nginx/mime.types;", "    include /etc/nginx/mime.types;\n    " + "\n    ".join(dict.fromkeys(ssl)))
template = template.replace("    location ~ /\\.", "    if ($host != spatovaliyski.com) { return 301 https://spatovaliyski.com$request_uri; }\n\n    location ~ /\\.")
site.write_text(text[:start] + template.strip() + text[end:])

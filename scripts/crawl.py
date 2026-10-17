"""Fetch every page of astralnomads.panther.kz (RU + EN) into .cache/pages.

Polite: one request at a time with a delay; already-cached pages are skipped.
"""
import os, re, sys, time, json, hashlib, urllib.request

BASE = "https://astralnomads.panther.kz"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, ".cache", "pages")
DELAY = 0.4


def cache_path(path):
    name = re.sub(r"[^a-zA-Z0-9]+", "_", path.strip("/")) or "index"
    if len(name) > 120:
        name = name[:100] + hashlib.md5(path.encode()).hexdigest()[:8]
    return os.path.join(CACHE, name + ".html")


def fetch(path, force=False):
    out = cache_path(path)
    if os.path.exists(out) and not force:
        return open(out, encoding="utf-8").read()
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "astral-nomads-portal-sync/0.1"})
    with urllib.request.urlopen(req, timeout=30) as r:
        body = r.read().decode("utf-8")
    with open(out, "w", encoding="utf-8") as f:
        f.write(body)
    time.sleep(DELAY)
    return body


def main():
    os.makedirs(CACHE, exist_ok=True)
    sitemap = fetch("/sitemap.xml", force=True)
    paths = [re.sub(r"^" + re.escape(BASE), "", u) or "/" for u in re.findall(r"<loc>([^<]+)</loc>", sitemap)]
    # listing pages (paginated) and library material-type filters, both languages
    for lang in ("", "/en"):
        for section in ("library", "artifacts", "multimedia", "events", "authors", "institutions"):
            first = fetch(f"{lang}/{section}")
            pages = [int(n) for n in re.findall(r"[?&]page=(\d+)", first)]
            for n in range(2, max(pages, default=1) + 1):
                paths.append(f"{lang}/{section}?page={n}")
            for mt in re.findall(r'<select name="material_type".*?</select>', first, re.S):
                for v in re.findall(r'<option value="([^"]+)"', mt):
                    paths.append(f"{lang}/{section}?material_type={v}")
                    # material-type listings can paginate too
                    sub = fetch(f"{lang}/{section}?material_type={v}")
                    for n in range(2, max([int(x) for x in re.findall(r"[?&]page=(\d+)", sub)], default=1) + 1):
                        paths.append(f"{lang}/{section}?material_type={v}&page={n}")
    paths = list(dict.fromkeys(paths))
    seen = set(paths)
    i = 0
    # the sitemap is incomplete (e.g. some events are only linked from other pages),
    # so also follow links to detail pages found on every fetched page
    while i < len(paths):
        p = paths[i]
        i += 1
        try:
            body = fetch(p)
        except Exception as e:
            print("FAIL", p, e, file=sys.stderr)
            continue
        for link in re.findall(r'href="(?:' + re.escape(BASE) + r')?(/(?:en/)?(?:library|artifacts|multimedia|authors|institutions|events)/[^"?#/]+)"', body):
            for variant in (link, "/en" + link if not link.startswith("/en/") else link[3:]):
                if variant not in seen:
                    seen.add(variant)
                    paths.append(variant)
                    print("discovered", variant, flush=True)
        if i % 50 == 0:
            print(f"{i}/{len(paths)}", flush=True)
    with open(os.path.join(ROOT, ".cache", "paths.json"), "w") as f:
        json.dump(paths, f, ensure_ascii=False, indent=0)
    print("done", len(paths))


if __name__ == "__main__":
    main()

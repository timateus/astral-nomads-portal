"""Parse cached pages (.cache/pages) into public/data/archive.json.

Run scripts/crawl.py first. Output shape:
  { generatedAt, source, authors[], institutions[], materials[], events[], facets{} }
Every text field is bilingual: {"ru": ..., "en": ...}.
"""
import html, json, os, re, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, ".cache", "pages")
OUT = os.path.join(ROOT, "public", "data", "archive.json")
BASE = "https://astralnomads.panther.kz"

SECTIONS = {"library": "library", "artifacts": "artifact", "multimedia": "multimedia"}

# Detail-page field labels → canonical keys (RU and EN variants seen on the site)
FIELD_KEYS = {
    "название": "title", "title": "title",
    "название на языке оригинала": "originalTitle", "title in original language": "originalTitle",
    "автор(ы) / создатель(и)": "creators", "author/s | creator/s": "creators", "авторы": "creators", "authors": "creators",
    "техника": "medium", "artwork-medium": "medium",
    "размер / длительность": "dimensions", "artwork-dimensions | length": "dimensions",
    "год создания": "yearText", "year of creation": "yearText",
    "место создания": "place", "place of creation": "place",
    "предоставлено": "courtesy", "courtesy": "courtesy", "provided by": "courtesy",
    "ключевые слова": "keywords", "keywords": "keywords",
    "ключевые слова на языке оригинала": "keywordsOriginal", "keywords in original language": "keywordsOriginal",
    "уровень доступа": "access", "access level": "access",
    "описание": "description", "description": "description",
    "редакторы": "editors", "editors": "editors",
    "языки": "languages", "languages": "languages",
    "художники": "artists", "artists": "artists",
    "страна публикации": "publicationCountry", "country of publication": "publicationCountry",
    "издатель": "publisher", "publisher": "publisher",
    "издатель на языке оригинала": "publisherOriginal", "publisher in original language": "publisherOriginal",
    "количество страниц": "pages", "number of pages": "pages", "pages": "pages",
    "тираж": "printRun", "print run": "printRun", "circulation": "printRun",
    "обложка": "cover", "cover": "cover",
    # upper-case variant layout ("АВТОР: <strong>…</strong>")
    "автор": "creators", "author": "creators", "title in the original language": "originalTitle",
    "technique": "medium", "размер": "dimensions", "size": "dimensions", "год": "yearText", "year": "yearText",
}


def read(name):
    p = os.path.join(CACHE, name + ".html")
    return open(p, encoding="utf-8").read() if os.path.exists(p) else None


def cache_name(path):
    return re.sub(r"[^a-zA-Z0-9]+", "_", path.strip("/")) or "index"


def text(s):
    s = re.sub(r"<br\s*/?>", "\n", s or "")
    s = re.sub(r"<[^>]+>", "", s)
    return re.sub(r"[ \t ]+", " ", html.unescape(s)).strip()


def abs_url(u):
    u = html.unescape(u)
    return u if u.startswith("http") else BASE + u


def first(pattern, s, flags=re.S):
    m = re.search(pattern, s or "", flags)
    return (m.group(1) if m.groups() else m.group(0)) if m else None


def clean_html(s):
    """Keep simple formatting tags only."""
    s = re.sub(r"<(?!/?(p|br|em|strong|i|b|a)\b)[^>]+>", "", s or "")
    # drop every attribute from allowed tags; links keep only an http(s)/mailto href
    s = re.sub(r"<(p|br|em|strong|i|b)\b[^>]*>", r"<\1>", s)

    def link(m):
        href = re.search(r'href="((?:https?:|mailto:)[^"]*)"', m.group(0))
        return f'<a href="{href.group(1)}" target="_blank" rel="noopener">' if href else "<a>"

    s = re.sub(r"<a\b[^>]*>", link, s)
    return s.replace("&nbsp;", " ").strip()


def split_list(v):
    return [x.strip(" .") for x in re.split(r"[;,]\s*", v or "") if x.strip(" .")]


# Credit lines that appear in colophons / video descriptions ("Монтаж: …", "Concept & Editor: …")
CREDIT_ROLE = re.compile(
    r"^(иде[яи]|монтаж|куратор\w*|комиссар|организатор\w*|координатор\w*|редактор\w*|дизайн\w*|перевод\w*|фото\w*|оператор\w*|"
    r"музык\w*|исполн\w*|перформанс|участник\w*|concept|.*editor|.*design|translations?|image credits|project organi[sz]er|"
    r"proofreading.*|texts?( by)?|projects and contributions by|project (curator|manager|assistant)|assistant|coordinators? .*|curator of .*|credit images|[il]mage credits|curators?|participants|camera|music|performers?|idea|editing)$",
    re.I,
)


def parse_fields(article):
    """Metadata lines from a material description.

    The source uses three layouts: "<strong>Label:</strong> value", "LABEL: <strong>value</strong>"
    and plain "Label: value". Returns (fields, credits, leftover free-text lines).
    """
    fields, credits, rest = {}, [], []
    chunks = re.split(r"</p>|<br\s*/?>|\n", article or "")
    for chunk in chunks:
        line = text(chunk)
        if not line:
            continue
        # colophon lines without a colon: "Texts by A, B", "Proofreading (English version), A, B"
        line = re.sub(r"^(Texts by|Projects and contributions by|Proofreading \(English version\)),?\s+", r"\1: ", line)
        m = re.match(r"^([^:]{2,60}?)\s*:\s*(.*)$", line, re.S)
        label = m.group(1).strip().lower() if m else ""
        if m and label in FIELD_KEYS:
            fields.setdefault(FIELD_KEYS[label], m.group(2).strip())
        elif m and m.group(2).strip() and CREDIT_ROLE.match(label):
            credits.append([m.group(1).strip(), m.group(2).strip().rstrip(".")])
        else:
            rest.append(line)
    return fields, credits, rest


def page_body(s):
    i = s.find('class="page-content"')
    j = s.find('class="page-footer"')
    return s[i:j if j > 0 else None]


def parse_cards(s):
    """Catalog / slider cards: slug → {title, authors, country, year, image}."""
    out = {}
    for m in re.finditer(r'<a href="/(?:en/)?(library|artifacts|multimedia)/([^"?]+)[^"]*" class="(?:catalog|library|media)-image[^"]*">(.*?</div>)\s*</div>', s, re.S):
        section, slug, block = m.groups()
        meta = text(first(r'class="meta">(.*?)</div>', block) or "")
        parts = [p.strip() for p in meta.split("•")]
        year = next((int(p) for p in parts if re.fullmatch(r"\d{4}", p)), None)
        country = next((p for p in parts if not re.fullmatch(r"\d{4}", p)), None)
        out[(section, slug)] = {"country": country, "year": year,
                                "authors": text(first(r'class="authors">(.*?)</div>', block) or "")}
    return out


def collect_listing(section, lang):
    pre = "en_" if lang == "en" else ""
    cards = {}
    n = 1
    while True:
        s = read(f"{pre}{section}" + (f"_page_{n}" if n > 1 else ""))
        if not s:
            break
        cards.update(parse_cards(s))
        n += 1
    return cards


def parse_country_options(s):
    block = first(r'<select name="country".*?</select>', s) or ""
    return {text(label): code for code, label in re.findall(r'<option value="([^"]+)"\s*>([^<]+)', block)}


def parse_people(body):
    """Linked authors / institutions in a detail page's related block."""
    people = []
    for kind, slug in re.findall(r'href="/(?:en/)?(authors|institutions)/([^"?#]+)"[^>]*class="event-person"', body):
        people.append((kind, slug))
    return list(dict.fromkeys(people))


def parse_material(section, slug, ru, en):
    out = {"id": f"{SECTIONS[section]}:{slug}", "type": SECTIONS[section], "slug": slug,
           "url": f"{BASE}/{section}/{slug}"}
    by_lang = {}
    for lang, s in (("ru", ru), ("en", en)):
        if not s:
            continue
        body = page_body(s)
        article = first(r'<article class="material-description article">(.*?)</article>', body) or ""
        fields, credits, rest = parse_fields(article)
        h1 = text(first(r'<h1 class="page-title">(.*?)</h1>', body))
        rest = [r for r in rest if r.strip(' "«».') != h1.strip(' "«».')]
        if rest and "description" not in fields:
            fields["description"] = "\n".join(rest)
        by_lang[lang] = {"fields": fields, "credits": credits, "h1": text(first(r'<h1 class="page-title">(.*?)</h1>', body)),
                         "caption": text(first(r'<p class="material-caption">(.*?)</p>', body) or "")}
    ru_body = page_body(ru)

    def bi(key):
        v = {l: by_lang[l]["fields"].get(key) for l in by_lang if by_lang[l]["fields"].get(key)}
        return v or None

    # the page heading is the canonical title; a differing metadata title becomes the original title
    out["title"] = {l: by_lang[l]["h1"] or by_lang[l]["fields"].get("title") for l in by_lang}
    for l in by_lang:
        ft = by_lang[l]["fields"].get("title")
        if ft and ft != out["title"][l] and "originalTitle" not in by_lang[l]["fields"]:
            by_lang[l]["fields"]["originalTitle"] = ft
    credits = {l: by_lang[l]["credits"] for l in by_lang if by_lang[l]["credits"]}
    if credits:
        out["credits"] = credits
    for key in ("originalTitle", "medium", "dimensions", "yearText", "place", "courtesy", "description",
                "editors", "languages", "artists", "publicationCountry", "publisher", "cover", "creators"):
        v = bi(key)
        if v:
            out[key] = v
    for key in ("pages", "printRun"):
        v = by_lang.get("ru", {}).get("fields", {}).get(key)
        if v:
            out[key] = v
    out["keywords"] = {l: split_list(by_lang[l]["fields"].get("keywords")) for l in by_lang}

    # media
    zoom = first(r'<a href="([^"]+)" data-fancybox', ru_body)
    img = first(r'class="material-media[^"]*".*?<img src="([^"]+)"', ru_body)
    if img and "content-default" not in img:
        out["image"] = abs_url(img)
    if zoom:
        out["imageLarge"] = abs_url(zoom)
    video = first(r'data-widget="videoEmbed"\s+data-src="([^"]+)"', ru_body)
    if video:
        out["video"] = html.unescape(video)
    pdf = first(r'href="(https://astralnomads\.panther\.kz/pdf/\d+/download)"', ru_body)
    if pdf:
        out["pdf"] = pdf
        size = first(r'data-size="(\d+)"', ru_body)
        if size:
            out["pdfSize"] = int(size)
    out["readable"] = 'data-widget="pdfViewer"' in ru_body

    people = parse_people(ru_body)
    out["authorIds"] = [s for k, s in people if k == "authors"]
    out["institutionIds"] = [s for k, s in people if k == "institutions"]
    return out


def parse_author(slug, ru, en, listing):
    out = {"id": slug, "slug": slug, "url": f"{BASE}/authors/{slug}", "name": {}, "bio": {}, "about": {}, "location": {}}
    for lang, s in (("ru", ru), ("en", en)):
        if not s:
            continue
        body = page_body(s)
        out["name"][lang] = text(first(r'<h1 class="page-title">(.*?)</h1>', body))
        out["bio"][lang] = clean_html(first(r'<div class="author-bio-text">(.*?)</div>', body))
        about = first(r'<div class="author-about-body">(.*?)</div>\s*</div>\s*</div>', body)
        if about:
            out["about"][lang] = clean_html(about)
        out["location"][lang] = listing.get(lang, {}).get(slug)
    img = first(r'<div class="author-photo[^"]*">.*?<img src="([^"]+)"', page_body(ru))
    if img and "content-default" not in img:
        out["photo"] = abs_url(img)
    return out


def parse_institution(slug, ru, en, listing):
    out = {"id": slug, "slug": slug, "url": f"{BASE}/institutions/{slug}", "name": {}, "description": {}, "location": {}}
    for lang, s in (("ru", ru), ("en", en)):
        if not s:
            continue
        body = page_body(s)
        out["name"][lang] = text(first(r'<h1 class="page-title">(.*?)</h1>', body))
        out["description"][lang] = clean_html(first(r'<div class="institution-description article">(.*?)</div>', body))
        out["address"] = out.get("address") or {}
        addr = text(first(r'<div class="address">(.*?)</div>', body) or "")
        out["address"][lang] = re.sub(r"^(Адрес|Address):\s*", "", addr)
        out["location"][lang] = listing.get(lang, {}).get(slug)
    body = page_body(ru)
    logo = first(r'<div class="institution-cover">.*?<img src="([^"]+)"', body)
    if logo and "content-default" not in logo:
        out["logo"] = abs_url(logo)
    out["phones"] = [text(p) for p in re.findall(r'<a class="phone"[^>]*>(.*?)</a>', body)]
    out["emails"] = re.findall(r'href="mailto:([^"]+)"', body)
    return out


def parse_event(slug, ru, en):
    out = {"id": slug, "slug": slug, "url": f"{BASE}/events/{slug}", "title": {}, "lead": {}, "description": {},
           "location": {}, "dateText": {}, "labels": {}}
    for lang, s in (("ru", ru), ("en", en)):
        if not s:
            continue
        body = page_body(s)
        out["title"][lang] = text(first(r'<h1 class="page-title">(.*?)</h1>', body))
        out["lead"][lang] = text(first(r'<p class="event-lead">(.*?)</p>', body) or "")
        out["description"][lang] = clean_html(first(r'<article class="event-description article">(.*?)</article>', body))
        hero = first(r'<div class="event-hero-labels">(.*?)</div>', body) or ""
        out["labels"][lang] = [text(x) for x in re.findall(r'<span class="label">(.*?)</span>', hero)]
        for label, val in re.findall(r'<span class="event-line-label">(.*?)</span>(.*?)</div>', body, re.S):
            label = text(label).rstrip(":").lower()
            if label in ("страна", "country"):
                out["location"][lang] = text(val)
            elif label in ("дата и время", "date and time"):
                out["dateText"][lang] = text(val)
    body = page_body(ru)
    cover = first(r'<div class="event-cover[^"]*">.*?<img src="([^"]+)"', body)
    if cover and "content-default" not in cover:
        out["image"] = abs_url(cover)
    # status: upcoming / now / past (from RU label)
    status_map = {"Скоро": "upcoming", "Сейчас": "now", "Прошло": "past"}
    out["status"] = next((status_map[l] for l in out["labels"].get("ru", []) if l in status_map), None)
    out["eventType"] = next((l for l in out["labels"].get("ru", []) if l not in status_map), None)
    dates = re.findall(r"(\d{1,2}) (\w+) (\d{4})", out["dateText"].get("ru", ""))
    months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"]
    iso = []
    for d, mo, y in dates:
        if mo in months:
            iso.append(f"{y}-{months.index(mo) + 1:02d}-{int(d):02d}")
    if iso:
        out["start"] = iso[0]
        out["end"] = iso[-1]
    people = parse_people(body)
    out["authorIds"] = [s for k, s in people if k == "authors"]
    out["institutionIds"] = [s for k, s in people if k == "institutions"]
    return out


def name_listing(section):
    res = {}
    for lang, pre in (("ru", ""), ("en", "en_")):
        s = read(pre + section) or ""
        res[lang] = {slug: text(desc) for slug, desc in re.findall(
            rf'href="/(?:en/)?{section}/([^"?]+)" class="name">.*?</a>\s*<div class="description">(.*?)</div>', s, re.S)}
    return res


def main():
    sitemap = read("sitemap_xml")
    if not sitemap:
        sys.exit("run scripts/crawl.py first")
    paths = [re.sub(r"^" + re.escape(BASE), "", u) for u in re.findall(r"<loc>([^<]+)</loc>", sitemap)]
    manifest = os.path.join(ROOT, ".cache", "paths.json")
    if os.path.exists(manifest):
        paths += json.load(open(manifest, encoding="utf-8"))
    paths = list(dict.fromkeys(p for p in paths if not p.startswith("/en")))

    def pair(path):
        return read(cache_name(path)), read(cache_name("/en" + path))

    # listings give normalized year + country per material
    cards = {}
    for section in SECTIONS:
        ru_cards = collect_listing(section, "ru")
        en_cards = collect_listing(section, "en")
        for key, v in ru_cards.items():
            cards[key] = {"ru": v, "en": en_cards.get(key)}
    country_codes = {}
    for section in list(SECTIONS) + ["authors", "institutions", "events"]:
        for pre in ("", "en_"):
            country_codes.update(parse_country_options(read(pre + section) or ""))

    # library material types
    lib_types = {}
    lib_type_labels = {}
    for lang, pre in (("ru", ""), ("en", "en_")):
        block = first(r'<select name="material_type".*?</select>', read(pre + "library") or "") or ""
        for code, label in re.findall(r'<option value="([^"]+)"\s*>([^<]+)', block):
            lib_type_labels.setdefault(code, {})[lang] = text(label)
            if lang == "ru":
                n = 1
                while True:
                    s = read(f"library_material_type_{code.replace('-', '_')}" + (f"_page_{n}" if n > 1 else ""))
                    if not s:
                        break
                    for (_, slug) in parse_cards(s):
                        lib_types[slug] = code
                    n += 1

    materials, authors, institutions, events = [], [], [], []
    author_loc = name_listing("authors")
    inst_loc = name_listing("institutions")
    for p in paths:
        m = re.fullmatch(r"/(library|artifacts|multimedia|authors|institutions|events)/([^/?]+)", p)
        if not m:
            continue
        section, slug = m.groups()
        ru, en = pair(p)
        if not ru:
            print("missing", p, file=sys.stderr)
            continue
        if section in SECTIONS:
            item = parse_material(section, slug, ru, en)
            card = cards.get((section, slug), {})
            ru_card, en_card = card.get("ru") or {}, card.get("en") or {}
            item["year"] = ru_card.get("year")
            if not item["year"]:
                y = re.search(r"(1[89]\d\d|20\d\d)", (item.get("yearText") or {}).get("ru", ""))
                item["year"] = int(y.group(1)) if y else None
            c = ru_card.get("country")
            item["country"] = country_codes.get(c) if c else None
            if section == "library" and slug in lib_types:
                item["materialType"] = lib_types[slug]
            materials.append(item)
        elif section == "authors":
            authors.append(parse_author(slug, ru, en, author_loc))
        elif section == "institutions":
            institutions.append(parse_institution(slug, ru, en, inst_loc))
        elif section == "events":
            events.append(parse_event(slug, ru, en))

    # country codes for people/institutions/events from their location strings
    for coll in (authors, institutions, events):
        for x in coll:
            loc = (x.get("location") or {}).get("ru") or ""
            x["country"] = next((code for name, code in country_codes.items() if loc.startswith(name)), None)

    countries = {}
    for lang, pre in (("ru", ""), ("en", "en_")):
        for section in list(SECTIONS) + ["authors", "institutions", "events"]:
            for name, code in parse_country_options(read(pre + section) or "").items():
                countries.setdefault(code, {})[lang] = name

    data = {
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "source": BASE,
        "authors": authors,
        "institutions": institutions,
        "materials": materials,
        "events": events,
        "facets": {"countries": countries, "libraryTypes": lib_type_labels},
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"materials={len(materials)} authors={len(authors)} institutions={len(institutions)} events={len(events)} → {OUT}")


if __name__ == "__main__":
    main()

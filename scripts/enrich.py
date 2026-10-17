"""Link the parsed archive to institutions, groups, programmes and people found in its own texts.

Reads public/data/archive.json (from parse.py) and scripts/enrichment.json (hand-curated),
and writes the enriched archive back:

  entities[]  every institution / group / programme / venue / school, with its source-site page if any
  people[]    everyone credited or named in the archive (artists in catalogues, editors, curators…)
  materials[].refs, events[].refs, authors[].refs   → {entities: [{id, role, snippet?}], people: [...]}
  authors[].facts                                   → structured biography lines
"""
import html, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVE = os.path.join(ROOT, "public", "data", "archive.json")
CURATED = os.path.join(ROOT, "scripts", "enrichment.json")

# Stronger roles win when one object links to the same entity in several ways
ROLE_RANK = ["source", "organizer", "venue", "program", "curator", "commissioner", "artistic director", "participant",
             "courtesy", "publisher", "creator", "artist", "editor", "credit", "place", "fact", "mention"]

TRANSLIT = dict(zip("абвгдеёжзийклмнопрстуфхцчшщъыьэюяәғқңөұүһі",
                    ["a", "b", "v", "g", "d", "e", "e", "zh", "z", "i", "y", "k", "l", "m", "n", "o", "p", "r", "s", "t", "u", "f",
                     "kh", "ts", "ch", "sh", "sch", "", "y", "", "e", "yu", "ya", "a", "g", "k", "n", "o", "u", "u", "h", "i"]))


def slug(s):
    s = "".join(TRANSLIT.get(c, c) for c in s.lower())
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def plain(s):
    s = re.sub(r"<(br|/p)[^>]*>", "\n", s or "")
    return re.sub(r"[ \t ]+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def rank(role):
    base = role.split(":")[0]
    return ROLE_RANK.index(base) if base in ROLE_RANK else len(ROLE_RANK)


def snippet(text, start, end, width=230):
    """The sentence around a match, trimmed to roughly `width` characters."""
    left = max(text.rfind(c, 0, start) for c in ".!?\n¶") + 1
    rights = [i for i in (text.find(c, end) for c in ".!?\n¶") if i >= 0]
    right = min(rights) + 1 if rights else len(text)
    s = text[left:right].strip()
    if len(s) > width:
        a = max(0, start - left - width // 2)
        s = ("…" if a else "") + s[a:a + width].strip() + "…"
    return s


class Refs:
    """Per-object references, keeping the strongest role per target."""

    def __init__(self):
        self.items = {}

    def add(self, kind, target, role, snip=None):
        key = (kind, target)
        cur = self.items.get(key)
        if cur is None or rank(role) < rank(cur["role"]):
            self.items[key] = {"id": target, "role": role, **({"snippet": snip} if snip else {})}
        elif snip and "snippet" not in cur:
            cur["snippet"] = snip

    def out(self):
        res = {}
        for (kind, _), v in self.items.items():
            res.setdefault(kind, []).append(v)
        for v in res.values():
            v.sort(key=lambda r: rank(r["role"]))
        return res


# ---------------- people -----------------

ORG_WORDS = re.compile(r"галере|групп|архив|редактор|составител|координатор|дизайн|музей|фонд|центр|студи|gallery|group|team|studio|"
                       r"embassy|foundation|institute|office|program|union|«|»|\"|\d|/|\(|\)|\[|\]", re.I)


def squash(s):
    s = re.sub(r"[^a-zа-яёәғқңөұүһі]", "", s.lower()).replace("ё", "е")
    s = re.sub(r"(.)\1+", r"\1", s)
    # transliteration noise: Bokonbayev / Bokonbaev, Surayyo / Surayo, Сикорский / Сикорски
    return s.replace("y", "").replace("ий", "и")


def person_key(name):
    parts = [p for p in re.split(r"[\s.]+", name) if p]
    if len(parts) < 2:
        return None
    return squash(parts[-1]) + ":" + squash(parts[0])[:1]


def nice_name(n):
    n = re.sub(r"\s+", " ", n.replace("Ь", "b").replace("В", "B") if re.search(r"[A-Za-z]", n) else n).strip(" .,;")
    # "Stefan RUSU" / "jamshed Kholikov" → "Stefan Rusu" / "Jamshed Kholikov"
    return " ".join(w if (w[:1].isupper() and not w.isupper()) or len(w) < 2 else w.capitalize() for w in n.split(" "))


def split_names(v):
    v = re.sub(r"\s+(и|&|and)\s+", ", ", v or "")
    parts = [p.strip() for p in re.split(r"[,;]\s*", v)]
    # "Елена, Виктор Воробьевы" (from "Елена и Виктор Воробьевы"): give the lone first name the shared surname
    for i, p in enumerate(parts[:-1]):
        nxt = parts[i + 1].split()
        if len(p.split()) == 1 and "." not in p and len(nxt) == 2:
            parts[i] = f"{p} {nxt[1]}"
    out = []
    for raw in parts:
        n = nice_name(raw)
        if not n or ORG_WORDS.search(n) or len(n.split()) > 4 or len(n) < 5:
            continue
        if not re.match(r"^[A-ZА-ЯЁӘҒҚҢӨҰҮҺІ]", n):
            continue
        out.append(n)
    return out


class People:
    def __init__(self, authors, curated):
        self.by_id = {}
        self.by_key = {}
        self.patterns = []  # (regex, person id) for finding names in prose
        for a in authors:
            self._new(a["name"].get("en") or a["name"]["ru"], a["name"], author_id=a["id"], pid=a["id"])
        for p in curated:
            pid = self.find(p["ru"]) or self.find(p["en"]) or self._new(p["en"], {"ru": p["ru"], "en": p["en"]})
            person = self.by_id[pid]
            person["name"].setdefault("ru", p["ru"])
            person["name"].setdefault("en", p["en"])
            for k in (person_key(p["en"]), person_key(p["ru"])):
                if k:
                    self.by_key.setdefault(k, pid)
            for a in p.get("aliases", []):
                self.patterns.append((re.compile(a), pid))
        for a in authors:
            for lang in ("ru", "en"):
                if a["name"].get(lang):
                    self.patterns.append((re.compile(re.escape(a["name"][lang])), a["id"]))

    def _new(self, en_name, names, author_id=None, pid=None):
        pid = pid or slug(en_name)
        while pid in self.by_id and self.by_id[pid].get("authorId") != author_id:
            pid += "-2"
        self.by_id[pid] = {"id": pid, "name": {k: v for k, v in names.items() if v}, **({"authorId": author_id} if author_id else {})}
        for n in names.values():
            k = person_key(n or "")
            if k:
                self.by_key.setdefault(k, pid)
        return pid

    def find(self, name):
        k = person_key(name)
        if k in self.by_key:
            return self.by_key[k]
        for rx, pid in self.patterns:
            if rx.search(name):
                return pid
        return None

    def get(self, name, lang, other=None):
        """Find or create a person for a credited name (optionally with its other-language spelling)."""
        pid = self.find(name) or (other and self.find(other))
        if re.search(r"[A-Za-z]", name) and not re.search(r"[А-Яа-яЁё]", name):
            lang = "en"  # Latin names in Russian-language colophons
        if not pid:
            names = {lang: name}
            if other:
                names["en" if lang == "ru" else "ru"] = other
            latin = names.get("en") or name
            pid = self._new(latin if re.search(r"[A-Za-z]", latin) else name, names)
        person = self.by_id[pid]
        cur = person["name"].get(lang)
        # prefer full names over initials ("Е. Мельдибеков" → "Ербосын Мельдибеков")
        if not cur or (re.search(r"\b\w\.", cur) and not re.search(r"\b\w\.", name)):
            person["name"][lang] = name
        if other:
            person["name"].setdefault("en" if lang == "ru" else "ru", other)
        return pid


# ---------------- main -----------------

def main():
    data = json.load(open(ARCHIVE, encoding="utf-8"))
    cur = json.load(open(CURATED, encoding="utf-8"))

    # entities: source-site institutions first, then curated ones
    entities = {}
    for i in data["institutions"]:
        entities[i["id"]] = {
            "id": i["id"], "kind": "institution", "source": True, "url": i["url"], "name": i["name"],
            "description": i["description"], "descriptionHtml": True, "location": i.get("location"), "country": i.get("country"),
            "address": i.get("address"), "logo": i.get("logo"), "phones": i.get("phones", []), "emails": i.get("emails", []),
        }
    for e in cur["entities"]:
        base = entities.setdefault(e["id"], {"id": e["id"], "source": False})
        for k, v in e.items():
            if k not in ("aliases", "caseSensitive") and v is not None:
                base.setdefault(k, v)
        if e.get("city") and not base.get("location"):
            base["location"] = e["city"]
    matchers = []
    for e in cur["entities"]:
        flags = 0 if e.get("caseSensitive") else re.I
        matchers.append((e["id"], [re.compile(a, flags) for a in e.get("aliases", [])]))

    people = People(data["authors"], cur.get("people", []))

    def scan(refs, text, role, skip_entity=None, want_snippet=False):
        if not text:
            return
        for eid, rxs in matchers:
            if eid == skip_entity:
                continue
            for rx in rxs:
                m = rx.search(text)
                if m:
                    refs.add("entities", eid, role, snippet(text, m.start(), m.end()) if want_snippet else None)
                    break

    def scan_people(refs, text, role, skip=None, want_snippet=False):
        if not text:
            return
        for rx, pid in people.patterns:
            if pid == skip:
                continue
            m = rx.search(text)
            if m:
                refs.add("people", pid, role, snippet(text, m.start(), m.end()) if want_snippet else None)

    # ---- materials
    for m in data["materials"]:
        refs = Refs()
        for iid in m.get("institutionIds", []):
            refs.add("entities", iid, "source")
        for lang in ("ru", "en"):
            g = lambda k: (m.get(k) or {}).get(lang, "")
            scan(refs, g("courtesy"), "courtesy")
            scan(refs, g("publisher"), "publisher")
            scan(refs, g("creators"), "creator")
            scan(refs, g("place"), "place")
            scan(refs, " ".join([g("title"), g("originalTitle"), g("description")]), "mention", want_snippet=lang == "ru")
            for role, value in (m.get("credits") or {}).get(lang, []):
                scan(refs, value, "credit:" + role)
            scan(refs, g("description"), "mention")

        # people from credit lists (ru/en lists are aligned by position when the lengths match)
        def credit_list(key, role):
            ru, en = split_names((m.get(key) or {}).get("ru")), split_names((m.get(key) or {}).get("en"))
            aligned = len(ru) == len(en)
            for i, n in enumerate(ru):
                pid = people.get(n, "ru", en[i] if aligned else None)
                if pid not in m["authorIds"] or role != "creator":
                    refs.add("people", pid, role)
            if not ru:
                for n in en:
                    refs.add("people", people.get(n, "en"), role)

        if m["type"] == "library" or len(m["authorIds"]) == 0:
            credit_list("creators", "artist" if m["type"] == "library" else "creator")
        else:
            credit_list("creators", "creator")
        credit_list("artists", "artist")
        credit_list("editors", "editor")
        for lang in ("ru", "en"):
            for role, value in (m.get("credits") or {}).get(lang, []):
                if re.search(r"organi[sz]er|организатор", role, re.I):
                    continue
                for n in split_names(value):
                    refs.add("people", people.get(n, lang), "credit:" + role)
            # people named in short descriptions ("перформанс - Баходир Мусаев")
            scan_people(refs, (m.get("description") or {}).get(lang, ""), "mention")
        for aid in m["authorIds"]:
            refs.items.pop(("people", aid), None)
        m["refs"] = refs.out()

    # ---- authors: entities and people named in biographies, plus curated facts
    facts = cur.get("authorFacts", {})
    for a in data["authors"]:
        refs = Refs()
        for lang in ("ru", "en"):
            txt = plain(a["bio"].get(lang)) + "\n" + plain(a["about"].get(lang))
            scan(refs, txt, "mention", want_snippet=lang == "ru")
            scan_people(refs, txt, "mention", skip=a["id"], want_snippet=lang == "ru")
        a["facts"] = facts.get(a["id"], [])
        for f in a["facts"]:
            if f.get("ref"):
                kind, target = f["ref"].split(":", 1)
                refs.add("entities" if kind == "entity" else "people", target, "fact:" + f["k"])
        a["refs"] = refs.out()

    # ---- events
    ev_people = cur.get("eventPeople", {})
    for e in data["events"]:
        refs = Refs()
        for lang in ("ru", "en"):
            txt = " ".join([e["title"].get(lang, ""), e["lead"].get(lang, ""), plain(e["description"].get(lang))])
            scan(refs, txt, "mention", want_snippet=lang == "ru")
            scan_people(refs, txt, "mention")
        for role, names in ev_people.get(e["id"], {}).items():
            for n in names:
                if n in entities:
                    refs.add("entities", n, role)
                else:
                    refs.add("people", people.get(n, "ru"), role)
        for aid in e.get("authorIds", []):
            refs.add("people", aid, "participant")
        e["refs"] = refs.out()

    # ---- entities mentioning each other (e.g. a source institution's description)
    for ent in entities.values():
        refs = Refs()
        desc = ent.get("description") or {}
        scan(refs, plain(desc.get("ru")) + " " + plain(desc.get("en")), "mention", skip_entity=ent["id"])
        scan_people(refs, plain(desc.get("ru")), "mention")
        ent["refs"] = refs.out()

    # keep only entities / people that are linked from somewhere
    used_e, used_p = set(), set()
    for coll in (data["materials"], data["authors"], data["events"], entities.values()):
        for o in coll:
            used_e.update(r["id"] for r in o.get("refs", {}).get("entities", []))
            used_p.update(r["id"] for r in o.get("refs", {}).get("people", []))
    data["entities"] = [e for e in entities.values() if e["id"] in used_e or e.get("source")]
    data["people"] = [p for p in people.by_id.values() if p["id"] in used_p or p.get("authorId")]
    missing = {r for r in used_e if r not in entities}
    if missing:
        print("warning: unknown entity refs", missing, file=sys.stderr)

    with open(ARCHIVE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"entities={len(data['entities'])} people={len(data['people'])}")


if __name__ == "__main__":
    main()

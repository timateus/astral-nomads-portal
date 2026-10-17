# Astral Nomads — new portal

A new discovery interface for the [Astral Nomads](https://astralnomads.panther.kz) archive of contemporary Central Asian art.

The source site is server-rendered and has no public JSON API, so this repo contains:

1. **`scripts/crawl.py`** — politely fetches every page listed in the sitemap (RU + EN), plus paginated and filtered listings, into `.cache/pages/` (one request at a time, 0.4 s delay, cached pages are skipped).
2. **`scripts/parse.py`** — turns the cached HTML into a single bilingual dataset, `public/data/archive.json` (materials, authors, institutions, events). It reads all three metadata layouts the source uses, keeps colophon credits (idea, editing, design, translations…) and falls back to free text as the description.
3. **`scripts/enrich.py`** + **`scripts/enrichment.json`** — links the archive to the institutions, groups, projects, venues, schools and people named in its own texts (see below).
4. **A Vite + React app** that loads that JSON and does all search and filtering client-side.

```bash
npm install
npm run data   # crawl + parse (only needed to refresh the snapshot)
npm run dev
npm run build  # static site in dist/
```

## What's different from the original

- **One unified catalog** (`/explore`) across artifacts, library and multimedia, instead of three separate sections.
- **Faceted filters with live counts**: section, author, medium, theme, country, place of creation, publication type, provenance (courtesy), and format (PDF / video / image). The counts for a facet are computed with that facet's own selection left out, so you can see what each choice would give before clicking.
- **Year histogram**: drag across it to pick a range. Ghost bars show the whole archive, solid bars the current results.
- **Fuzzy, bilingual full-text search** (MiniSearch): one query matches both Russian and English titles, descriptions, keywords and mediums ("gnome" finds «гном»).
- **⌘K / `/` search palette** that jumps straight to authors, themes, mediums, events or items.
- **Grid, list and by-year timeline views**, five sort orders including shuffle; all state lives in the URL, so every view can be shared.
- **Item pages** where every metadata value links to a filtered view, plus "more by this author", "related" (shared themes, medium and period) and "same year" shelves. ←/→ step through the result set you came from. Zoomable lightbox, inline YouTube (privacy-enhanced embed), PDF download.
- **Author pages** with work counts, years active, themes, and a works grid filtered by section and year.
- **Discovery-first home page**: decades, themes, mediums, "surprise me".
- RU/EN switch, dark mode, mobile filter drawer, keyboard access.

## Enrichment: institutions and people from the archive's own texts

The source site has pages for only 3 institutions, but its materials, biographies and event descriptions name many more. `scripts/enrichment.json` is a hand-curated list, built by reading those texts, of 64 institutions, groups, projects/exhibitions, venues and schools (with name variants for matching), structured author facts (dates, education, memberships, groups, essay authors) and event roles (curators, participants, organisers, venues). Only facts stated in the archive are recorded.

`enrich.py` matches them across every text field and records the role of each link: provided by, publisher, organiser, venue, part of, mention… It also builds a people index (132 people) from catalogue artist lists, editors, credits and event texts, merging spelling variants («Е. Мельдибеков» = «Ербосын Мельдибеков», Bokonbaev/Bokonbayev).

In the app this adds an **Institutions & communities** index and pages, a **People** index and pages, an "Institutions & projects" filter in Explore, a "People & institutions" block on item pages, and facts plus connections on author and event pages. To add an entity or fix a link, edit `enrichment.json` and run `python3 -I scripts/enrich.py` after `parse.py`.

## Data notes

- Images and PDFs are hotlinked from the source server, using the signed URLs found on its pages (the image server rejects unsigned sizes). The source server is slow, so for production these should be mirrored to a CDN.
- "Medium" is derived from the free-text technique field with a few rules (`src/data.tsx`); keywords that are only an artist's surname are dropped because the author filter already covers them.
- Event status (upcoming / now / past) is computed from the dates rather than the source's labels, which go stale.
- The source's `robots.txt` disallows all crawling (it looks like a staging host). The crawler is meant for the archive owners' own use.

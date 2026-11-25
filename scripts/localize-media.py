"""Point a built archive snapshot at the files shipped with GitHub Pages."""
import json
import os
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
OLD_HOST = "https://astralnomads.panther.kz"
OFFICIAL_HOST = "https://astralnomads.net"
MEDIA_URL = re.compile(r'https://astralnomads(?:\.panther\.kz|\.net)/(?:curator/[^\s"\x27<>]+|pdf/\d+/download)')


def localize(snapshot: Path, base: str) -> None:
    manifest = json.loads((ROOT / "scripts/media-mirror.json").read_text())
    base = base.rstrip("/") + "/"
    for filename in set(manifest.values()):
        if not (ROOT / "dist/media/source-archive" / filename).is_file():
            raise FileNotFoundError(filename)

    def media_path(filename):
        return f"{base}media/source-archive/{filename}"

    def replace(match):
        source = match[0]
        filename = manifest.get(source.replace(OFFICIAL_HOST, OLD_HOST, 1))
        return media_path(filename) if filename else source.replace(OLD_HOST, OFFICIAL_HOST, 1)

    def walk(value):
        if isinstance(value, str):
            return MEDIA_URL.sub(replace, value).replace(OLD_HOST, OFFICIAL_HOST)
        if isinstance(value, list):
            return [walk(item) for item in value]
        if isinstance(value, dict):
            return {key: walk(item) for key, item in value.items()}
        return value

    archive = walk(json.loads(snapshot.read_text()))
    snapshot.write_text(json.dumps(archive, ensure_ascii=False, separators=(",", ":")) + "\n")


if __name__ == "__main__":
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "dist/data/archive.json"
    localize(target, os.environ.get("BASE_PATH", "/"))

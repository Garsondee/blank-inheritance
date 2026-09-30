"""Fonts: which face does which job, under what licence, and the vertical-form copies Japanese columns are set from.

**Why vertical-form copies.** This machine's Pillow has FreeType but no raqm/HarfBuzz, so it cannot shape vertical
text. Every good Japanese font already carries its designer's vertical forms (the long-vowel bar standing upright, small
kana sitting high and right, brackets and ellipses turned) behind the OpenType `vert` feature. fontTools reads that
feature and writes a working copy of the font whose character map points each character straight at its vertical
form, so drawing one character per square gives correct vertical punctuation with no shaping engine at all
(design/propaganda-manga.md §5.1, spike 1). The copies are cached, because writing a 65,000-glyph CJK font takes a minute.

**Every face is registered with its licence** (design/research/manga/lettering-and-sound-effects.md §5), and a test
fails if one is used without an entry. Several are stand-ins until the planned free manga faces are downloaded:
Gen'ei Antique for kana, and Comic Neue for English dialogue.
"""
import functools
import os

from fontTools.ttLib import TTFont

REPO = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

# alias -> (path, index inside a collection, licence and role)
FONTS = {
    "ja-kana": ("third-party/fonts/NotoSerifCJKjp-Bold.otf", 0,
                "SIL OFL 1.1. Kana in dialogue; stand-in for an antique kana face (Gen'ei Antique, OFL) until downloaded."),
    "ja-kanji": ("C:/Windows/Fonts/YuGothB.ttc", 0,
                 "Windows 11 bundled Yu Gothic Bold; rasterised output allowed. Kanji in dialogue, the manga gothic role."),
    "ja-gothic": ("C:/Windows/Fonts/YuGothB.ttc", 0,
                  "Windows 11 bundled Yu Gothic Bold. The loudspeaker and other institutional machines."),
    "ja-mincho": ("third-party/fonts/NotoSerifCJKjp-Medium.otf", 0,
                  "SIL OFL 1.1. The Directorate's printed voice: captions, hype lines, margin text."),
    "ja-display": ("third-party/fonts/DelaGothicOne-Regular.ttf", 0,
                   "SIL OFL 1.1. Sound effects and the title."),
    "en-dialogue": ("C:/Windows/Fonts/comicbd.ttf", 0,
                    "Windows bundled Comic Sans MS Bold; rasterised output allowed. Stand-in for Comic Neue Bold (OFL)."),
    "en-display": ("third-party/fonts/texgyreheroscn-bold.otf", 0,
                   "GUST Font License. English title, captions, hype lines and sound-effect subtitles."),
}


def cache_dir():
    """Where vertical-form copies live. Gitignored (artwork/), and overridable so tests can use a temp folder."""
    d = os.environ.get("MANGA_CACHE_DIR") or os.path.join(REPO, "artwork", "manga", "work", "cache")
    os.makedirs(d, exist_ok=True)
    return d


def path_of(alias):
    p, idx, _ = FONTS[alias]
    return (p if os.path.isabs(p) else os.path.join(REPO, p)), idx


def available(alias):
    return os.path.exists(path_of(alias)[0])


def _open(alias):
    p, idx = path_of(alias)
    return TTFont(p, fontNumber=idx) if p.lower().endswith(".ttc") else TTFont(p)


def vert_map(font):
    """{horizontal glyph name: vertical glyph name} from the font's own `vert` and `vrt2` single substitutions."""
    if "GSUB" not in font:
        return {}
    gsub = font["GSUB"].table
    wanted = set()
    for rec in gsub.FeatureList.FeatureRecord:
        if rec.FeatureTag in ("vert", "vrt2"):
            wanted.update(rec.Feature.LookupListIndex)
    mapping = {}
    for i in sorted(wanted):
        lookup = gsub.LookupList.Lookup[i]
        for st in lookup.SubTable:
            if lookup.LookupType == 7:
                st = st.ExtSubTable
            if hasattr(st, "mapping"):
                mapping.update(st.mapping)
    return mapping


@functools.lru_cache(maxsize=None)
def metrics(alias):
    """(em-box top, em-box bottom) as fractions of the em, from the font's typographic ascender and descender."""
    f = _open(alias)
    upm = f["head"].unitsPerEm
    return f["OS/2"].sTypoAscender / upm, -f["OS/2"].sTypoDescender / upm


def vertical_copy(alias):
    """Path of a working copy of the font whose cmap points at its vertical forms. Built once, then cached."""
    src, idx = path_of(alias)
    stem = os.path.splitext(os.path.basename(src))[0]
    ext = ".otf" if "CFF " in _open(alias) else ".ttf"
    out = os.path.join(cache_dir(), f"{stem}-{idx}-vert{ext}")
    if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(src):
        return out
    f = _open(alias)
    vm = vert_map(f)
    for table in f["cmap"].tables:
        if table.isUnicode():
            table.cmap = {cp: vm.get(g, g) for cp, g in table.cmap.items()}
    tmp = out + ".part"
    f.save(tmp)
    os.replace(tmp, out)
    return out


_COVERAGE = {}


def missing(alias, text):
    """The characters in `text` the font cannot draw. Yuji Syuku once dropped four of six characters from the
    Directorate's seal without a word (data/campaign/asset-registry.json, directorate-seal-lettered), so this is checked
    before every render rather than trusted."""
    if alias not in _COVERAGE:
        _COVERAGE[alias] = set(_open(alias).getBestCmap())
    return sorted({ch for ch in text if not ch.isspace() and ord(ch) not in _COVERAGE[alias]})

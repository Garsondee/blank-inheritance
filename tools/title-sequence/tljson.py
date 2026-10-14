"""Read and write data/title-sequences/*.json in the file's own layout.

The timelines are long, hand-edited files, so a change should show up in git as the lines that changed, not as the
whole file reflowed. Their layout is plain two-space JSON with floats kept as written, which is what json.dump gives.
"""
import json
import re

# the cut list's bare entries ({ "id": "R02", "in": 0.842 }) are kept on one line, as written by hand
_BARE_SHOT = re.compile(r'\{\n\s+"id": ("R\d+"),\n\s+"(in|inF)": ([-\d.]+)\n\s+\}')


def dumps(doc):
    text = json.dumps(doc, ensure_ascii=False, indent=2) + "\n"
    return _BARE_SHOT.sub(r'{ "id": \1, "\2": \3 }', text)


def load(path):
    with open(path, encoding="utf8") as f:
        return json.load(f)


def save(path, doc):
    with open(path, "w", encoding="utf8", newline="\n") as f:
        f.write(dumps(doc))

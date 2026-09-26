"""Episode title cards: the short film after the opening at the start of a session.

Ingram, 2026-09-26: "when we start a session we watch the intro video, then we cut to the episode title, then we
fade into the first scene automatically." One design, data/title-sequences/episode-card.json, is a timeline whose
text says {number_ja}, {title_ja}, {number} and {title_en}. Each episode fills it in: its English title from its own
file (data/episodes/<id>.json, `title`), its number and Japanese lines from data/title-sequences/episode-titles.json.

    python tools/title-sequence/render.py card episode-c1e1-mothers-maiden-name

Foundry plays the result from blank-inheritance-video/episode-titles/<episode id>.mp4.
"""
import copy
import json
import os

from . import timeline

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
TEMPLATE = os.path.join(ROOT, "data", "title-sequences", "episode-card.json")
TITLES = os.path.join(ROOT, "data", "title-sequences", "episode-titles.json")
EPISODES = os.path.join(ROOT, "data", "episodes")
FIELDS = ("number", "number_ja", "title_en", "title_ja")


def _read(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def fields(episode_id, titles=None, episodes=EPISODES):
    """What an episode's card says: {number, number_ja, title_en, title_ja}."""
    titles = titles if titles is not None else _read(TITLES)
    if episode_id not in titles["episodes"]:
        raise KeyError(f"{episode_id} has no entry in data/title-sequences/episode-titles.json")
    entry = titles["episodes"][episode_id]
    episode = _read(os.path.join(episodes, episode_id + ".json"))
    return {"number": str(entry["number"]), "number_ja": entry["numberJa"], "title_ja": entry["titleJa"],
            "title_en": episode["title"].upper().replace("'", "’")}      # caps, with a real apostrophe


def fill(template, values):
    """The template with every {field} in its text replaced (a plain replace, so no other braces matter)."""
    doc = copy.deepcopy(template)
    for c in doc["clips"]:
        for item in c["layer"].get("items", []):
            for name in FIELDS:
                item["text"] = item["text"].replace("{" + name + "}", values[name])
    return doc


def build(episode_id, template=None, titles=None, episodes=EPISODES):
    """An episode's title card, ready to render: the design filled in and normalized."""
    template = template if template is not None else _read(TEMPLATE)
    doc = fill(template, fields(episode_id, titles, episodes))
    doc["id"] = f"episode-card-{episode_id}"
    return timeline.normalize(doc)


def video_name(episode_id):
    """Where Foundry looks for it, inside the opening's video folder."""
    return f"episode-titles/{episode_id}.mp4"

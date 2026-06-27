import json


def load_config(path):
    with open(path) as f:
        return json.load(f)


def validate_config(cfg):
    errors = []
    if not cfg.get("repo"):
        errors.append("config: missing required 'repo' (e.g. owner/name)")
    targets = cfg.get("targets")
    if not isinstance(targets, list):
        errors.append("config: 'targets' must be a list")
        return errors
    for i, t in enumerate(targets):
        if not t.get("url"):
            errors.append(f"config: targets[{i}] ({t.get('name', '?')}) missing 'url'")
    return errors

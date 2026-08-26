"""Audit every <Input> / <textarea> in the app for autofill handling.

Each field must either:
  - spread noAutofillProps(...) / AUTOFILL_OFF_ATTRS  (search, filter, config), or
  - declare an explicit autoComplete=... (credential / contact fields), or
  - be a non-text control (range, checkbox, radio, file).
"""
import io
import re
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent / "src"
files = sorted(ROOT.rglob("*.tsx"))

# Match <Input ... /> and <textarea ... > including multi-line tags
TAG = re.compile(r"<(Input|CommandInput|textarea)\b(.*?)(/>|>)", re.S)

NON_TEXT = ("type=\"range\"", "type=\"checkbox\"", "type=\"radio\"", "type=\"file\"")

ok, needs_review = [], []

for f in files:
    src = io.open(f, encoding="utf-8", errors="replace").read()
    for m in TAG.finditer(src):
        tag, attrs, _ = m.group(1), m.group(2), m.group(3)
        line = src[: m.start()].count("\n") + 1
        flat = " ".join(attrs.split())

        if any(nt in flat for nt in NON_TEXT):
            continue  # slider / checkbox: autofill not applicable

        has_helper = "noAutofillProps" in flat or "AUTOFILL_OFF_ATTRS" in flat
        has_explicit = "autoComplete" in flat

        label = f"{f.as_posix()}:{line} <{tag}>"
        placeholder = re.search(r'placeholder=(?:"([^"]*)"|\{`([^`]*)`\})', flat)
        ph = (placeholder.group(1) or placeholder.group(2)) if placeholder else ""
        ph = ph[:48]

        if has_helper or has_explicit:
            kind = "helper" if has_helper else "explicit"
            ok.append(f"  [{kind:8}] {label}  {ph!r}")
        else:
            needs_review.append(f"  [UNGUARDED] {label}  {ph!r}")

IGNORE = ("components/ui/sidebar.tsx", "components/ui/textarea.tsx")
needs_review = [l for l in needs_review if not any(i in l for i in IGNORE)]

print(f"=== guarded: {len(ok)} ===")
for l in ok:
    print(l)

print(f"\n=== unguarded: {len(needs_review)} ===")
for l in needs_review:
    print(l)

sys.exit(1 if needs_review else 0)

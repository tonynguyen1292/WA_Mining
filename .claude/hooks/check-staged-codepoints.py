#!/usr/bin/env python3
"""Block a git commit that would put bad codepoints into history.

Runs as a PreToolUse hook on `git commit`. Three checks, each scoped to
something that has actually broken this repo -- deliberately NOT "flag all
non-ASCII", because the prose in README/DECISIONS/plan files legitimately
uses em-dashes, arrows and ticks. A guard that cries wolf on every docs
commit gets switched off within a day, and then it protects nothing.

1. Literal U+FEFF (BOM) in any staged text file. Six occurrences so far,
   each read as a mystery syntax or render bug. CI fails on this too; the
   hook just catches it ~30 seconds earlier, before it is in history.
2. Non-ASCII in the Unity prototype's C# files. The prototype renders with
   LegacyRuntime.ttf, which has no glyph for em-dash, ellipsis or
   guillemets -- they render as blank gaps in the WebGL build.
3. CJK characters in the commit message itself, which is how a stray
   Chinese ideograph once landed in a commit subject.

Exit 0 = allow. Exit 2 = block, with the reason fed back to the model.
"""

import json
import re
import subprocess
import sys

TEXT_SUFFIXES = (
    ".py", ".ts", ".mts", ".cts", ".tsx", ".js", ".jsx", ".css", ".html",
    ".yml", ".yaml", ".json", ".md", ".toml", ".cs", ".sh", ".sql",
)

BOM = "\ufeff"


def git(*args):
    return subprocess.run(
        ["git", *args], capture_output=True, text=True, encoding="utf-8", errors="replace"
    )


def is_cjk(ch):
    cp = ord(ch)
    return (
        0x4E00 <= cp <= 0x9FFF      # CJK unified ideographs
        or 0x3040 <= cp <= 0x30FF   # hiragana + katakana
        or 0xAC00 <= cp <= 0xD7AF   # hangul syllables
    )


def main():
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0  # Malformed payload is not the commit's fault; stay out of the way.

    command = payload.get("tool_input", {}).get("command", "")
    problems = []

    # 3. The commit message travels in the command string itself.
    if BOM in command:
        problems.append("The commit command contains a literal U+FEFF (BOM).")
    cjk = {ch for ch in command if is_cjk(ch)}
    if cjk:
        found = " ".join(sorted(f"{ch} (U+{ord(ch):04X})" for ch in cjk))
        problems.append(f"The commit message contains CJK characters: {found}")

    # 1 and 2. Inspect staged content, not the working tree -- they can differ.
    staged = git("diff", "--cached", "--name-only", "--diff-filter=ACM")
    if staged.returncode != 0:
        return 0  # Not a git repo, or nothing staged yet; let git report it.

    for path in [p for p in staged.stdout.splitlines() if p.strip()]:
        if not path.lower().endswith(TEXT_SUFFIXES):
            continue
        blob = git("show", f":{path}")
        if blob.returncode != 0:
            continue
        content = blob.stdout

        if BOM in content:
            idx = content.index(BOM)
            line = content[:idx].count("\n") + 1
            problems.append(f"{path}:{line} contains a literal U+FEFF (BOM).")

        if path.lower().endswith(".cs") and "prototypes/" in path.replace("\\", "/"):
            for m in re.finditer(r"[^\x00-\x7F]", content):
                line = content[: m.start()].count("\n") + 1
                problems.append(
                    f"{path}:{line} has non-ASCII {m.group()!r} "
                    f"(U+{ord(m.group()):04X}) -- the prototype's font cannot render it."
                )
                break  # One report per file is enough to prompt a look.

    if problems:
        print("Commit blocked by the staged-codepoint check:\n", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        print(
            "\nFix at codepoint level with Python (editors and heredocs re-introduce "
            'these characters silently): use the "\\ufeff" escape rather than the raw '
            "character, and keep Unity runtime strings ASCII.",
            file=sys.stderr,
        )
        return 2

    return 0


if __name__ == "__main__":
    sys.exit(main())

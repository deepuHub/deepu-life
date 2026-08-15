#!/usr/bin/env python3
"""
Strips the password from encrypted statement PDFs so extract_et.py can read them.

The password is read with getpass — it is not echoed to the terminal, not saved
to shell history, and not written to any file. Decrypted copies land in a
sibling `_decrypted/` folder; the originals are left untouched.

    python3 scripts/decrypt_statements.py

Needs pypdf. If it isn't installed:
    python3 -m venv ~/.venv-pdf && ~/.venv-pdf/bin/pip install pypdf
    ~/.venv-pdf/bin/python scripts/decrypt_statements.py
"""

import getpass
import hashlib
import os
import sys

try:
    from pypdf import PdfReader, PdfWriter
except ImportError:
    sys.exit("pypdf not installed — see the header of this file for the one-liner.")

SRC = os.path.expanduser(os.environ.get("ET_CARD_DIR", "~/Downloads/statements"))
DST = os.path.join(SRC, "_decrypted")


def main():
    if not os.path.isdir(SRC):
        sys.exit(f"Not found: {SRC}")

    pdfs = sorted(f for f in os.listdir(SRC) if f.lower().endswith(".pdf"))
    if not pdfs:
        sys.exit(f"No PDFs in {SRC}")

    # Several statements are byte-identical duplicates; decrypt each only once.
    seen, unique = {}, []
    for name in pdfs:
        digest = hashlib.md5(open(os.path.join(SRC, name), "rb").read()).hexdigest()
        if digest in seen:
            continue
        seen[digest] = name
        unique.append(name)
    print(f"{len(pdfs)} files, {len(unique)} unique after dedupe.")

    pw = getpass.getpass("Statement password (not echoed): ")
    os.makedirs(DST, exist_ok=True)

    ok = failed = 0
    for name in unique:
        try:
            reader = PdfReader(os.path.join(SRC, name))
            if reader.is_encrypted and not reader.decrypt(pw):
                print(f"  wrong password: {name}")
                failed += 1
                continue
            writer = PdfWriter()
            for page in reader.pages:
                writer.add_page(page)
            with open(os.path.join(DST, name), "wb") as f:
                writer.write(f)
            ok += 1
        except Exception as exc:
            print(f"  failed {name}: {type(exc).__name__}: {exc}")
            failed += 1

    print(f"\ndecrypted {ok} -> {DST}" + (f"   ({failed} failed)" if failed else ""))
    if ok:
        print("Now re-run:  python3 scripts/extract_et.py")


if __name__ == "__main__":
    main()

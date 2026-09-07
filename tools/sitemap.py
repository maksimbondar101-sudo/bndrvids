#!/usr/bin/env python3
"""Regenerate sitemap.xml from the pages that are actually in the repo.

Run it after editing pages and before committing:

    python3 tools/sitemap.py

Why this exists: the sitemap was maintained by hand and drifted. Five lastmod
dates were a week stale before anyone noticed, and a page added without a
matching entry is invisible until someone thinks to check. Deriving the file
from the pages themselves removes both failure modes.

What counts as public, and therefore gets listed:

  - it is a .html file in the repo root
  - it does NOT carry <meta name="robots" content="noindex">
  - it is not 404.html

That is the whole rule. /start is excluded automatically because it is
noindex, which is deliberate and explained in robots.txt.

The script also refuses to write a sitemap that disagrees with the pages: a
missing or mismatched canonical is an error, not a warning, because a sitemap
entry pointing somewhere the page itself disowns is worse than no entry.
"""

import glob
import os
import re
import subprocess
import sys
from datetime import date

SITE = 'https://bndrvids.com'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEVER_LISTED = {'404.html'}


def route_for(filename):
    return '/' if filename == 'index.html' else '/' + filename[:-len('.html')]


def last_modified(filename):
    """The date this page last changed, from git.

    Uncommitted edits report today: the file is about to be committed, and
    dating it by the previous commit would publish a lastmod that is already
    wrong the moment it lands.
    """
    dirty = subprocess.run(['git', 'diff', '--quiet', '--', filename],
                           cwd=ROOT).returncode != 0
    staged = subprocess.run(['git', 'diff', '--cached', '--quiet', '--', filename],
                            cwd=ROOT).returncode != 0
    if dirty or staged:
        return date.today().isoformat()
    out = subprocess.check_output(
        ['git', 'log', '-1', '--format=%ad', '--date=short', '--', filename],
        cwd=ROOT).decode().strip()
    return out or date.today().isoformat()


def main():
    os.chdir(ROOT)
    pages = sorted(glob.glob('*.html'))
    if not pages:
        sys.exit('no pages found; is this being run from the repo?')

    listed, skipped, problems = [], [], []

    for filename in pages:
        src = open(filename, encoding='utf-8').read()
        route = route_for(filename)

        if filename in NEVER_LISTED:
            skipped.append((route, 'error page'))
            continue
        if re.search(r'<meta\s+name="robots"\s+content="[^"]*noindex', src):
            skipped.append((route, 'noindex'))
            continue

        canonical = re.search(r'<link rel="canonical" href="([^"]*)"', src)
        if not canonical:
            problems.append(f'{filename}: indexable but has no canonical link')
        elif canonical.group(1) != SITE + route:
            problems.append(
                f'{filename}: canonical is {canonical.group(1)}, '
                f'but its route is {SITE + route}')

        listed.append((route, last_modified(filename)))

    if problems:
        print('sitemap NOT written:\n  ' + '\n  '.join(problems), file=sys.stderr)
        return 1

    # Homepage first, then alphabetical. Order carries no meaning to a crawler,
    # but a stable order keeps the diff readable when one date changes.
    listed.sort(key=lambda row: (row[0] != '/', row[0]))

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for route, lastmod in listed:
        lines.append(f'  <url><loc>{SITE}{route}</loc><lastmod>{lastmod}</lastmod></url>')
    lines.append('</urlset>')
    body = '\n'.join(lines) + '\n'

    before = open('sitemap.xml', encoding='utf-8').read() if os.path.exists('sitemap.xml') else None
    open('sitemap.xml', 'w', encoding='utf-8').write(body)

    print(f'sitemap.xml: {len(listed)} public pages')
    for route, lastmod in listed:
        print(f'  {route:16} {lastmod}')
    for route, why in skipped:
        print(f'  {route:16} excluded ({why})')
    print('unchanged' if before == body else 'CHANGED')
    return 0


if __name__ == '__main__':
    sys.exit(main())

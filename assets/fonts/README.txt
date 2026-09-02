Fonts shipped with this site
============================

DM Sans          — DMSans.woff2 (variable: wght 100–1000, opsz 9–40)
                   DMSans.ttf   (same face, kept as the unconverted source and
                                 as a src fallback for pre-WOFF2 browsers)
DM Serif Display — DMSerifDisplay-latin.woff2
                   DMSerifDisplay-latin-ext.woff2
                   (the two subsets Google Fonts itself serves, self-hosted so
                    the site makes no third-party request to render its type)

Both families are from https://github.com/googlefonts/dm-fonts and are licensed
under the SIL Open Font License 1.1 — see OFL.txt. Copyright lines:

  Copyright 2014 The DM Sans Project Authors
  Copyright 2014-2018 The DM Serif Display Project Authors

Regenerating DMSans.woff2 from the TTF:

  pip install fonttools brotli
  python -c "from fontTools.ttLib import TTFont; f=TTFont('DMSans.ttf'); \
             f.flavor='woff2'; f.save('DMSans.woff2')"

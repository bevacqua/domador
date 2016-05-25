# v2.4.2 Rosetta Stone

- Domador now detects code block languages using `fencinglanguage` in `<code>` in addition to `<pre>` tags

# v2.4.1 Pre-order Today

- Fixed an issue where `domador` wouldn't preserve whitespace in code blocks

# v2.4.0 Tableau

- Fixed an issue where `domador` would mess up tables that came after lists
- List item output defaults to a prefix of `'- '` instead of the old `'* '` behavior

# v2.3.1 Bubble Wrap

- Fixed an issue where `domador` would pass the internal initial wrapper container to `transform` option

# v2.3.0 Pin Market

- Introduced support for `markers`, helpful in a variety of cases

# v2.2.1 Suspicious Clown

- Fixed a bug in client-side implementation of `<table>` support

# v2.2.0 Murder Central

- Added `allowFrame` to enable cautious `<iframe>` support
- Introduced support for GitHub flavored Markdown tables out the box

# v2.1.3 Murky Waters

- Added support for server-side document-relative urls
- Updated `jsdom@8.0.2`

# v2.1.2 Mark

- Added support for `<mark>` tags
- Updated `jsdom@5.6.1`

# v2.1.0 Bootleg

- Moved `jsdom` to hard `dependencies`

# v2.0.0 Check Sum

- Updated `jsdom` to latest

# v1.2.1 Fanfare

- Moved `jsdom` to hard `dependencies`

# v1.2.0 Check Mate

- Merged `<a>` logic with `<img>` logic for consistency.
- Image tags are now added as footnote references by default

# v1.1.4 Ping Pong

- Shim `Node` to play well with IE < 9

# v1.1.2 Dependency Optional

- Moved `jsdom` into `optionalDependencies`

# v1.1.0 Reliable Apparatus

- Fixed an eager escaping bug where every single `#` character would be escaped
- Removed extra line breaks that would occur before link reference footnotes
- Link references now start at `[1]` instead of `[0]`
- Introduced an API method that allows to transform any part of the DOM tree using a custom handler

# v1.0.0 IPO

- Initial Public Release

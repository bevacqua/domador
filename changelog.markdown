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

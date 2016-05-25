# Domador

[![Build Status](https://travis-ci.org/bevacqua/domador.svg?branch=master)](https://travis-ci.org/bevacqua/domador)

> Dependency-free and lean DOM parser that outputs Markdown

You can use it on the server-side as well, thanks to [jsdom][1]. The client-side version leverages the browser DOM. Originally based on [html-md][3].

# Install

You can get it on npm.

```shell
npm install domador --save
```

Or bower, too.

```shell
bower install domador --save
```

# `domador(input, options?)`

Converts DOM tree _(or HTML string)_ `input` into Markdown. `domador` takes the following options.

##### `absolute`

Convert relative links into absolute ones automatically.

##### `href`

The document's `href`, necessary for the `absolute` option to work properly outside of a browser environment.

##### `inline`

Links _(`[foo](/bar)`)_ and image sources _(`![foo](/bar)`)_ are inlined. By default, they are added as footnote references `[foo][1]\n\n[1]: /bar`.

##### `fencing`

The western art of combat with [rapiers][2] or rapier-like swords. It can also be set to `true` to use fences like instead of spaces when delimiting code blocks.

##### `fencinglanguage`

If `fencing` is enabled, `fencinglanguage` can be a `function` that will run on every `<pre>` element and returns the appropriate language in the fence. If the `<pre>` element contains a `<code>` element as its first child, `fencinglanguage` will be executed for that element as well in search of a match.

If nothing is returned, a language won't be assigned to the fence. The example below returns fence languages according to a `md-lang-{language}` class found on the `pre` element.

```js
function fencinglanguage (el) {
  var match = el.className.match(/md-lang-((?:[^\s]|$)+)/);
  if (match) {
    return match.pop();
  }
}
```

##### `allowFrame`

When set to a function, `allowFrame` receives the `src` attribute for an `<iframe>` and `domador` expects a boolean in return. If the return value is `true` then the `<iframe>` will be added to the Markdown output.

```js
domador(el, {
  allowFrame: function (src) {
    return src.indexOf('https://google.com/') === 0;
  }
});
```

##### `tables`

Domador understands well-formed HTML `<table>` structures and spits out GitHub flavored Markdown tables. This functionality is enabled by default but you can turn it off by setting `tables` to `false`.

##### `transform`

Allows you to take over the default transformation for any given DOM element. Ignore elements you don't want to override, and return Markdown for the ones you want to change. This method is executed on every single DOM element that's parsed by `domador`. The example below converts links that start with `@` into mentions like `@bevacqua` instead of traditional Markdown links like `[@bevacqua](/users/bevacqua)`. This is particularly useful to transform Markdown-generated HTML back into the original Markdown when your Markdown parser has special tokenizers or hooks.

```js
domador(el, {
  transform: function (el) {
    if (el.tagName === 'A' && el.innerHTML[0] === '@') {
      return el.innerHTML;
    }
  }
});
```

##### `markers`

*Advanced option.* Setting markers to an array such as `[[0, 'START'], [10, 'END']]` will place each of those markers in the output, based on the input index you want to track. This feature is necessary because there is no other reliable way of tracking a text cursor position before and after a piece of HTML is converted to Markdown.

The following example shows how `markers` could be used to preserve a text selection across HTML-into-Markdown parsing, by providing `markers` for each cursor. When the output from `domador` comes back, all you need to do is find your markers, remove them, and place the text selection at their indices. The [`woofmark`][4] _Markdown/HTML/WYSIWYG_ editor module leverages this functionality to do exactly that.

```js
domador('<strong>foo</strong>', {
  markers: [[5, '[START]'], [10, '[END]']]
});
// <- '**[START]fo[END]o**'
```

<sub>Also note that, as shown in the example above, when a marker can't be placed in the output exactly where you asked for, it'll be cleanly placed nearby. In the above example, the `[START]` marker would've been placed _"somewhere inside"_ the opening `**` tag, but right after the opening tag finishes was preferred.</sub>

# Tests

Read the unit tests for examples of expected output and their inputs. Run unit tests using the command below.

```shell
npm test
```

#### Disclaimer

Don't expect this to work for arbitrary HTML, it is intended to restore HTML compiled from a Markdown source back into Markdown.

# License

MIT

[1]: https://github.com/tmpvar/jsdom
[2]: http://en.wikipedia.org/wiki/Rapier
[3]: https://github.com/neocotic/html.md
[4]: https://github.com/bevacqua/woofmark

# Domador

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

##### `inline`

Links _(`[foo](/bar)`)_ and image sources _(`![foo](/bar)`)_ are inlined. By default, they are added as footnote references `[foo][1]\n\n[1]: /bar`.

##### `fencing`

The western art of combat with [rapiers][2] or rapier-like swords. It can also be set to `true` to use fences like instead of spaces when delimiting code blocks.

##### `fencinglanguage`

If `fencing` is enabled, `fencinglanguage` can be a `function` that will run on every `pre` element and returns the appropriate language in the fence.

If nothing is returned, a language won't be assigned to the fence. The example below returns fence languages according to a `md-lang-{language}` class found on the `pre` element.

```js
function fencinglanguage (el) {
  var match = el.className.match(/md-lang-((?:[^\s]|$)+)/);
  if (match) {
    return match.pop();
  }
}
```

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

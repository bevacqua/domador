# Domador

> Dependency-free and lean DOM parser that outputs Markdown

You can use it on the server-side as well, thanks to [jsdom][1]. The client-side version leverages the browser DOM.

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

##### `fencing`

The western art of combat with [rapiers][2] or rapier-like swords. It can also be set to `true` to use fences like `` ``` `` instead of spaces `    ` when delimiting code blocks.

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

Read the unit tests for examples of expected output and their inputs.

#### Disclaimer

Don't expect this to work for arbitrary HTML, it is intended to restore HTML compiled from a Markdown source back into Markdown.

# License

MIT

[1]: https://github.com/tmpvar/jsdom
[2]: http://en.wikipedia.org/wiki/Rapier

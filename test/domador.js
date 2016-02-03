'use strict';

var fs = require('fs');
var test = require('tape');
var domador = require('..');

function read (file) {
  return fs.readFileSync('./test/fixtures/' + file, 'utf8').trim();
}

function write (file, data) { /* jshint ignore:line */
  return fs.writeFileSync('./test/fixtures/' + file, data + '\n', 'utf8');
}

test('domador parses basic HTMl strings', function (t) {
  t.equal(domador('<b>foo</b>'), '**foo**');
  t.equal(domador('<em>foo</em>'), '_foo_');
  t.equal(domador('<em><b>foo</b></em>'), '_**foo**_');
  t.equal(domador('<p>foo</p><blockquote>bar</blockquote>'), 'foo\n\n> bar');
  t.equal(domador('<p>foo</p><blockquote>bar<br>baz</blockquote>'), 'foo\n\n> bar  \n> baz');
  t.equal(domador('<p>foo</p><pre><code>var bar = 1</code></pre>'), 'foo\n    \n    var bar = 1');
  t.end();
});

test('domador gets <mark> right', function (t) {
  t.equal(domador('<mark>foo</mark>'), '<mark>foo</mark>');
  t.equal(domador('<mark>foo bar baz</mark>'), '<mark>foo bar baz</mark>');
  t.equal(domador('<mark>foo <em>bar baz</em> </mark>'), '<mark>foo _bar baz_ </mark>');
  t.end();
});

test('domador gets blockquotes right', function (t) {
  t.equal(domador('<blockquote>bar</blockquote>'), '> bar');
  t.equal(domador('<blockquote><p>bar</p></blockquote>'), '> bar');
  t.equal(domador('<blockquote><h1>bar</h1></blockquote>'), '> # bar');
  t.equal(domador('<blockquote><h1>bar</h1><p>bort</p></blockquote>'), '> # bar\n> \n> bort');
  t.equal(domador('<p>a</p><blockquote><h1>bar</h1><p>bort</p></blockquote>'), 'a\n\n> # bar\n> \n> bort');
  t.equal(domador([
    '<p>Creating point.</p>',
    '<blockquote>',
    '<p>Click on the button to see this text come to life as HTML, the markup language of the web.</p>',
    '<p>– Nico</p>',
    '</blockquote>'
  ].join('')), 'Creating point.\n\n> Click on the button to see this text come to life as HTML, the markup language of the web.\n> \n> -- Nico');
  t.equal(domador([
    '<p>Creating point.</p>',
    '<blockquote>',
    '<p>Click on the button to see this text come to life as HTML, the markup language of the web.</p>',
    '<p>– Nico</p>',
    '</blockquote>'
  ].join('\n')), 'Creating point.\n\n> Click on the button to see this text come to life as HTML, the markup language of the web.\n> \n> -- Nico');
  t.end();
});

test('articles get the appropriate treatment', function (t) {
  t.ok(domador(read('article.html')) === read('article.md'));
  t.end();
});

test('blockquotes get the appropriate treatment', function (t) {
  t.ok(domador(read('blockquote.html')) === read('blockquote.md'));
  t.end();
});

test('end-heading get the appropriate treatment', function (t) {
  t.ok(domador(read('end-heading.html')) === read('end-heading.md'));
  t.end();
});

test('domador gets fencing', function (t) {
  t.equal(domador('<p>foo</p><pre><code>var bar = 1</code></pre>', { fencing: true }), 'foo\n\n```\nvar bar = 1\n```');
  t.equal(domador('<p>foo</p><pre><code>var bar = 1</code></pre><p>baz</p>', { fencing: true }), 'foo\n\n```\nvar bar = 1\n```\n\nbaz');
  t.equal(domador('<p>foo</p><pre><code>var bar = 1;\nconsole.log(bar);</code></pre>', { fencing: true }), 'foo\n\n```\nvar bar = 1;\nconsole.log(bar);\n```');
  t.end();
});

test('domador gets fencing languages', function (t) {
  t.equal(
    domador(
      '<p>foo</p><pre class="md-lang-js"><code>var bar = 1;\nconsole.log(bar);</code></pre>',
      { fencing: true, fencinglanguage: lang }
    ),
    'foo\n\n```js\nvar bar = 1;\nconsole.log(bar);\n```'
  );

  function lang (el) {
    var match = el.className.match(/md-lang-((?:[^\s]|$)+)/);
    if (match) {
      return match.pop();
    }
  }
  t.end();
});

test('by default, domador just linkifies', function (t) {
  t.equal(domador([
    '<p>Hey <a href="/users/bevacqua">@bevacqua</a> that\'s a nice thought.</p>'
  ].join('')), 'Hey [@bevacqua][1] that\'s a nice thought.\n\n[1]: /users/bevacqua');
  t.equal(domador([
    '<p>Hey <a href="/users/bevacqua">@bevacqua</a> that\'s a nice thought.</p>'
  ].join(''), {inline: true}), 'Hey [@bevacqua](/users/bevacqua) that\'s a nice thought.');
  t.end();
});

test('if asked nicely, domador will do anything for you', function (t) {
  t.equal(domador([
    '<p>Hey <a href="/users/bevacqua">@bevacqua</a> that\'s a nice thought.</p>'
  ].join(''), {
    transform: function (el) {
      if (el.tagName === 'A' && el.innerHTML[0] === '@') {
        return el.innerHTML;
      }
    }
  }), 'Hey @bevacqua that\'s a nice thought.');
  t.end();
});

test('about absolute href', function (t) {
  t.equal(domador('<a href="/foo">foo</a>', { absolute: true }), '[foo][1]\n\n[1]: /foo');
  t.equal(domador('<a href="/foo">foo</a>', { absolute: true, href: 'https://google.com/s/' }), '[foo][1]\n\n[1]: https://google.com/foo');
  t.equal(domador('<a href="foo">foo</a>', { absolute: true, href: 'https://google.com/s/' }), '[foo][1]\n\n[1]: https://google.com/s/foo');
  t.end();
});

test('tables are ignored when tables turned off', function (t) {
  t.equal(domador(`<table>
    <thead>
    <tr>
    <th>colu1</th>
    <th><strong>colum2</strong></th>
    <th>column3</th>
    </tr>
    </thead>
    <tbody>
    <tr>
    <td>foo</td>
    <td><em>bar</em></td>
    <td>baz</td>
    </tr>
    <tr>
    <td>food</td>
    <td>bars</td>
    <td>bats</td>
    </tr>
    </tbody>
    </table>`, { tables: false }),
`colu1\n**colum2**\ncolumn3\nfoo\n_bar_\nbaz\nfood\nbars\nbats`);
  t.end();
});

test('tables are parsed into gfm tables by default', function (t) {
  t.equal(domador(`<table>
    <thead>
    <tr>
    <th>colu1</th>
    <th>colum2</th>
    <th>column3</th>
    </tr>
    </thead>
    <tbody>
    <tr>
    <td>foo</td>
    <td>bar</td>
    <td>baz</td>
    </tr>
    <tr>
    <td>food</td>
    <td>bars</td>
    <td>bats</td>
    </tr>
    </tbody>
    </table>`),
`| colu1 | colum2 | column3 |
|-------|--------|---------|
| foo   | bar    | baz     |
| food  | bars   | bats    |`);
  t.end();
});

test('tables with complex content still get proper padding', function (t) {
  t.equal(domador(`<table>
    <thead>
    <tr>
    <th>colu1</th>
    <th><strong>colum2</strong></th>
    <th>column3</th>
    </tr>
    </thead>
    <tbody>
    <tr>
    <td>foo</td>
    <td><em>bar</em></td>
    <td>baz</td>
    </tr>
    <tr>
    <td>food</td>
    <td>bars</td>
    <td>bats</td>
    </tr>
    </tbody>
    </table>`),
`| colu1 | **colum2** | column3 |
|-------|------------|---------|
| foo   | _bar_      | baz     |
| food  | bars       | bats    |`);
  t.end();
});

test('domador understands markers', function (t) {
  t.equal(domador('<strong>foo</strong>', { markers: [[0, '[START]'], [0, '[END]']] }), '[START][END]**foo**');
  t.equal(domador('<strong>foo</strong>', { markers: [[6, '[START]'], [10, '[END]']] }), '**[START]fo[END]o**');
  t.equal(domador('<strong>foo</strong>', { markers: [[8, '[START]'], [10, '[END]']] }), '**[START]fo[END]o**');
  t.equal(domador('<code class="md-lang-js">foo</code>', { markers: [[8, '[START]'], [26, '[END]']] }), '`[START]f[END]oo`');
  t.end();
});

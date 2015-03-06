'use strict';

var fs = require('fs');
var test = require('tape');
var domador = require('..');

function read (file) {
  return fs.readFileSync('./test/fixtures/' + file, 'utf8').trim();
}

function write (file, data) {
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

test('articles get the appropriate treatment', function (t) {
  t.ok(domador(read('article.html')) === read('article.md'));
  t.end();
});

test('blockquotes get the appropriate treatment', function (t) {
  t.ok(domador(read('blockquote.html')) === read('blockquote.md'));
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

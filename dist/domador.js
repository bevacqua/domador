!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.domador=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

require('string.prototype.repeat');

var replacements = {
  '\\\\': '\\\\',
  '\\[': '\\[',
  '\\]': '\\]',
  '>': '\\>',
  '_': '\\_',
  '\\*': '\\*',
  '`': '\\`',
  '#': '\\#',
  '([0-9])\\.(\\s|$)': '$1\\.$2',
  '\u00a9': '(c)',
  '\u00ae': '(r)',
  '\u2122': '(tm)',
  '\u00a0': ' ',
  '\u00b7': '\\*',
  '\u2002': ' ',
  '\u2003': ' ',
  '\u2009': ' ',
  '\u2018': '\'',
  '\u2019': '\'',
  '\u201c': '"',
  '\u201d': '"',
  '\u2026': '...',
  '\u2013': '--',
  '\u2014': '---'
};
var replacers = Object.keys(replacements).reduce(replacer, {});
var rspaces = /^\s+|\s+$/g;
var rdisplay = /(display|visibility)\s*:\s*[a-z]+/gi;
var rhidden = /(none|hidden)\s*$/i;
var rheading = /^H([1-6])$/;
var shallowTags = [
  'APPLET', 'AREA', 'AUDIO', 'BUTTON', 'CANVAS', 'DATALIST', 'EMBED', 'HEAD', 'INPUT', 'MAP',
  'MENU', 'METER', 'NOFRAMES', 'NOSCRIPT', 'OBJECT', 'OPTGROUP', 'OPTION', 'PARAM', 'PROGRESS',
  'RP', 'RT', 'RUBY', 'SCRIPT', 'SELECT', 'STYLE', 'TEXTAREA', 'TITLE', 'VIDEO'
];
var paragraphTags = [
  'ADDRESS', 'ARTICLE', 'ASIDE', 'DIV', 'FIELDSET', 'FOOTER', 'HEADER', 'NAV', 'P', 'SECTION'
];
var windowContext = require('./virtualWindowContext');

function replacer (result, key) {
  result[key] = new RegExp(key, 'g'); return result;
}

function many (text, times) {
  return new Array(times + 1).join(text);
}

function padLeft (text, times) {
  return many(' ', times) + text;
}

function trim (text) {
  if (text.trim) {
    return text.trim();
  }
  return text.replace(rspaces, '');
}

function attr (el, prop, direct) {
  var proper = direct === void 0 || direct;
  if (proper || typeof el.getAttribute !== 'function') {
    return el[prop] || '';
  }
  return el.getAttribute(prop) || '';
}

function has (el, prop, direct) {
  var proper = direct === void 0 || direct;
  if (proper || typeof el.hasAttribute !== 'function') {
    return el.hasOwnProperty(prop);
  }
  return el.hasAttribute(prop);
}

function processPlainText (text, tagName) {
  var key;
  var block = paragraphTags.indexOf(tagName) !== -1 || tagName === 'BLOCKQUOTE';
  text = text.replace(/\n([ \t]*\n)+/g, '\n');
  text = text.replace(/\n[ \t]+/g, '\n');
  text = text.replace(/[ \t]+/g, ' ');
  for (key in replacements) {
    text = text.replace(replacers[key], replacements[key]);
  }
  text = text.replace(/(\s*)\\#/g, block ? removeUnnecessaryEscapes : '$1#');
  return text;

  function removeUnnecessaryEscapes (escaped, spaces, i) {
    return i ? spaces + '#' : escaped;
  }
}

function processCode (text) {
  return text.replace(/`/g, '\\`');
}

function noop () {}

function parse (html, options) {
  return new Domador(html, options).parse();
}

function Domador (html, options) {
  this.html = html || '';
  this.htmlIndex = 0;
  this.options = options || {};
  this.markers = this.options.markers ? this.options.markers.sort(asc) : [];
  this.windowContext = windowContext(this.options);
  this.atLeft = this.noTrailingWhitespace = this.atP = true;
  this.buffer = this.childBuffer = '';
  this.exceptions = [];
  this.order = 1;
  this.listDepth = 0;
  this.inCode = this.inPre = this.inOrderedList = false;
  this.last = null;
  this.left = '\n';
  this.links = [];
  this.linkMap = {};
  this.unhandled = {};
  if (this.options.absolute === void 0) { this.options.absolute = false; }
  if (this.options.fencing === void 0) { this.options.fencing = false; }
  if (this.options.fencinglanguage === void 0) { this.options.fencinglanguage = noop; }
  if (this.options.transform === void 0) { this.options.transform = noop; }
  function asc (a, b) { return a[0] - b[0]; }
}

Domador.prototype.append = function append (text) {
  if (this.last != null) {
    this.buffer += this.last;
  }
  this.childBuffer += text;
  return this.last = text;
};

Domador.prototype.br = function br () {
  this.append('  ' +  this.left);
  return this.atLeft = this.noTrailingWhitespace = true;
};

Domador.prototype.code = function code () {
  var old;
  old = this.inCode;
  this.inCode = true;
  return (function(_this) {
    return function after () {
      return _this.inCode = old;
    };
  })(this);
};

Domador.prototype.li = function li () {
  var result;
  result = this.inOrderedList ? (this.order++) + '. ' : '* ';
  result = padLeft(result, (this.listDepth - 1) * 2);
  return this.append(result);
};

Domador.prototype.td = function td (header) {
  this.noTrailingWhitespace = false;
  this.output(' ');
  this.childBuffer = '';
  this.noTrailingWhitespace = false;
  return function after () {
    var spaces = header ? 0 : Math.max(0, this.tableCols[this.tableCol++] - this.childBuffer.length);
    this.append(' '.repeat(spaces + 1) + '|');
    this.noTrailingWhitespace = true;
  };
};

Domador.prototype.ol = function ol () {
  var inOrderedList, order;
  if (this.listDepth === 0) {
    this.p();
  }
  inOrderedList = this.inOrderedList;
  order = this.order;
  this.inOrderedList = true;
  this.order = 1;
  this.listDepth++;
  return (function(_this) {
    return function after () {
      _this.inOrderedList = inOrderedList;
      _this.order = order;
      return _this.listDepth--;
    };
  })(this);
};

Domador.prototype.ul = function ul () {
  var inOrderedList, order;
  if (this.listDepth === 0) {
    this.p();
  }
  inOrderedList = this.inOrderedList;
  order = this.order;
  this.inOrderedList = false;
  this.order = 1;
  this.listDepth++;
  return (function(_this) {
    return function after () {
      _this.inOrderedList = inOrderedList;
      _this.order = order;
      return _this.listDepth--;
    };
  })(this);
};

Domador.prototype.output = function output (text) {
  if (!text) {
    return;
  }
  if (!this.inPre) {
    text = this.noTrailingWhitespace ? text.replace(/^[ \t\n]+/, '') : /^[ \t]*\n/.test(text) ? text.replace(/^[ \t\n]+/, '\n') : text.replace(/^[ \t]+/, ' ');
  }
  if (text === '') {
    return;
  }
  this.atP = /\n\n$/.test(text);
  this.atLeft = /\n$/.test(text);
  this.noTrailingWhitespace = /[ \t\n]$/.test(text);
  return this.append(text.replace(/\n/g, this.left));
};

Domador.prototype.outputLater = function outputLater (text) {
  return (function(self) {
    return function after () {
      return self.output(text);
    };
  })(this);
};

Domador.prototype.p = function p () {
  if (this.atP) {
    return;
  }
  if (this.startingBlockquote) {
    this.append('\n');
  } else {
    this.append(this.left);
  }
  if (!this.atLeft) {
    this.append(this.left);
    this.atLeft = true;
  }
  return this.noTrailingWhitespace = this.atP = true;
};

Domador.prototype.parse = function parse () {
  var container;
  var i;
  var link;
  var ref;
  this.buffer = '';
  if (!this.html) {
    return this.buffer;
  }
  if (typeof this.html === 'string') {
    container = this.windowContext.document.createElement('div');
    container.innerHTML = this.htmlLeft = this.html;
  } else {
    container = this.html;
    this.html = this.htmlLeft = container.innerHTML;
  }
  this.process(container);
  if (this.links.length) {
    while (this.lastElement.parentElement !== container && this.lastElement.tagName !== 'BLOCKQUOTE') {
      this.lastElement = this.lastElement.parentElement;
    }
    if (this.lastElement.tagName !== 'BLOCKQUOTE') {
      this.append('\n\n');
    }
    ref = this.links;
    for (i = 0; i < ref.length; i++) {
      link = ref[i];
      if (link) {
        this.append('[' + (i + 1) + ']: ' + link + '\n');
      }
    }
  }
  this.append('');
  return this.buffer = trim(this.buffer);
};

Domador.prototype.pre = function pre () {
  var old;
  old = this.inPre;
  this.inPre = true;
  return (function(_this) {
    return function after () {
      return _this.inPre = old;
    };
  })(this);
};

Domador.prototype.htmlTag = function htmlTag (type) {
  this.output('<' + type + '>');
  return this.outputLater('</' + type + '>');
};

Domador.prototype.advanceHtmlIndex = function advanceHtmlIndex (token) {
  if (this.markers.length === 0) {
    return;
  }

  var re = new RegExp(token, 'ig');
  var match = re.exec(this.htmlLeft);
  if (!match) {
    return;
  }
  var diff = re.lastIndex;
  this.htmlIndex += diff;
  this.htmlLeft = this.htmlLeft.slice(diff);
};

Domador.prototype.insertMarkers = function insertMarkers () {
  while (this.markers.length && this.markers[0][0] <= this.htmlIndex) {
    this.append(this.markers.shift()[1]);
  }
};

Domador.prototype.interleaveMarkers = function interleaveMarkers (text) {
  var marker;
  var markerStart;
  var lastMarkerStart = 0;
  var bits = [];
  while (this.markers.length && this.markers[0][0] <= this.htmlIndex + text.length) {
    marker = this.markers.shift();
    markerStart = Math.max(0, marker[0] - this.htmlIndex);
    bits.push(
      { text: text.slice(lastMarkerStart, markerStart) },
      { marker: marker[1] }
    );
    lastMarkerStart = markerStart;
  }
  bits.push({ text: text.slice(lastMarkerStart) });
  return bits;
};

Domador.prototype.process = function process (el) {
  var after;
  var base;
  var href;
  var i;
  var ref;
  var suffix;
  var summary;
  var title;
  var frameSrc;
  var interleaved;

  if (!this.isVisible(el)) {
    return;
  }

  if (el.nodeType === this.windowContext.Node.TEXT_NODE) {
    if (el.nodeValue.replace(/\n/g, '').length === 0) {
      return;
    }
    interleaved = this.interleaveMarkers(el.nodeValue);
    if (this.inPre) {
      return this.output(interleaved.map(maybeProcess()).join(''));
    }
    if (this.inCode) {
      return this.output(interleaved.map(maybeProcess(processCode)).join(''));
    }
    return this.output(interleaved.map(maybeProcess(processPlainText, el.parentElement && el.parentElement.tagName)).join(''));
  }

  function maybeProcess (fn, tagName) {
    return function bitProcessor (bit) {
      if (bit.marker) {
        return bit.marker;
      }
      if (!fn) {
        return bit.text;
      }
      return fn(bit.text, tagName);
    };
  }

  if (el.nodeType !== this.windowContext.Node.ELEMENT_NODE) {
    return;
  }

  if (this.lastElement) {
    this.insertMarkers();
    this.advanceHtmlIndex('<' + el.tagName);
    this.advanceHtmlIndex('>');
  }
  this.lastElement = el;

  var transformed = this.options.transform(el);
  if (transformed !== void 0) {
    return this.output(transformed);
  }
  if (shallowTags.indexOf(el.tagName) !== -1) {
    this.advanceHtmlIndex('\\/\\s?>');
    return;
  }

  switch (el.tagName) {
    case 'H1':
    case 'H2':
    case 'H3':
    case 'H4':
    case 'H5':
    case 'H6':
      this.p();
      this.output(many('#', parseInt(el.tagName.match(rheading)[1])) + ' ');
      break;
    case 'ADDRESS':
    case 'ARTICLE':
    case 'ASIDE':
    case 'DIV':
    case 'FIELDSET':
    case 'FOOTER':
    case 'HEADER':
    case 'NAV':
    case 'P':
    case 'SECTION':
      this.p();
      break;
    case 'BODY':
    case 'FORM':
      break;
    case 'DETAILS':
      this.p();
      if (!has(el, 'open', false)) {
        summary = el.getElementsByTagName('summary')[0];
        if (summary) {
          this.process(summary);
        }
        return;
      }
      break;
    case 'BR':
      this.br();
      break;
    case 'HR':
      this.p();
      this.output('---------');
      this.p();
      break;
    case 'CITE':
    case 'DFN':
    case 'EM':
    case 'I':
    case 'U':
    case 'VAR':
      this.output('_');
      this.noTrailingWhitespace = true;
      after = this.outputLater('_');
      break;
    case 'MARK':
      this.output('<mark>');
      after = this.outputLater('</mark>');
      break;
    case 'DT':
    case 'B':
    case 'STRONG':
      if (el.tagName === 'DT') {
        this.p();
      }
      this.output('**');
      this.noTrailingWhitespace = true;
      after = this.outputLater('**');
      break;
    case 'Q':
      this.output('"');
      this.noTrailingWhitespace = true;
      after = this.outputLater('"');
      break;
    case 'OL':
      after = this.ol();
      break;
    case 'UL':
      after = this.ul();
      break;
    case 'LI':
      this.replaceLeft('\n');
      this.li();
      break;
    case 'PRE':
      if (this.options.fencing) {
        this.append('\n\n');
        this.output(['```', '\n'].join(this.options.fencinglanguage(el) || ''));
        after = [this.pre(), this.outputLater('\n```')];
      } else {
        after = [this.pushLeft('    '), this.pre()];
      }
      break;
    case 'CODE':
    case 'SAMP':
      if (this.inPre) {
        break;
      }
      this.output('`');
      after = [this.code(), this.outputLater('`')];
      break;
    case 'BLOCKQUOTE':
    case 'DD':
      this.startingBlockquote = true;
      after = this.pushLeft('> ');
      this.startingBlockquote = false;
      break;
    case 'KBD':
      after = this.htmlTag('kbd');
      break;
    case 'A':
    case 'IMG':
      href = attr(el, el.tagName === 'A' ? 'href' : 'src', this.options.absolute);
      if (!href) {
        break;
      }
      title = attr(el, 'title');
      if (title) {
        href += ' "' + title + '"';
      }
      if (this.options.inline) {
        suffix = '(' + href + ')';
      } else {
        suffix = '[' + ((base = this.linkMap)[href] != null ? base[href] : base[href] = this.links.push(href)) + ']';
      }
      if (el.tagName === 'IMG') {
        this.output('![' + attr(el, 'alt') + ']' + suffix);
        return;
      }
      this.output('[');
      this.noTrailingWhitespace = true;
      after = this.outputLater(']' + suffix);
      break;
    case 'IFRAME':
      try {
        if ((ref = el.contentDocument) != null ? ref.documentElement : void 0) {
          this.process(el.contentDocument.documentElement);
        } else {
          frameSrc = attr(el, 'src');
          if (frameSrc && this.options.allowFrame && this.options.allowFrame(frameSrc)) {
            this.output('<iframe src="' + frameSrc + '"></iframe>');
          }
        }
      } catch (err) {
      }
      return;
  }

  after = this.tables(el) || after;

  for (i = 0; i < el.childNodes.length; i++) {
    this.process(el.childNodes[i]);
  }

  this.advanceHtmlIndex('<\\s?\\/\\s?' + el.tagName + '>');

  if (typeof after === 'function') {
    after = [after];
  }
  while (after && after.length) {
    after.shift().call(this);
  }
};

Domador.prototype.tables = function tables (el) {
  if (this.options.tables === false) {
    return;
  }

  var name = el.tagName;
  if (name === 'TABLE') {
    this.tableCols = [];
    return;
  }
  if (name === 'THEAD') {
    return function after () {
      return this.append('|' + this.tableCols.reduce(reducer, '') + '\n');
      function reducer (all, thLength) {
        return all + '-'.repeat(thLength + 2) + '|';
      }
    };
  }
  if (name === 'TH') {
    return [function after () {
      this.tableCols.push(this.childBuffer.length);
    }, this.td(true)];
  }
  if (name === 'TR') {
    this.tableCol = 0;
    this.output('|');
    this.noTrailingWhitespace = true;
    return function after () {
      this.append('\n');
    };
  }
  if (name === 'TD') {
    return this.td();
  }
};

Domador.prototype.pushLeft = function pushLeft (text) {
  var old;
  old = this.left;
  this.left += text;
  if (this.atP) {
    this.append(text);
  } else {
    this.p();
  }
  return (function(_this) {
    return function() {
      _this.left = old;
      _this.atLeft = _this.atP = false;
      return _this.p();
    };
  })(this);
};

Domador.prototype.replaceLeft = function replaceLeft (text) {
  if (!this.atLeft) {
    this.append(this.left.replace(/[ ]{2,4}$/, text));
    return this.atLeft = this.noTrailingWhitespace = this.atP = true;
  } else if (this.last) {
    return this.last = this.last.replace(/[ ]{2,4}$/, text);
  }
};

Domador.prototype.isVisible = function isVisible (el) {
  var display;
  var i;
  var property;
  var visibility;
  var visible = true;
  var style = attr(el, 'style', false);
  var properties = style != null ? typeof style.match === 'function' ? style.match(rdisplay) : void 0 : void 0;
  if (properties != null) {
    for (i = 0; i < properties.length; i++) {
      property = properties[i];
      visible = !rhidden.test(property);
    }
  }
  if (visible && typeof this.windowContext.getComputedStyle === 'function') {
    try {
      style = this.windowContext.getComputedStyle(el, null);
      if (typeof (style != null ? style.getPropertyValue : void 0) === 'function') {
        display = style.getPropertyValue('display');
        visibility = style.getPropertyValue('visibility');
        visible = display !== 'none' && visibility !== 'hidden';
      }
    } catch (err) {
    }
  }
  return visible;
};

module.exports = parse;

},{"./virtualWindowContext":3,"string.prototype.repeat":2}],2:[function(require,module,exports){
/*! http://mths.be/repeat v0.2.0 by @mathias */
if (!String.prototype.repeat) {
	(function() {
		'use strict'; // needed to support `apply`/`call` with `undefined`/`null`
		var defineProperty = (function() {
			// IE 8 only supports `Object.defineProperty` on DOM elements
			try {
				var object = {};
				var $defineProperty = Object.defineProperty;
				var result = $defineProperty(object, object, object) && $defineProperty;
			} catch(error) {}
			return result;
		}());
		var repeat = function(count) {
			if (this == null) {
				throw TypeError();
			}
			var string = String(this);
			// `ToInteger`
			var n = count ? Number(count) : 0;
			if (n != n) { // better `isNaN`
				n = 0;
			}
			// Account for out-of-bounds indices
			if (n < 0 || n == Infinity) {
				throw RangeError();
			}
			var result = '';
			while (n) {
				if (n % 2 == 1) {
					result += string;
				}
				if (n > 1) {
					string += string;
				}
				n >>= 1;
			}
			return result;
		};
		if (defineProperty) {
			defineProperty(String.prototype, 'repeat', {
				'value': repeat,
				'configurable': true,
				'writable': true
			});
		} else {
			String.prototype.repeat = repeat;
		}
	}());
}

},{}],3:[function(require,module,exports){
'use strict';

if (!window.Node) {
  window.Node = {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3
  };
}

function windowContext () {
  return window;
}

module.exports = windowContext;

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkb21hZG9yLmpzIiwibm9kZV9tb2R1bGVzL3N0cmluZy5wcm90b3R5cGUucmVwZWF0L3JlcGVhdC5qcyIsIndpbmRvd0NvbnRleHQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbnBCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnJlcXVpcmUoJ3N0cmluZy5wcm90b3R5cGUucmVwZWF0Jyk7XG5cbnZhciByZXBsYWNlbWVudHMgPSB7XG4gICdcXFxcXFxcXCc6ICdcXFxcXFxcXCcsXG4gICdcXFxcWyc6ICdcXFxcWycsXG4gICdcXFxcXSc6ICdcXFxcXScsXG4gICc+JzogJ1xcXFw+JyxcbiAgJ18nOiAnXFxcXF8nLFxuICAnXFxcXConOiAnXFxcXConLFxuICAnYCc6ICdcXFxcYCcsXG4gICcjJzogJ1xcXFwjJyxcbiAgJyhbMC05XSlcXFxcLihcXFxcc3wkKSc6ICckMVxcXFwuJDInLFxuICAnXFx1MDBhOSc6ICcoYyknLFxuICAnXFx1MDBhZSc6ICcociknLFxuICAnXFx1MjEyMic6ICcodG0pJyxcbiAgJ1xcdTAwYTAnOiAnICcsXG4gICdcXHUwMGI3JzogJ1xcXFwqJyxcbiAgJ1xcdTIwMDInOiAnICcsXG4gICdcXHUyMDAzJzogJyAnLFxuICAnXFx1MjAwOSc6ICcgJyxcbiAgJ1xcdTIwMTgnOiAnXFwnJyxcbiAgJ1xcdTIwMTknOiAnXFwnJyxcbiAgJ1xcdTIwMWMnOiAnXCInLFxuICAnXFx1MjAxZCc6ICdcIicsXG4gICdcXHUyMDI2JzogJy4uLicsXG4gICdcXHUyMDEzJzogJy0tJyxcbiAgJ1xcdTIwMTQnOiAnLS0tJ1xufTtcbnZhciByZXBsYWNlcnMgPSBPYmplY3Qua2V5cyhyZXBsYWNlbWVudHMpLnJlZHVjZShyZXBsYWNlciwge30pO1xudmFyIHJzcGFjZXMgPSAvXlxccyt8XFxzKyQvZztcbnZhciByZGlzcGxheSA9IC8oZGlzcGxheXx2aXNpYmlsaXR5KVxccyo6XFxzKlthLXpdKy9naTtcbnZhciByaGlkZGVuID0gLyhub25lfGhpZGRlbilcXHMqJC9pO1xudmFyIHJoZWFkaW5nID0gL15IKFsxLTZdKSQvO1xudmFyIHNoYWxsb3dUYWdzID0gW1xuICAnQVBQTEVUJywgJ0FSRUEnLCAnQVVESU8nLCAnQlVUVE9OJywgJ0NBTlZBUycsICdEQVRBTElTVCcsICdFTUJFRCcsICdIRUFEJywgJ0lOUFVUJywgJ01BUCcsXG4gICdNRU5VJywgJ01FVEVSJywgJ05PRlJBTUVTJywgJ05PU0NSSVBUJywgJ09CSkVDVCcsICdPUFRHUk9VUCcsICdPUFRJT04nLCAnUEFSQU0nLCAnUFJPR1JFU1MnLFxuICAnUlAnLCAnUlQnLCAnUlVCWScsICdTQ1JJUFQnLCAnU0VMRUNUJywgJ1NUWUxFJywgJ1RFWFRBUkVBJywgJ1RJVExFJywgJ1ZJREVPJ1xuXTtcbnZhciBwYXJhZ3JhcGhUYWdzID0gW1xuICAnQUREUkVTUycsICdBUlRJQ0xFJywgJ0FTSURFJywgJ0RJVicsICdGSUVMRFNFVCcsICdGT09URVInLCAnSEVBREVSJywgJ05BVicsICdQJywgJ1NFQ1RJT04nXG5dO1xudmFyIHdpbmRvd0NvbnRleHQgPSByZXF1aXJlKCcuL3ZpcnR1YWxXaW5kb3dDb250ZXh0Jyk7XG5cbmZ1bmN0aW9uIHJlcGxhY2VyIChyZXN1bHQsIGtleSkge1xuICByZXN1bHRba2V5XSA9IG5ldyBSZWdFeHAoa2V5LCAnZycpOyByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBtYW55ICh0ZXh0LCB0aW1lcykge1xuICByZXR1cm4gbmV3IEFycmF5KHRpbWVzICsgMSkuam9pbih0ZXh0KTtcbn1cblxuZnVuY3Rpb24gcGFkTGVmdCAodGV4dCwgdGltZXMpIHtcbiAgcmV0dXJuIG1hbnkoJyAnLCB0aW1lcykgKyB0ZXh0O1xufVxuXG5mdW5jdGlvbiB0cmltICh0ZXh0KSB7XG4gIGlmICh0ZXh0LnRyaW0pIHtcbiAgICByZXR1cm4gdGV4dC50cmltKCk7XG4gIH1cbiAgcmV0dXJuIHRleHQucmVwbGFjZShyc3BhY2VzLCAnJyk7XG59XG5cbmZ1bmN0aW9uIGF0dHIgKGVsLCBwcm9wLCBkaXJlY3QpIHtcbiAgdmFyIHByb3BlciA9IGRpcmVjdCA9PT0gdm9pZCAwIHx8IGRpcmVjdDtcbiAgaWYgKHByb3BlciB8fCB0eXBlb2YgZWwuZ2V0QXR0cmlidXRlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGVsW3Byb3BdIHx8ICcnO1xuICB9XG4gIHJldHVybiBlbC5nZXRBdHRyaWJ1dGUocHJvcCkgfHwgJyc7XG59XG5cbmZ1bmN0aW9uIGhhcyAoZWwsIHByb3AsIGRpcmVjdCkge1xuICB2YXIgcHJvcGVyID0gZGlyZWN0ID09PSB2b2lkIDAgfHwgZGlyZWN0O1xuICBpZiAocHJvcGVyIHx8IHR5cGVvZiBlbC5oYXNBdHRyaWJ1dGUgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gZWwuaGFzT3duUHJvcGVydHkocHJvcCk7XG4gIH1cbiAgcmV0dXJuIGVsLmhhc0F0dHJpYnV0ZShwcm9wKTtcbn1cblxuZnVuY3Rpb24gcHJvY2Vzc1BsYWluVGV4dCAodGV4dCwgdGFnTmFtZSkge1xuICB2YXIga2V5O1xuICB2YXIgYmxvY2sgPSBwYXJhZ3JhcGhUYWdzLmluZGV4T2YodGFnTmFtZSkgIT09IC0xIHx8IHRhZ05hbWUgPT09ICdCTE9DS1FVT1RFJztcbiAgdGV4dCA9IHRleHQucmVwbGFjZSgvXFxuKFsgXFx0XSpcXG4pKy9nLCAnXFxuJyk7XG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xcblsgXFx0XSsvZywgJ1xcbicpO1xuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9bIFxcdF0rL2csICcgJyk7XG4gIGZvciAoa2V5IGluIHJlcGxhY2VtZW50cykge1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UocmVwbGFjZXJzW2tleV0sIHJlcGxhY2VtZW50c1trZXldKTtcbiAgfVxuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC8oXFxzKilcXFxcIy9nLCBibG9jayA/IHJlbW92ZVVubmVjZXNzYXJ5RXNjYXBlcyA6ICckMSMnKTtcbiAgcmV0dXJuIHRleHQ7XG5cbiAgZnVuY3Rpb24gcmVtb3ZlVW5uZWNlc3NhcnlFc2NhcGVzIChlc2NhcGVkLCBzcGFjZXMsIGkpIHtcbiAgICByZXR1cm4gaSA/IHNwYWNlcyArICcjJyA6IGVzY2FwZWQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJvY2Vzc0NvZGUgKHRleHQpIHtcbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvYC9nLCAnXFxcXGAnKTtcbn1cblxuZnVuY3Rpb24gbm9vcCAoKSB7fVxuXG5mdW5jdGlvbiBwYXJzZSAoaHRtbCwgb3B0aW9ucykge1xuICByZXR1cm4gbmV3IERvbWFkb3IoaHRtbCwgb3B0aW9ucykucGFyc2UoKTtcbn1cblxuZnVuY3Rpb24gRG9tYWRvciAoaHRtbCwgb3B0aW9ucykge1xuICB0aGlzLmh0bWwgPSBodG1sIHx8ICcnO1xuICB0aGlzLmh0bWxJbmRleCA9IDA7XG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIHRoaXMubWFya2VycyA9IHRoaXMub3B0aW9ucy5tYXJrZXJzID8gdGhpcy5vcHRpb25zLm1hcmtlcnMuc29ydChhc2MpIDogW107XG4gIHRoaXMud2luZG93Q29udGV4dCA9IHdpbmRvd0NvbnRleHQodGhpcy5vcHRpb25zKTtcbiAgdGhpcy5hdExlZnQgPSB0aGlzLm5vVHJhaWxpbmdXaGl0ZXNwYWNlID0gdGhpcy5hdFAgPSB0cnVlO1xuICB0aGlzLmJ1ZmZlciA9IHRoaXMuY2hpbGRCdWZmZXIgPSAnJztcbiAgdGhpcy5leGNlcHRpb25zID0gW107XG4gIHRoaXMub3JkZXIgPSAxO1xuICB0aGlzLmxpc3REZXB0aCA9IDA7XG4gIHRoaXMuaW5Db2RlID0gdGhpcy5pblByZSA9IHRoaXMuaW5PcmRlcmVkTGlzdCA9IGZhbHNlO1xuICB0aGlzLmxhc3QgPSBudWxsO1xuICB0aGlzLmxlZnQgPSAnXFxuJztcbiAgdGhpcy5saW5rcyA9IFtdO1xuICB0aGlzLmxpbmtNYXAgPSB7fTtcbiAgdGhpcy51bmhhbmRsZWQgPSB7fTtcbiAgaWYgKHRoaXMub3B0aW9ucy5hYnNvbHV0ZSA9PT0gdm9pZCAwKSB7IHRoaXMub3B0aW9ucy5hYnNvbHV0ZSA9IGZhbHNlOyB9XG4gIGlmICh0aGlzLm9wdGlvbnMuZmVuY2luZyA9PT0gdm9pZCAwKSB7IHRoaXMub3B0aW9ucy5mZW5jaW5nID0gZmFsc2U7IH1cbiAgaWYgKHRoaXMub3B0aW9ucy5mZW5jaW5nbGFuZ3VhZ2UgPT09IHZvaWQgMCkgeyB0aGlzLm9wdGlvbnMuZmVuY2luZ2xhbmd1YWdlID0gbm9vcDsgfVxuICBpZiAodGhpcy5vcHRpb25zLnRyYW5zZm9ybSA9PT0gdm9pZCAwKSB7IHRoaXMub3B0aW9ucy50cmFuc2Zvcm0gPSBub29wOyB9XG4gIGZ1bmN0aW9uIGFzYyAoYSwgYikgeyByZXR1cm4gYVswXSAtIGJbMF07IH1cbn1cblxuRG9tYWRvci5wcm90b3R5cGUuYXBwZW5kID0gZnVuY3Rpb24gYXBwZW5kICh0ZXh0KSB7XG4gIGlmICh0aGlzLmxhc3QgIT0gbnVsbCkge1xuICAgIHRoaXMuYnVmZmVyICs9IHRoaXMubGFzdDtcbiAgfVxuICB0aGlzLmNoaWxkQnVmZmVyICs9IHRleHQ7XG4gIHJldHVybiB0aGlzLmxhc3QgPSB0ZXh0O1xufTtcblxuRG9tYWRvci5wcm90b3R5cGUuYnIgPSBmdW5jdGlvbiBiciAoKSB7XG4gIHRoaXMuYXBwZW5kKCcgICcgKyAgdGhpcy5sZWZ0KTtcbiAgcmV0dXJuIHRoaXMuYXRMZWZ0ID0gdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IHRydWU7XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5jb2RlID0gZnVuY3Rpb24gY29kZSAoKSB7XG4gIHZhciBvbGQ7XG4gIG9sZCA9IHRoaXMuaW5Db2RlO1xuICB0aGlzLmluQ29kZSA9IHRydWU7XG4gIHJldHVybiAoZnVuY3Rpb24oX3RoaXMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gYWZ0ZXIgKCkge1xuICAgICAgcmV0dXJuIF90aGlzLmluQ29kZSA9IG9sZDtcbiAgICB9O1xuICB9KSh0aGlzKTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLmxpID0gZnVuY3Rpb24gbGkgKCkge1xuICB2YXIgcmVzdWx0O1xuICByZXN1bHQgPSB0aGlzLmluT3JkZXJlZExpc3QgPyAodGhpcy5vcmRlcisrKSArICcuICcgOiAnKiAnO1xuICByZXN1bHQgPSBwYWRMZWZ0KHJlc3VsdCwgKHRoaXMubGlzdERlcHRoIC0gMSkgKiAyKTtcbiAgcmV0dXJuIHRoaXMuYXBwZW5kKHJlc3VsdCk7XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS50ZCA9IGZ1bmN0aW9uIHRkIChoZWFkZXIpIHtcbiAgdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IGZhbHNlO1xuICB0aGlzLm91dHB1dCgnICcpO1xuICB0aGlzLmNoaWxkQnVmZmVyID0gJyc7XG4gIHRoaXMubm9UcmFpbGluZ1doaXRlc3BhY2UgPSBmYWxzZTtcbiAgcmV0dXJuIGZ1bmN0aW9uIGFmdGVyICgpIHtcbiAgICB2YXIgc3BhY2VzID0gaGVhZGVyID8gMCA6IE1hdGgubWF4KDAsIHRoaXMudGFibGVDb2xzW3RoaXMudGFibGVDb2wrK10gLSB0aGlzLmNoaWxkQnVmZmVyLmxlbmd0aCk7XG4gICAgdGhpcy5hcHBlbmQoJyAnLnJlcGVhdChzcGFjZXMgKyAxKSArICd8Jyk7XG4gICAgdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IHRydWU7XG4gIH07XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5vbCA9IGZ1bmN0aW9uIG9sICgpIHtcbiAgdmFyIGluT3JkZXJlZExpc3QsIG9yZGVyO1xuICBpZiAodGhpcy5saXN0RGVwdGggPT09IDApIHtcbiAgICB0aGlzLnAoKTtcbiAgfVxuICBpbk9yZGVyZWRMaXN0ID0gdGhpcy5pbk9yZGVyZWRMaXN0O1xuICBvcmRlciA9IHRoaXMub3JkZXI7XG4gIHRoaXMuaW5PcmRlcmVkTGlzdCA9IHRydWU7XG4gIHRoaXMub3JkZXIgPSAxO1xuICB0aGlzLmxpc3REZXB0aCsrO1xuICByZXR1cm4gKGZ1bmN0aW9uKF90aGlzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGFmdGVyICgpIHtcbiAgICAgIF90aGlzLmluT3JkZXJlZExpc3QgPSBpbk9yZGVyZWRMaXN0O1xuICAgICAgX3RoaXMub3JkZXIgPSBvcmRlcjtcbiAgICAgIHJldHVybiBfdGhpcy5saXN0RGVwdGgtLTtcbiAgICB9O1xuICB9KSh0aGlzKTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLnVsID0gZnVuY3Rpb24gdWwgKCkge1xuICB2YXIgaW5PcmRlcmVkTGlzdCwgb3JkZXI7XG4gIGlmICh0aGlzLmxpc3REZXB0aCA9PT0gMCkge1xuICAgIHRoaXMucCgpO1xuICB9XG4gIGluT3JkZXJlZExpc3QgPSB0aGlzLmluT3JkZXJlZExpc3Q7XG4gIG9yZGVyID0gdGhpcy5vcmRlcjtcbiAgdGhpcy5pbk9yZGVyZWRMaXN0ID0gZmFsc2U7XG4gIHRoaXMub3JkZXIgPSAxO1xuICB0aGlzLmxpc3REZXB0aCsrO1xuICByZXR1cm4gKGZ1bmN0aW9uKF90aGlzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGFmdGVyICgpIHtcbiAgICAgIF90aGlzLmluT3JkZXJlZExpc3QgPSBpbk9yZGVyZWRMaXN0O1xuICAgICAgX3RoaXMub3JkZXIgPSBvcmRlcjtcbiAgICAgIHJldHVybiBfdGhpcy5saXN0RGVwdGgtLTtcbiAgICB9O1xuICB9KSh0aGlzKTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLm91dHB1dCA9IGZ1bmN0aW9uIG91dHB1dCAodGV4dCkge1xuICBpZiAoIXRleHQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCF0aGlzLmluUHJlKSB7XG4gICAgdGV4dCA9IHRoaXMubm9UcmFpbGluZ1doaXRlc3BhY2UgPyB0ZXh0LnJlcGxhY2UoL15bIFxcdFxcbl0rLywgJycpIDogL15bIFxcdF0qXFxuLy50ZXN0KHRleHQpID8gdGV4dC5yZXBsYWNlKC9eWyBcXHRcXG5dKy8sICdcXG4nKSA6IHRleHQucmVwbGFjZSgvXlsgXFx0XSsvLCAnICcpO1xuICB9XG4gIGlmICh0ZXh0ID09PSAnJykge1xuICAgIHJldHVybjtcbiAgfVxuICB0aGlzLmF0UCA9IC9cXG5cXG4kLy50ZXN0KHRleHQpO1xuICB0aGlzLmF0TGVmdCA9IC9cXG4kLy50ZXN0KHRleHQpO1xuICB0aGlzLm5vVHJhaWxpbmdXaGl0ZXNwYWNlID0gL1sgXFx0XFxuXSQvLnRlc3QodGV4dCk7XG4gIHJldHVybiB0aGlzLmFwcGVuZCh0ZXh0LnJlcGxhY2UoL1xcbi9nLCB0aGlzLmxlZnQpKTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLm91dHB1dExhdGVyID0gZnVuY3Rpb24gb3V0cHV0TGF0ZXIgKHRleHQpIHtcbiAgcmV0dXJuIChmdW5jdGlvbihzZWxmKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGFmdGVyICgpIHtcbiAgICAgIHJldHVybiBzZWxmLm91dHB1dCh0ZXh0KTtcbiAgICB9O1xuICB9KSh0aGlzKTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLnAgPSBmdW5jdGlvbiBwICgpIHtcbiAgaWYgKHRoaXMuYXRQKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICh0aGlzLnN0YXJ0aW5nQmxvY2txdW90ZSkge1xuICAgIHRoaXMuYXBwZW5kKCdcXG4nKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmFwcGVuZCh0aGlzLmxlZnQpO1xuICB9XG4gIGlmICghdGhpcy5hdExlZnQpIHtcbiAgICB0aGlzLmFwcGVuZCh0aGlzLmxlZnQpO1xuICAgIHRoaXMuYXRMZWZ0ID0gdHJ1ZTtcbiAgfVxuICByZXR1cm4gdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IHRoaXMuYXRQID0gdHJ1ZTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24gcGFyc2UgKCkge1xuICB2YXIgY29udGFpbmVyO1xuICB2YXIgaTtcbiAgdmFyIGxpbms7XG4gIHZhciByZWY7XG4gIHRoaXMuYnVmZmVyID0gJyc7XG4gIGlmICghdGhpcy5odG1sKSB7XG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyO1xuICB9XG4gIGlmICh0eXBlb2YgdGhpcy5odG1sID09PSAnc3RyaW5nJykge1xuICAgIGNvbnRhaW5lciA9IHRoaXMud2luZG93Q29udGV4dC5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBjb250YWluZXIuaW5uZXJIVE1MID0gdGhpcy5odG1sTGVmdCA9IHRoaXMuaHRtbDtcbiAgfSBlbHNlIHtcbiAgICBjb250YWluZXIgPSB0aGlzLmh0bWw7XG4gICAgdGhpcy5odG1sID0gdGhpcy5odG1sTGVmdCA9IGNvbnRhaW5lci5pbm5lckhUTUw7XG4gIH1cbiAgdGhpcy5wcm9jZXNzKGNvbnRhaW5lcik7XG4gIGlmICh0aGlzLmxpbmtzLmxlbmd0aCkge1xuICAgIHdoaWxlICh0aGlzLmxhc3RFbGVtZW50LnBhcmVudEVsZW1lbnQgIT09IGNvbnRhaW5lciAmJiB0aGlzLmxhc3RFbGVtZW50LnRhZ05hbWUgIT09ICdCTE9DS1FVT1RFJykge1xuICAgICAgdGhpcy5sYXN0RWxlbWVudCA9IHRoaXMubGFzdEVsZW1lbnQucGFyZW50RWxlbWVudDtcbiAgICB9XG4gICAgaWYgKHRoaXMubGFzdEVsZW1lbnQudGFnTmFtZSAhPT0gJ0JMT0NLUVVPVEUnKSB7XG4gICAgICB0aGlzLmFwcGVuZCgnXFxuXFxuJyk7XG4gICAgfVxuICAgIHJlZiA9IHRoaXMubGlua3M7XG4gICAgZm9yIChpID0gMDsgaSA8IHJlZi5sZW5ndGg7IGkrKykge1xuICAgICAgbGluayA9IHJlZltpXTtcbiAgICAgIGlmIChsaW5rKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKCdbJyArIChpICsgMSkgKyAnXTogJyArIGxpbmsgKyAnXFxuJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHRoaXMuYXBwZW5kKCcnKTtcbiAgcmV0dXJuIHRoaXMuYnVmZmVyID0gdHJpbSh0aGlzLmJ1ZmZlcik7XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5wcmUgPSBmdW5jdGlvbiBwcmUgKCkge1xuICB2YXIgb2xkO1xuICBvbGQgPSB0aGlzLmluUHJlO1xuICB0aGlzLmluUHJlID0gdHJ1ZTtcbiAgcmV0dXJuIChmdW5jdGlvbihfdGhpcykge1xuICAgIHJldHVybiBmdW5jdGlvbiBhZnRlciAoKSB7XG4gICAgICByZXR1cm4gX3RoaXMuaW5QcmUgPSBvbGQ7XG4gICAgfTtcbiAgfSkodGhpcyk7XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5odG1sVGFnID0gZnVuY3Rpb24gaHRtbFRhZyAodHlwZSkge1xuICB0aGlzLm91dHB1dCgnPCcgKyB0eXBlICsgJz4nKTtcbiAgcmV0dXJuIHRoaXMub3V0cHV0TGF0ZXIoJzwvJyArIHR5cGUgKyAnPicpO1xufTtcblxuRG9tYWRvci5wcm90b3R5cGUuYWR2YW5jZUh0bWxJbmRleCA9IGZ1bmN0aW9uIGFkdmFuY2VIdG1sSW5kZXggKHRva2VuKSB7XG4gIGlmICh0aGlzLm1hcmtlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIHJlID0gbmV3IFJlZ0V4cCh0b2tlbiwgJ2lnJyk7XG4gIHZhciBtYXRjaCA9IHJlLmV4ZWModGhpcy5odG1sTGVmdCk7XG4gIGlmICghbWF0Y2gpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIGRpZmYgPSByZS5sYXN0SW5kZXg7XG4gIHRoaXMuaHRtbEluZGV4ICs9IGRpZmY7XG4gIHRoaXMuaHRtbExlZnQgPSB0aGlzLmh0bWxMZWZ0LnNsaWNlKGRpZmYpO1xufTtcblxuRG9tYWRvci5wcm90b3R5cGUuaW5zZXJ0TWFya2VycyA9IGZ1bmN0aW9uIGluc2VydE1hcmtlcnMgKCkge1xuICB3aGlsZSAodGhpcy5tYXJrZXJzLmxlbmd0aCAmJiB0aGlzLm1hcmtlcnNbMF1bMF0gPD0gdGhpcy5odG1sSW5kZXgpIHtcbiAgICB0aGlzLmFwcGVuZCh0aGlzLm1hcmtlcnMuc2hpZnQoKVsxXSk7XG4gIH1cbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLmludGVybGVhdmVNYXJrZXJzID0gZnVuY3Rpb24gaW50ZXJsZWF2ZU1hcmtlcnMgKHRleHQpIHtcbiAgdmFyIG1hcmtlcjtcbiAgdmFyIG1hcmtlclN0YXJ0O1xuICB2YXIgbGFzdE1hcmtlclN0YXJ0ID0gMDtcbiAgdmFyIGJpdHMgPSBbXTtcbiAgd2hpbGUgKHRoaXMubWFya2Vycy5sZW5ndGggJiYgdGhpcy5tYXJrZXJzWzBdWzBdIDw9IHRoaXMuaHRtbEluZGV4ICsgdGV4dC5sZW5ndGgpIHtcbiAgICBtYXJrZXIgPSB0aGlzLm1hcmtlcnMuc2hpZnQoKTtcbiAgICBtYXJrZXJTdGFydCA9IE1hdGgubWF4KDAsIG1hcmtlclswXSAtIHRoaXMuaHRtbEluZGV4KTtcbiAgICBiaXRzLnB1c2goXG4gICAgICB7IHRleHQ6IHRleHQuc2xpY2UobGFzdE1hcmtlclN0YXJ0LCBtYXJrZXJTdGFydCkgfSxcbiAgICAgIHsgbWFya2VyOiBtYXJrZXJbMV0gfVxuICAgICk7XG4gICAgbGFzdE1hcmtlclN0YXJ0ID0gbWFya2VyU3RhcnQ7XG4gIH1cbiAgYml0cy5wdXNoKHsgdGV4dDogdGV4dC5zbGljZShsYXN0TWFya2VyU3RhcnQpIH0pO1xuICByZXR1cm4gYml0cztcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLnByb2Nlc3MgPSBmdW5jdGlvbiBwcm9jZXNzIChlbCkge1xuICB2YXIgYWZ0ZXI7XG4gIHZhciBiYXNlO1xuICB2YXIgaHJlZjtcbiAgdmFyIGk7XG4gIHZhciByZWY7XG4gIHZhciBzdWZmaXg7XG4gIHZhciBzdW1tYXJ5O1xuICB2YXIgdGl0bGU7XG4gIHZhciBmcmFtZVNyYztcbiAgdmFyIGludGVybGVhdmVkO1xuXG4gIGlmICghdGhpcy5pc1Zpc2libGUoZWwpKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKGVsLm5vZGVUeXBlID09PSB0aGlzLndpbmRvd0NvbnRleHQuTm9kZS5URVhUX05PREUpIHtcbiAgICBpZiAoZWwubm9kZVZhbHVlLnJlcGxhY2UoL1xcbi9nLCAnJykubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGludGVybGVhdmVkID0gdGhpcy5pbnRlcmxlYXZlTWFya2VycyhlbC5ub2RlVmFsdWUpO1xuICAgIGlmICh0aGlzLmluUHJlKSB7XG4gICAgICByZXR1cm4gdGhpcy5vdXRwdXQoaW50ZXJsZWF2ZWQubWFwKG1heWJlUHJvY2VzcygpKS5qb2luKCcnKSk7XG4gICAgfVxuICAgIGlmICh0aGlzLmluQ29kZSkge1xuICAgICAgcmV0dXJuIHRoaXMub3V0cHV0KGludGVybGVhdmVkLm1hcChtYXliZVByb2Nlc3MocHJvY2Vzc0NvZGUpKS5qb2luKCcnKSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm91dHB1dChpbnRlcmxlYXZlZC5tYXAobWF5YmVQcm9jZXNzKHByb2Nlc3NQbGFpblRleHQsIGVsLnBhcmVudEVsZW1lbnQgJiYgZWwucGFyZW50RWxlbWVudC50YWdOYW1lKSkuam9pbignJykpO1xuICB9XG5cbiAgZnVuY3Rpb24gbWF5YmVQcm9jZXNzIChmbiwgdGFnTmFtZSkge1xuICAgIHJldHVybiBmdW5jdGlvbiBiaXRQcm9jZXNzb3IgKGJpdCkge1xuICAgICAgaWYgKGJpdC5tYXJrZXIpIHtcbiAgICAgICAgcmV0dXJuIGJpdC5tYXJrZXI7XG4gICAgICB9XG4gICAgICBpZiAoIWZuKSB7XG4gICAgICAgIHJldHVybiBiaXQudGV4dDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmbihiaXQudGV4dCwgdGFnTmFtZSk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChlbC5ub2RlVHlwZSAhPT0gdGhpcy53aW5kb3dDb250ZXh0Lk5vZGUuRUxFTUVOVF9OT0RFKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHRoaXMubGFzdEVsZW1lbnQpIHtcbiAgICB0aGlzLmluc2VydE1hcmtlcnMoKTtcbiAgICB0aGlzLmFkdmFuY2VIdG1sSW5kZXgoJzwnICsgZWwudGFnTmFtZSk7XG4gICAgdGhpcy5hZHZhbmNlSHRtbEluZGV4KCc+Jyk7XG4gIH1cbiAgdGhpcy5sYXN0RWxlbWVudCA9IGVsO1xuXG4gIHZhciB0cmFuc2Zvcm1lZCA9IHRoaXMub3B0aW9ucy50cmFuc2Zvcm0oZWwpO1xuICBpZiAodHJhbnNmb3JtZWQgIT09IHZvaWQgMCkge1xuICAgIHJldHVybiB0aGlzLm91dHB1dCh0cmFuc2Zvcm1lZCk7XG4gIH1cbiAgaWYgKHNoYWxsb3dUYWdzLmluZGV4T2YoZWwudGFnTmFtZSkgIT09IC0xKSB7XG4gICAgdGhpcy5hZHZhbmNlSHRtbEluZGV4KCdcXFxcL1xcXFxzPz4nKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBzd2l0Y2ggKGVsLnRhZ05hbWUpIHtcbiAgICBjYXNlICdIMSc6XG4gICAgY2FzZSAnSDInOlxuICAgIGNhc2UgJ0gzJzpcbiAgICBjYXNlICdINCc6XG4gICAgY2FzZSAnSDUnOlxuICAgIGNhc2UgJ0g2JzpcbiAgICAgIHRoaXMucCgpO1xuICAgICAgdGhpcy5vdXRwdXQobWFueSgnIycsIHBhcnNlSW50KGVsLnRhZ05hbWUubWF0Y2gocmhlYWRpbmcpWzFdKSkgKyAnICcpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnQUREUkVTUyc6XG4gICAgY2FzZSAnQVJUSUNMRSc6XG4gICAgY2FzZSAnQVNJREUnOlxuICAgIGNhc2UgJ0RJVic6XG4gICAgY2FzZSAnRklFTERTRVQnOlxuICAgIGNhc2UgJ0ZPT1RFUic6XG4gICAgY2FzZSAnSEVBREVSJzpcbiAgICBjYXNlICdOQVYnOlxuICAgIGNhc2UgJ1AnOlxuICAgIGNhc2UgJ1NFQ1RJT04nOlxuICAgICAgdGhpcy5wKCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdCT0RZJzpcbiAgICBjYXNlICdGT1JNJzpcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0RFVEFJTFMnOlxuICAgICAgdGhpcy5wKCk7XG4gICAgICBpZiAoIWhhcyhlbCwgJ29wZW4nLCBmYWxzZSkpIHtcbiAgICAgICAgc3VtbWFyeSA9IGVsLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzdW1tYXJ5JylbMF07XG4gICAgICAgIGlmIChzdW1tYXJ5KSB7XG4gICAgICAgICAgdGhpcy5wcm9jZXNzKHN1bW1hcnkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0JSJzpcbiAgICAgIHRoaXMuYnIoKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0hSJzpcbiAgICAgIHRoaXMucCgpO1xuICAgICAgdGhpcy5vdXRwdXQoJy0tLS0tLS0tLScpO1xuICAgICAgdGhpcy5wKCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdDSVRFJzpcbiAgICBjYXNlICdERk4nOlxuICAgIGNhc2UgJ0VNJzpcbiAgICBjYXNlICdJJzpcbiAgICBjYXNlICdVJzpcbiAgICBjYXNlICdWQVInOlxuICAgICAgdGhpcy5vdXRwdXQoJ18nKTtcbiAgICAgIHRoaXMubm9UcmFpbGluZ1doaXRlc3BhY2UgPSB0cnVlO1xuICAgICAgYWZ0ZXIgPSB0aGlzLm91dHB1dExhdGVyKCdfJyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdNQVJLJzpcbiAgICAgIHRoaXMub3V0cHV0KCc8bWFyaz4nKTtcbiAgICAgIGFmdGVyID0gdGhpcy5vdXRwdXRMYXRlcignPC9tYXJrPicpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnRFQnOlxuICAgIGNhc2UgJ0InOlxuICAgIGNhc2UgJ1NUUk9ORyc6XG4gICAgICBpZiAoZWwudGFnTmFtZSA9PT0gJ0RUJykge1xuICAgICAgICB0aGlzLnAoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMub3V0cHV0KCcqKicpO1xuICAgICAgdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IHRydWU7XG4gICAgICBhZnRlciA9IHRoaXMub3V0cHV0TGF0ZXIoJyoqJyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdRJzpcbiAgICAgIHRoaXMub3V0cHV0KCdcIicpO1xuICAgICAgdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IHRydWU7XG4gICAgICBhZnRlciA9IHRoaXMub3V0cHV0TGF0ZXIoJ1wiJyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdPTCc6XG4gICAgICBhZnRlciA9IHRoaXMub2woKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ1VMJzpcbiAgICAgIGFmdGVyID0gdGhpcy51bCgpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnTEknOlxuICAgICAgdGhpcy5yZXBsYWNlTGVmdCgnXFxuJyk7XG4gICAgICB0aGlzLmxpKCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdQUkUnOlxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5mZW5jaW5nKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKCdcXG5cXG4nKTtcbiAgICAgICAgdGhpcy5vdXRwdXQoWydgYGAnLCAnXFxuJ10uam9pbih0aGlzLm9wdGlvbnMuZmVuY2luZ2xhbmd1YWdlKGVsKSB8fCAnJykpO1xuICAgICAgICBhZnRlciA9IFt0aGlzLnByZSgpLCB0aGlzLm91dHB1dExhdGVyKCdcXG5gYGAnKV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhZnRlciA9IFt0aGlzLnB1c2hMZWZ0KCcgICAgJyksIHRoaXMucHJlKCldO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnQ09ERSc6XG4gICAgY2FzZSAnU0FNUCc6XG4gICAgICBpZiAodGhpcy5pblByZSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHRoaXMub3V0cHV0KCdgJyk7XG4gICAgICBhZnRlciA9IFt0aGlzLmNvZGUoKSwgdGhpcy5vdXRwdXRMYXRlcignYCcpXTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0JMT0NLUVVPVEUnOlxuICAgIGNhc2UgJ0REJzpcbiAgICAgIHRoaXMuc3RhcnRpbmdCbG9ja3F1b3RlID0gdHJ1ZTtcbiAgICAgIGFmdGVyID0gdGhpcy5wdXNoTGVmdCgnPiAnKTtcbiAgICAgIHRoaXMuc3RhcnRpbmdCbG9ja3F1b3RlID0gZmFsc2U7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdLQkQnOlxuICAgICAgYWZ0ZXIgPSB0aGlzLmh0bWxUYWcoJ2tiZCcpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnQSc6XG4gICAgY2FzZSAnSU1HJzpcbiAgICAgIGhyZWYgPSBhdHRyKGVsLCBlbC50YWdOYW1lID09PSAnQScgPyAnaHJlZicgOiAnc3JjJywgdGhpcy5vcHRpb25zLmFic29sdXRlKTtcbiAgICAgIGlmICghaHJlZikge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHRpdGxlID0gYXR0cihlbCwgJ3RpdGxlJyk7XG4gICAgICBpZiAodGl0bGUpIHtcbiAgICAgICAgaHJlZiArPSAnIFwiJyArIHRpdGxlICsgJ1wiJztcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuaW5saW5lKSB7XG4gICAgICAgIHN1ZmZpeCA9ICcoJyArIGhyZWYgKyAnKSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdWZmaXggPSAnWycgKyAoKGJhc2UgPSB0aGlzLmxpbmtNYXApW2hyZWZdICE9IG51bGwgPyBiYXNlW2hyZWZdIDogYmFzZVtocmVmXSA9IHRoaXMubGlua3MucHVzaChocmVmKSkgKyAnXSc7XG4gICAgICB9XG4gICAgICBpZiAoZWwudGFnTmFtZSA9PT0gJ0lNRycpIHtcbiAgICAgICAgdGhpcy5vdXRwdXQoJyFbJyArIGF0dHIoZWwsICdhbHQnKSArICddJyArIHN1ZmZpeCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMub3V0cHV0KCdbJyk7XG4gICAgICB0aGlzLm5vVHJhaWxpbmdXaGl0ZXNwYWNlID0gdHJ1ZTtcbiAgICAgIGFmdGVyID0gdGhpcy5vdXRwdXRMYXRlcignXScgKyBzdWZmaXgpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnSUZSQU1FJzpcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmICgocmVmID0gZWwuY29udGVudERvY3VtZW50KSAhPSBudWxsID8gcmVmLmRvY3VtZW50RWxlbWVudCA6IHZvaWQgMCkge1xuICAgICAgICAgIHRoaXMucHJvY2VzcyhlbC5jb250ZW50RG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmcmFtZVNyYyA9IGF0dHIoZWwsICdzcmMnKTtcbiAgICAgICAgICBpZiAoZnJhbWVTcmMgJiYgdGhpcy5vcHRpb25zLmFsbG93RnJhbWUgJiYgdGhpcy5vcHRpb25zLmFsbG93RnJhbWUoZnJhbWVTcmMpKSB7XG4gICAgICAgICAgICB0aGlzLm91dHB1dCgnPGlmcmFtZSBzcmM9XCInICsgZnJhbWVTcmMgKyAnXCI+PC9pZnJhbWU+Jyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgfVxuXG4gIGFmdGVyID0gdGhpcy50YWJsZXMoZWwpIHx8IGFmdGVyO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBlbC5jaGlsZE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy5wcm9jZXNzKGVsLmNoaWxkTm9kZXNbaV0pO1xuICB9XG5cbiAgdGhpcy5hZHZhbmNlSHRtbEluZGV4KCc8XFxcXHM/XFxcXC9cXFxccz8nICsgZWwudGFnTmFtZSArICc+Jyk7XG5cbiAgaWYgKHR5cGVvZiBhZnRlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGFmdGVyID0gW2FmdGVyXTtcbiAgfVxuICB3aGlsZSAoYWZ0ZXIgJiYgYWZ0ZXIubGVuZ3RoKSB7XG4gICAgYWZ0ZXIuc2hpZnQoKS5jYWxsKHRoaXMpO1xuICB9XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS50YWJsZXMgPSBmdW5jdGlvbiB0YWJsZXMgKGVsKSB7XG4gIGlmICh0aGlzLm9wdGlvbnMudGFibGVzID09PSBmYWxzZSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBuYW1lID0gZWwudGFnTmFtZTtcbiAgaWYgKG5hbWUgPT09ICdUQUJMRScpIHtcbiAgICB0aGlzLnRhYmxlQ29scyA9IFtdO1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAobmFtZSA9PT0gJ1RIRUFEJykge1xuICAgIHJldHVybiBmdW5jdGlvbiBhZnRlciAoKSB7XG4gICAgICByZXR1cm4gdGhpcy5hcHBlbmQoJ3wnICsgdGhpcy50YWJsZUNvbHMucmVkdWNlKHJlZHVjZXIsICcnKSArICdcXG4nKTtcbiAgICAgIGZ1bmN0aW9uIHJlZHVjZXIgKGFsbCwgdGhMZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGFsbCArICctJy5yZXBlYXQodGhMZW5ndGggKyAyKSArICd8JztcbiAgICAgIH1cbiAgICB9O1xuICB9XG4gIGlmIChuYW1lID09PSAnVEgnKSB7XG4gICAgcmV0dXJuIFtmdW5jdGlvbiBhZnRlciAoKSB7XG4gICAgICB0aGlzLnRhYmxlQ29scy5wdXNoKHRoaXMuY2hpbGRCdWZmZXIubGVuZ3RoKTtcbiAgICB9LCB0aGlzLnRkKHRydWUpXTtcbiAgfVxuICBpZiAobmFtZSA9PT0gJ1RSJykge1xuICAgIHRoaXMudGFibGVDb2wgPSAwO1xuICAgIHRoaXMub3V0cHV0KCd8Jyk7XG4gICAgdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IHRydWU7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGFmdGVyICgpIHtcbiAgICAgIHRoaXMuYXBwZW5kKCdcXG4nKTtcbiAgICB9O1xuICB9XG4gIGlmIChuYW1lID09PSAnVEQnKSB7XG4gICAgcmV0dXJuIHRoaXMudGQoKTtcbiAgfVxufTtcblxuRG9tYWRvci5wcm90b3R5cGUucHVzaExlZnQgPSBmdW5jdGlvbiBwdXNoTGVmdCAodGV4dCkge1xuICB2YXIgb2xkO1xuICBvbGQgPSB0aGlzLmxlZnQ7XG4gIHRoaXMubGVmdCArPSB0ZXh0O1xuICBpZiAodGhpcy5hdFApIHtcbiAgICB0aGlzLmFwcGVuZCh0ZXh0KTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnAoKTtcbiAgfVxuICByZXR1cm4gKGZ1bmN0aW9uKF90aGlzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgX3RoaXMubGVmdCA9IG9sZDtcbiAgICAgIF90aGlzLmF0TGVmdCA9IF90aGlzLmF0UCA9IGZhbHNlO1xuICAgICAgcmV0dXJuIF90aGlzLnAoKTtcbiAgICB9O1xuICB9KSh0aGlzKTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLnJlcGxhY2VMZWZ0ID0gZnVuY3Rpb24gcmVwbGFjZUxlZnQgKHRleHQpIHtcbiAgaWYgKCF0aGlzLmF0TGVmdCkge1xuICAgIHRoaXMuYXBwZW5kKHRoaXMubGVmdC5yZXBsYWNlKC9bIF17Miw0fSQvLCB0ZXh0KSk7XG4gICAgcmV0dXJuIHRoaXMuYXRMZWZ0ID0gdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IHRoaXMuYXRQID0gdHJ1ZTtcbiAgfSBlbHNlIGlmICh0aGlzLmxhc3QpIHtcbiAgICByZXR1cm4gdGhpcy5sYXN0ID0gdGhpcy5sYXN0LnJlcGxhY2UoL1sgXXsyLDR9JC8sIHRleHQpO1xuICB9XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5pc1Zpc2libGUgPSBmdW5jdGlvbiBpc1Zpc2libGUgKGVsKSB7XG4gIHZhciBkaXNwbGF5O1xuICB2YXIgaTtcbiAgdmFyIHByb3BlcnR5O1xuICB2YXIgdmlzaWJpbGl0eTtcbiAgdmFyIHZpc2libGUgPSB0cnVlO1xuICB2YXIgc3R5bGUgPSBhdHRyKGVsLCAnc3R5bGUnLCBmYWxzZSk7XG4gIHZhciBwcm9wZXJ0aWVzID0gc3R5bGUgIT0gbnVsbCA/IHR5cGVvZiBzdHlsZS5tYXRjaCA9PT0gJ2Z1bmN0aW9uJyA/IHN0eWxlLm1hdGNoKHJkaXNwbGF5KSA6IHZvaWQgMCA6IHZvaWQgMDtcbiAgaWYgKHByb3BlcnRpZXMgIT0gbnVsbCkge1xuICAgIGZvciAoaSA9IDA7IGkgPCBwcm9wZXJ0aWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBwcm9wZXJ0eSA9IHByb3BlcnRpZXNbaV07XG4gICAgICB2aXNpYmxlID0gIXJoaWRkZW4udGVzdChwcm9wZXJ0eSk7XG4gICAgfVxuICB9XG4gIGlmICh2aXNpYmxlICYmIHR5cGVvZiB0aGlzLndpbmRvd0NvbnRleHQuZ2V0Q29tcHV0ZWRTdHlsZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHRyeSB7XG4gICAgICBzdHlsZSA9IHRoaXMud2luZG93Q29udGV4dC5nZXRDb21wdXRlZFN0eWxlKGVsLCBudWxsKTtcbiAgICAgIGlmICh0eXBlb2YgKHN0eWxlICE9IG51bGwgPyBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlIDogdm9pZCAwKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBkaXNwbGF5ID0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnZGlzcGxheScpO1xuICAgICAgICB2aXNpYmlsaXR5ID0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgndmlzaWJpbGl0eScpO1xuICAgICAgICB2aXNpYmxlID0gZGlzcGxheSAhPT0gJ25vbmUnICYmIHZpc2liaWxpdHkgIT09ICdoaWRkZW4nO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgIH1cbiAgfVxuICByZXR1cm4gdmlzaWJsZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gcGFyc2U7XG4iLCIvKiEgaHR0cDovL210aHMuYmUvcmVwZWF0IHYwLjIuMCBieSBAbWF0aGlhcyAqL1xuaWYgKCFTdHJpbmcucHJvdG90eXBlLnJlcGVhdCkge1xuXHQoZnVuY3Rpb24oKSB7XG5cdFx0J3VzZSBzdHJpY3QnOyAvLyBuZWVkZWQgdG8gc3VwcG9ydCBgYXBwbHlgL2BjYWxsYCB3aXRoIGB1bmRlZmluZWRgL2BudWxsYFxuXHRcdHZhciBkZWZpbmVQcm9wZXJ0eSA9IChmdW5jdGlvbigpIHtcblx0XHRcdC8vIElFIDggb25seSBzdXBwb3J0cyBgT2JqZWN0LmRlZmluZVByb3BlcnR5YCBvbiBET00gZWxlbWVudHNcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHZhciBvYmplY3QgPSB7fTtcblx0XHRcdFx0dmFyICRkZWZpbmVQcm9wZXJ0eSA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eTtcblx0XHRcdFx0dmFyIHJlc3VsdCA9ICRkZWZpbmVQcm9wZXJ0eShvYmplY3QsIG9iamVjdCwgb2JqZWN0KSAmJiAkZGVmaW5lUHJvcGVydHk7XG5cdFx0XHR9IGNhdGNoKGVycm9yKSB7fVxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9KCkpO1xuXHRcdHZhciByZXBlYXQgPSBmdW5jdGlvbihjb3VudCkge1xuXHRcdFx0aWYgKHRoaXMgPT0gbnVsbCkge1xuXHRcdFx0XHR0aHJvdyBUeXBlRXJyb3IoKTtcblx0XHRcdH1cblx0XHRcdHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG5cdFx0XHQvLyBgVG9JbnRlZ2VyYFxuXHRcdFx0dmFyIG4gPSBjb3VudCA/IE51bWJlcihjb3VudCkgOiAwO1xuXHRcdFx0aWYgKG4gIT0gbikgeyAvLyBiZXR0ZXIgYGlzTmFOYFxuXHRcdFx0XHRuID0gMDtcblx0XHRcdH1cblx0XHRcdC8vIEFjY291bnQgZm9yIG91dC1vZi1ib3VuZHMgaW5kaWNlc1xuXHRcdFx0aWYgKG4gPCAwIHx8IG4gPT0gSW5maW5pdHkpIHtcblx0XHRcdFx0dGhyb3cgUmFuZ2VFcnJvcigpO1xuXHRcdFx0fVxuXHRcdFx0dmFyIHJlc3VsdCA9ICcnO1xuXHRcdFx0d2hpbGUgKG4pIHtcblx0XHRcdFx0aWYgKG4gJSAyID09IDEpIHtcblx0XHRcdFx0XHRyZXN1bHQgKz0gc3RyaW5nO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChuID4gMSkge1xuXHRcdFx0XHRcdHN0cmluZyArPSBzdHJpbmc7XG5cdFx0XHRcdH1cblx0XHRcdFx0biA+Pj0gMTtcblx0XHRcdH1cblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fTtcblx0XHRpZiAoZGVmaW5lUHJvcGVydHkpIHtcblx0XHRcdGRlZmluZVByb3BlcnR5KFN0cmluZy5wcm90b3R5cGUsICdyZXBlYXQnLCB7XG5cdFx0XHRcdCd2YWx1ZSc6IHJlcGVhdCxcblx0XHRcdFx0J2NvbmZpZ3VyYWJsZSc6IHRydWUsXG5cdFx0XHRcdCd3cml0YWJsZSc6IHRydWVcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRTdHJpbmcucHJvdG90eXBlLnJlcGVhdCA9IHJlcGVhdDtcblx0XHR9XG5cdH0oKSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmlmICghd2luZG93Lk5vZGUpIHtcbiAgd2luZG93Lk5vZGUgPSB7XG4gICAgRUxFTUVOVF9OT0RFOiAxLFxuICAgIFRFWFRfTk9ERTogM1xuICB9O1xufVxuXG5mdW5jdGlvbiB3aW5kb3dDb250ZXh0ICgpIHtcbiAgcmV0dXJuIHdpbmRvdztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB3aW5kb3dDb250ZXh0O1xuIl19

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
var blockTags = [
  'ADDRESS', 'ARTICLE', 'ASIDE', 'DIV', 'FIELDSET', 'FOOTER', 'HEADER', 'NAV', 'P', 'SECTION', 'UL', 'LI', 'BLOCKQUOTE', 'BR'
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

function outputMapper (fn, tagName) {
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
  this.inCode = this.inPre = this.inOrderedList = this.inTable = false;
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
  result = this.inOrderedList ? (this.order++) + '. ' : '- ';
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
  this.buffer = this.buffer.replace(/\n{3,}/g, '\n\n');
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

  if ((this.inTable || this.inPre) && blockTags.indexOf(el.tagName) !== -1) {
    return this.output(el.outerHTML);
  }

  if (el.nodeType === this.windowContext.Node.TEXT_NODE) {
    if (!this.inPre && el.nodeValue.replace(/\n/g, '').length === 0) {
      return;
    }
    interleaved = this.interleaveMarkers(el.nodeValue);
    if (this.inPre || this.inTable) {
      return this.output(interleaved.map(outputMapper()).join(''));
    }
    if (this.inCode) {
      return this.output(interleaved.map(outputMapper(processCode)).join(''));
    }
    return this.output(interleaved.map(outputMapper(processPlainText, el.parentElement && el.parentElement.tagName)).join(''));
  }

  if (el.nodeType !== this.windowContext.Node.ELEMENT_NODE) {
    return;
  }

  if (this.lastElement) { // i.e not the auto-inserted <div> wrapper
    this.insertMarkers();
    this.advanceHtmlIndex('<' + el.tagName);
    this.advanceHtmlIndex('>');

    var transformed = this.options.transform(el);
    if (transformed !== void 0) {
      return this.output(transformed);
    }
  }
  this.lastElement = el;

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
        this.openCodeFence(el);
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
    var oldInTable;
    oldInTable = this.inTable;
    this.inTable = true;
    this.append('\n\n');
    this.tableCols = [];
    return (function(_this) {
      return function after () {
        return _this.inTable = oldInTable;
      };
    })(this);
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

Domador.prototype.openCodeFence = function openCodeFence (el) {
  var fencinglanguage = this.options.fencinglanguage(el);
  var child = el.childNodes[0];
  if (!fencinglanguage && child && child.tagName === 'CODE') {
    fencinglanguage = this.options.fencinglanguage(el.childNodes[0]);
  }
  this.output('```' + (fencinglanguage || '') + '\n');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkb21hZG9yLmpzIiwibm9kZV9tb2R1bGVzL3N0cmluZy5wcm90b3R5cGUucmVwZWF0L3JlcGVhdC5qcyIsIndpbmRvd0NvbnRleHQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG5yZXF1aXJlKCdzdHJpbmcucHJvdG90eXBlLnJlcGVhdCcpO1xuXG52YXIgcmVwbGFjZW1lbnRzID0ge1xuICAnXFxcXFxcXFwnOiAnXFxcXFxcXFwnLFxuICAnXFxcXFsnOiAnXFxcXFsnLFxuICAnXFxcXF0nOiAnXFxcXF0nLFxuICAnPic6ICdcXFxcPicsXG4gICdfJzogJ1xcXFxfJyxcbiAgJ1xcXFwqJzogJ1xcXFwqJyxcbiAgJ2AnOiAnXFxcXGAnLFxuICAnIyc6ICdcXFxcIycsXG4gICcoWzAtOV0pXFxcXC4oXFxcXHN8JCknOiAnJDFcXFxcLiQyJyxcbiAgJ1xcdTAwYTknOiAnKGMpJyxcbiAgJ1xcdTAwYWUnOiAnKHIpJyxcbiAgJ1xcdTIxMjInOiAnKHRtKScsXG4gICdcXHUwMGEwJzogJyAnLFxuICAnXFx1MDBiNyc6ICdcXFxcKicsXG4gICdcXHUyMDAyJzogJyAnLFxuICAnXFx1MjAwMyc6ICcgJyxcbiAgJ1xcdTIwMDknOiAnICcsXG4gICdcXHUyMDE4JzogJ1xcJycsXG4gICdcXHUyMDE5JzogJ1xcJycsXG4gICdcXHUyMDFjJzogJ1wiJyxcbiAgJ1xcdTIwMWQnOiAnXCInLFxuICAnXFx1MjAyNic6ICcuLi4nLFxuICAnXFx1MjAxMyc6ICctLScsXG4gICdcXHUyMDE0JzogJy0tLSdcbn07XG52YXIgcmVwbGFjZXJzID0gT2JqZWN0LmtleXMocmVwbGFjZW1lbnRzKS5yZWR1Y2UocmVwbGFjZXIsIHt9KTtcbnZhciByc3BhY2VzID0gL15cXHMrfFxccyskL2c7XG52YXIgcmRpc3BsYXkgPSAvKGRpc3BsYXl8dmlzaWJpbGl0eSlcXHMqOlxccypbYS16XSsvZ2k7XG52YXIgcmhpZGRlbiA9IC8obm9uZXxoaWRkZW4pXFxzKiQvaTtcbnZhciByaGVhZGluZyA9IC9eSChbMS02XSkkLztcbnZhciBzaGFsbG93VGFncyA9IFtcbiAgJ0FQUExFVCcsICdBUkVBJywgJ0FVRElPJywgJ0JVVFRPTicsICdDQU5WQVMnLCAnREFUQUxJU1QnLCAnRU1CRUQnLCAnSEVBRCcsICdJTlBVVCcsICdNQVAnLFxuICAnTUVOVScsICdNRVRFUicsICdOT0ZSQU1FUycsICdOT1NDUklQVCcsICdPQkpFQ1QnLCAnT1BUR1JPVVAnLCAnT1BUSU9OJywgJ1BBUkFNJywgJ1BST0dSRVNTJyxcbiAgJ1JQJywgJ1JUJywgJ1JVQlknLCAnU0NSSVBUJywgJ1NFTEVDVCcsICdTVFlMRScsICdURVhUQVJFQScsICdUSVRMRScsICdWSURFTydcbl07XG52YXIgcGFyYWdyYXBoVGFncyA9IFtcbiAgJ0FERFJFU1MnLCAnQVJUSUNMRScsICdBU0lERScsICdESVYnLCAnRklFTERTRVQnLCAnRk9PVEVSJywgJ0hFQURFUicsICdOQVYnLCAnUCcsICdTRUNUSU9OJ1xuXTtcbnZhciBibG9ja1RhZ3MgPSBbXG4gICdBRERSRVNTJywgJ0FSVElDTEUnLCAnQVNJREUnLCAnRElWJywgJ0ZJRUxEU0VUJywgJ0ZPT1RFUicsICdIRUFERVInLCAnTkFWJywgJ1AnLCAnU0VDVElPTicsICdVTCcsICdMSScsICdCTE9DS1FVT1RFJywgJ0JSJ1xuXTtcbnZhciB3aW5kb3dDb250ZXh0ID0gcmVxdWlyZSgnLi92aXJ0dWFsV2luZG93Q29udGV4dCcpO1xuXG5mdW5jdGlvbiByZXBsYWNlciAocmVzdWx0LCBrZXkpIHtcbiAgcmVzdWx0W2tleV0gPSBuZXcgUmVnRXhwKGtleSwgJ2cnKTsgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gbWFueSAodGV4dCwgdGltZXMpIHtcbiAgcmV0dXJuIG5ldyBBcnJheSh0aW1lcyArIDEpLmpvaW4odGV4dCk7XG59XG5cbmZ1bmN0aW9uIHBhZExlZnQgKHRleHQsIHRpbWVzKSB7XG4gIHJldHVybiBtYW55KCcgJywgdGltZXMpICsgdGV4dDtcbn1cblxuZnVuY3Rpb24gdHJpbSAodGV4dCkge1xuICBpZiAodGV4dC50cmltKSB7XG4gICAgcmV0dXJuIHRleHQudHJpbSgpO1xuICB9XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UocnNwYWNlcywgJycpO1xufVxuXG5mdW5jdGlvbiBhdHRyIChlbCwgcHJvcCwgZGlyZWN0KSB7XG4gIHZhciBwcm9wZXIgPSBkaXJlY3QgPT09IHZvaWQgMCB8fCBkaXJlY3Q7XG4gIGlmIChwcm9wZXIgfHwgdHlwZW9mIGVsLmdldEF0dHJpYnV0ZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBlbFtwcm9wXSB8fCAnJztcbiAgfVxuICByZXR1cm4gZWwuZ2V0QXR0cmlidXRlKHByb3ApIHx8ICcnO1xufVxuXG5mdW5jdGlvbiBoYXMgKGVsLCBwcm9wLCBkaXJlY3QpIHtcbiAgdmFyIHByb3BlciA9IGRpcmVjdCA9PT0gdm9pZCAwIHx8IGRpcmVjdDtcbiAgaWYgKHByb3BlciB8fCB0eXBlb2YgZWwuaGFzQXR0cmlidXRlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGVsLmhhc093blByb3BlcnR5KHByb3ApO1xuICB9XG4gIHJldHVybiBlbC5oYXNBdHRyaWJ1dGUocHJvcCk7XG59XG5cbmZ1bmN0aW9uIHByb2Nlc3NQbGFpblRleHQgKHRleHQsIHRhZ05hbWUpIHtcbiAgdmFyIGtleTtcbiAgdmFyIGJsb2NrID0gcGFyYWdyYXBoVGFncy5pbmRleE9mKHRhZ05hbWUpICE9PSAtMSB8fCB0YWdOYW1lID09PSAnQkxPQ0tRVU9URSc7XG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xcbihbIFxcdF0qXFxuKSsvZywgJ1xcbicpO1xuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9cXG5bIFxcdF0rL2csICdcXG4nKTtcbiAgdGV4dCA9IHRleHQucmVwbGFjZSgvWyBcXHRdKy9nLCAnICcpO1xuICBmb3IgKGtleSBpbiByZXBsYWNlbWVudHMpIHtcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKHJlcGxhY2Vyc1trZXldLCByZXBsYWNlbWVudHNba2V5XSk7XG4gIH1cbiAgdGV4dCA9IHRleHQucmVwbGFjZSgvKFxccyopXFxcXCMvZywgYmxvY2sgPyByZW1vdmVVbm5lY2Vzc2FyeUVzY2FwZXMgOiAnJDEjJyk7XG4gIHJldHVybiB0ZXh0O1xuXG4gIGZ1bmN0aW9uIHJlbW92ZVVubmVjZXNzYXJ5RXNjYXBlcyAoZXNjYXBlZCwgc3BhY2VzLCBpKSB7XG4gICAgcmV0dXJuIGkgPyBzcGFjZXMgKyAnIycgOiBlc2NhcGVkO1xuICB9XG59XG5cbmZ1bmN0aW9uIHByb2Nlc3NDb2RlICh0ZXh0KSB7XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoL2AvZywgJ1xcXFxgJyk7XG59XG5cbmZ1bmN0aW9uIG91dHB1dE1hcHBlciAoZm4sIHRhZ05hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIGJpdFByb2Nlc3NvciAoYml0KSB7XG4gICAgaWYgKGJpdC5tYXJrZXIpIHtcbiAgICAgIHJldHVybiBiaXQubWFya2VyO1xuICAgIH1cbiAgICBpZiAoIWZuKSB7XG4gICAgICByZXR1cm4gYml0LnRleHQ7XG4gICAgfVxuICAgIHJldHVybiBmbihiaXQudGV4dCwgdGFnTmFtZSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIG5vb3AgKCkge31cblxuZnVuY3Rpb24gcGFyc2UgKGh0bWwsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIG5ldyBEb21hZG9yKGh0bWwsIG9wdGlvbnMpLnBhcnNlKCk7XG59XG5cbmZ1bmN0aW9uIERvbWFkb3IgKGh0bWwsIG9wdGlvbnMpIHtcbiAgdGhpcy5odG1sID0gaHRtbCB8fCAnJztcbiAgdGhpcy5odG1sSW5kZXggPSAwO1xuICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICB0aGlzLm1hcmtlcnMgPSB0aGlzLm9wdGlvbnMubWFya2VycyA/IHRoaXMub3B0aW9ucy5tYXJrZXJzLnNvcnQoYXNjKSA6IFtdO1xuICB0aGlzLndpbmRvd0NvbnRleHQgPSB3aW5kb3dDb250ZXh0KHRoaXMub3B0aW9ucyk7XG4gIHRoaXMuYXRMZWZ0ID0gdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IHRoaXMuYXRQID0gdHJ1ZTtcbiAgdGhpcy5idWZmZXIgPSB0aGlzLmNoaWxkQnVmZmVyID0gJyc7XG4gIHRoaXMuZXhjZXB0aW9ucyA9IFtdO1xuICB0aGlzLm9yZGVyID0gMTtcbiAgdGhpcy5saXN0RGVwdGggPSAwO1xuICB0aGlzLmluQ29kZSA9IHRoaXMuaW5QcmUgPSB0aGlzLmluT3JkZXJlZExpc3QgPSB0aGlzLmluVGFibGUgPSBmYWxzZTtcbiAgdGhpcy5sYXN0ID0gbnVsbDtcbiAgdGhpcy5sZWZ0ID0gJ1xcbic7XG4gIHRoaXMubGlua3MgPSBbXTtcbiAgdGhpcy5saW5rTWFwID0ge307XG4gIHRoaXMudW5oYW5kbGVkID0ge307XG4gIGlmICh0aGlzLm9wdGlvbnMuYWJzb2x1dGUgPT09IHZvaWQgMCkgeyB0aGlzLm9wdGlvbnMuYWJzb2x1dGUgPSBmYWxzZTsgfVxuICBpZiAodGhpcy5vcHRpb25zLmZlbmNpbmcgPT09IHZvaWQgMCkgeyB0aGlzLm9wdGlvbnMuZmVuY2luZyA9IGZhbHNlOyB9XG4gIGlmICh0aGlzLm9wdGlvbnMuZmVuY2luZ2xhbmd1YWdlID09PSB2b2lkIDApIHsgdGhpcy5vcHRpb25zLmZlbmNpbmdsYW5ndWFnZSA9IG5vb3A7IH1cbiAgaWYgKHRoaXMub3B0aW9ucy50cmFuc2Zvcm0gPT09IHZvaWQgMCkgeyB0aGlzLm9wdGlvbnMudHJhbnNmb3JtID0gbm9vcDsgfVxuICBmdW5jdGlvbiBhc2MgKGEsIGIpIHsgcmV0dXJuIGFbMF0gLSBiWzBdOyB9XG59XG5cbkRvbWFkb3IucHJvdG90eXBlLmFwcGVuZCA9IGZ1bmN0aW9uIGFwcGVuZCAodGV4dCkge1xuICBpZiAodGhpcy5sYXN0ICE9IG51bGwpIHtcbiAgICB0aGlzLmJ1ZmZlciArPSB0aGlzLmxhc3Q7XG4gIH1cbiAgdGhpcy5jaGlsZEJ1ZmZlciArPSB0ZXh0O1xuICByZXR1cm4gdGhpcy5sYXN0ID0gdGV4dDtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLmJyID0gZnVuY3Rpb24gYnIgKCkge1xuICB0aGlzLmFwcGVuZCgnICAnICsgIHRoaXMubGVmdCk7XG4gIHJldHVybiB0aGlzLmF0TGVmdCA9IHRoaXMubm9UcmFpbGluZ1doaXRlc3BhY2UgPSB0cnVlO1xufTtcblxuRG9tYWRvci5wcm90b3R5cGUuY29kZSA9IGZ1bmN0aW9uIGNvZGUgKCkge1xuICB2YXIgb2xkO1xuICBvbGQgPSB0aGlzLmluQ29kZTtcbiAgdGhpcy5pbkNvZGUgPSB0cnVlO1xuICByZXR1cm4gKGZ1bmN0aW9uKF90aGlzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGFmdGVyICgpIHtcbiAgICAgIHJldHVybiBfdGhpcy5pbkNvZGUgPSBvbGQ7XG4gICAgfTtcbiAgfSkodGhpcyk7XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5saSA9IGZ1bmN0aW9uIGxpICgpIHtcbiAgdmFyIHJlc3VsdDtcbiAgcmVzdWx0ID0gdGhpcy5pbk9yZGVyZWRMaXN0ID8gKHRoaXMub3JkZXIrKykgKyAnLiAnIDogJy0gJztcbiAgcmVzdWx0ID0gcGFkTGVmdChyZXN1bHQsICh0aGlzLmxpc3REZXB0aCAtIDEpICogMik7XG4gIHJldHVybiB0aGlzLmFwcGVuZChyZXN1bHQpO1xufTtcblxuRG9tYWRvci5wcm90b3R5cGUudGQgPSBmdW5jdGlvbiB0ZCAoaGVhZGVyKSB7XG4gIHRoaXMubm9UcmFpbGluZ1doaXRlc3BhY2UgPSBmYWxzZTtcbiAgdGhpcy5vdXRwdXQoJyAnKTtcbiAgdGhpcy5jaGlsZEJ1ZmZlciA9ICcnO1xuICB0aGlzLm5vVHJhaWxpbmdXaGl0ZXNwYWNlID0gZmFsc2U7XG4gIHJldHVybiBmdW5jdGlvbiBhZnRlciAoKSB7XG4gICAgdmFyIHNwYWNlcyA9IGhlYWRlciA/IDAgOiBNYXRoLm1heCgwLCB0aGlzLnRhYmxlQ29sc1t0aGlzLnRhYmxlQ29sKytdIC0gdGhpcy5jaGlsZEJ1ZmZlci5sZW5ndGgpO1xuICAgIHRoaXMuYXBwZW5kKCcgJy5yZXBlYXQoc3BhY2VzICsgMSkgKyAnfCcpO1xuICAgIHRoaXMubm9UcmFpbGluZ1doaXRlc3BhY2UgPSB0cnVlO1xuICB9O1xufTtcblxuRG9tYWRvci5wcm90b3R5cGUub2wgPSBmdW5jdGlvbiBvbCAoKSB7XG4gIHZhciBpbk9yZGVyZWRMaXN0LCBvcmRlcjtcbiAgaWYgKHRoaXMubGlzdERlcHRoID09PSAwKSB7XG4gICAgdGhpcy5wKCk7XG4gIH1cbiAgaW5PcmRlcmVkTGlzdCA9IHRoaXMuaW5PcmRlcmVkTGlzdDtcbiAgb3JkZXIgPSB0aGlzLm9yZGVyO1xuICB0aGlzLmluT3JkZXJlZExpc3QgPSB0cnVlO1xuICB0aGlzLm9yZGVyID0gMTtcbiAgdGhpcy5saXN0RGVwdGgrKztcbiAgcmV0dXJuIChmdW5jdGlvbihfdGhpcykge1xuICAgIHJldHVybiBmdW5jdGlvbiBhZnRlciAoKSB7XG4gICAgICBfdGhpcy5pbk9yZGVyZWRMaXN0ID0gaW5PcmRlcmVkTGlzdDtcbiAgICAgIF90aGlzLm9yZGVyID0gb3JkZXI7XG4gICAgICByZXR1cm4gX3RoaXMubGlzdERlcHRoLS07XG4gICAgfTtcbiAgfSkodGhpcyk7XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS51bCA9IGZ1bmN0aW9uIHVsICgpIHtcbiAgdmFyIGluT3JkZXJlZExpc3QsIG9yZGVyO1xuICBpZiAodGhpcy5saXN0RGVwdGggPT09IDApIHtcbiAgICB0aGlzLnAoKTtcbiAgfVxuICBpbk9yZGVyZWRMaXN0ID0gdGhpcy5pbk9yZGVyZWRMaXN0O1xuICBvcmRlciA9IHRoaXMub3JkZXI7XG4gIHRoaXMuaW5PcmRlcmVkTGlzdCA9IGZhbHNlO1xuICB0aGlzLm9yZGVyID0gMTtcbiAgdGhpcy5saXN0RGVwdGgrKztcbiAgcmV0dXJuIChmdW5jdGlvbihfdGhpcykge1xuICAgIHJldHVybiBmdW5jdGlvbiBhZnRlciAoKSB7XG4gICAgICBfdGhpcy5pbk9yZGVyZWRMaXN0ID0gaW5PcmRlcmVkTGlzdDtcbiAgICAgIF90aGlzLm9yZGVyID0gb3JkZXI7XG4gICAgICByZXR1cm4gX3RoaXMubGlzdERlcHRoLS07XG4gICAgfTtcbiAgfSkodGhpcyk7XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5vdXRwdXQgPSBmdW5jdGlvbiBvdXRwdXQgKHRleHQpIHtcbiAgaWYgKCF0ZXh0KSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghdGhpcy5pblByZSkge1xuICAgIHRleHQgPSB0aGlzLm5vVHJhaWxpbmdXaGl0ZXNwYWNlID8gdGV4dC5yZXBsYWNlKC9eWyBcXHRcXG5dKy8sICcnKSA6IC9eWyBcXHRdKlxcbi8udGVzdCh0ZXh0KSA/IHRleHQucmVwbGFjZSgvXlsgXFx0XFxuXSsvLCAnXFxuJykgOiB0ZXh0LnJlcGxhY2UoL15bIFxcdF0rLywgJyAnKTtcbiAgfVxuICBpZiAodGV4dCA9PT0gJycpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdGhpcy5hdFAgPSAvXFxuXFxuJC8udGVzdCh0ZXh0KTtcbiAgdGhpcy5hdExlZnQgPSAvXFxuJC8udGVzdCh0ZXh0KTtcbiAgdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IC9bIFxcdFxcbl0kLy50ZXN0KHRleHQpO1xuICByZXR1cm4gdGhpcy5hcHBlbmQodGV4dC5yZXBsYWNlKC9cXG4vZywgdGhpcy5sZWZ0KSk7XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5vdXRwdXRMYXRlciA9IGZ1bmN0aW9uIG91dHB1dExhdGVyICh0ZXh0KSB7XG4gIHJldHVybiAoZnVuY3Rpb24oc2VsZikge1xuICAgIHJldHVybiBmdW5jdGlvbiBhZnRlciAoKSB7XG4gICAgICByZXR1cm4gc2VsZi5vdXRwdXQodGV4dCk7XG4gICAgfTtcbiAgfSkodGhpcyk7XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5wID0gZnVuY3Rpb24gcCAoKSB7XG4gIGlmICh0aGlzLmF0UCkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAodGhpcy5zdGFydGluZ0Jsb2NrcXVvdGUpIHtcbiAgICB0aGlzLmFwcGVuZCgnXFxuJyk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5hcHBlbmQodGhpcy5sZWZ0KTtcbiAgfVxuICBpZiAoIXRoaXMuYXRMZWZ0KSB7XG4gICAgdGhpcy5hcHBlbmQodGhpcy5sZWZ0KTtcbiAgICB0aGlzLmF0TGVmdCA9IHRydWU7XG4gIH1cbiAgcmV0dXJuIHRoaXMubm9UcmFpbGluZ1doaXRlc3BhY2UgPSB0aGlzLmF0UCA9IHRydWU7XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5wYXJzZSA9IGZ1bmN0aW9uIHBhcnNlICgpIHtcbiAgdmFyIGNvbnRhaW5lcjtcbiAgdmFyIGk7XG4gIHZhciBsaW5rO1xuICB2YXIgcmVmO1xuICB0aGlzLmJ1ZmZlciA9ICcnO1xuICBpZiAoIXRoaXMuaHRtbCkge1xuICAgIHJldHVybiB0aGlzLmJ1ZmZlcjtcbiAgfVxuICBpZiAodHlwZW9mIHRoaXMuaHRtbCA9PT0gJ3N0cmluZycpIHtcbiAgICBjb250YWluZXIgPSB0aGlzLndpbmRvd0NvbnRleHQuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgY29udGFpbmVyLmlubmVySFRNTCA9IHRoaXMuaHRtbExlZnQgPSB0aGlzLmh0bWw7XG4gIH0gZWxzZSB7XG4gICAgY29udGFpbmVyID0gdGhpcy5odG1sO1xuICAgIHRoaXMuaHRtbCA9IHRoaXMuaHRtbExlZnQgPSBjb250YWluZXIuaW5uZXJIVE1MO1xuICB9XG4gIHRoaXMucHJvY2Vzcyhjb250YWluZXIpO1xuICBpZiAodGhpcy5saW5rcy5sZW5ndGgpIHtcbiAgICB3aGlsZSAodGhpcy5sYXN0RWxlbWVudC5wYXJlbnRFbGVtZW50ICE9PSBjb250YWluZXIgJiYgdGhpcy5sYXN0RWxlbWVudC50YWdOYW1lICE9PSAnQkxPQ0tRVU9URScpIHtcbiAgICAgIHRoaXMubGFzdEVsZW1lbnQgPSB0aGlzLmxhc3RFbGVtZW50LnBhcmVudEVsZW1lbnQ7XG4gICAgfVxuICAgIGlmICh0aGlzLmxhc3RFbGVtZW50LnRhZ05hbWUgIT09ICdCTE9DS1FVT1RFJykge1xuICAgICAgdGhpcy5hcHBlbmQoJ1xcblxcbicpO1xuICAgIH1cbiAgICByZWYgPSB0aGlzLmxpbmtzO1xuICAgIGZvciAoaSA9IDA7IGkgPCByZWYubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxpbmsgPSByZWZbaV07XG4gICAgICBpZiAobGluaykge1xuICAgICAgICB0aGlzLmFwcGVuZCgnWycgKyAoaSArIDEpICsgJ106ICcgKyBsaW5rICsgJ1xcbicpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICB0aGlzLmFwcGVuZCgnJyk7XG4gIHRoaXMuYnVmZmVyID0gdGhpcy5idWZmZXIucmVwbGFjZSgvXFxuezMsfS9nLCAnXFxuXFxuJyk7XG4gIHJldHVybiB0aGlzLmJ1ZmZlciA9IHRyaW0odGhpcy5idWZmZXIpO1xufTtcblxuRG9tYWRvci5wcm90b3R5cGUucHJlID0gZnVuY3Rpb24gcHJlICgpIHtcbiAgdmFyIG9sZDtcbiAgb2xkID0gdGhpcy5pblByZTtcbiAgdGhpcy5pblByZSA9IHRydWU7XG4gIHJldHVybiAoZnVuY3Rpb24oX3RoaXMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gYWZ0ZXIgKCkge1xuICAgICAgcmV0dXJuIF90aGlzLmluUHJlID0gb2xkO1xuICAgIH07XG4gIH0pKHRoaXMpO1xufTtcblxuRG9tYWRvci5wcm90b3R5cGUuaHRtbFRhZyA9IGZ1bmN0aW9uIGh0bWxUYWcgKHR5cGUpIHtcbiAgdGhpcy5vdXRwdXQoJzwnICsgdHlwZSArICc+Jyk7XG4gIHJldHVybiB0aGlzLm91dHB1dExhdGVyKCc8LycgKyB0eXBlICsgJz4nKTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLmFkdmFuY2VIdG1sSW5kZXggPSBmdW5jdGlvbiBhZHZhbmNlSHRtbEluZGV4ICh0b2tlbikge1xuICBpZiAodGhpcy5tYXJrZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciByZSA9IG5ldyBSZWdFeHAodG9rZW4sICdpZycpO1xuICB2YXIgbWF0Y2ggPSByZS5leGVjKHRoaXMuaHRtbExlZnQpO1xuICBpZiAoIW1hdGNoKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBkaWZmID0gcmUubGFzdEluZGV4O1xuICB0aGlzLmh0bWxJbmRleCArPSBkaWZmO1xuICB0aGlzLmh0bWxMZWZ0ID0gdGhpcy5odG1sTGVmdC5zbGljZShkaWZmKTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLmluc2VydE1hcmtlcnMgPSBmdW5jdGlvbiBpbnNlcnRNYXJrZXJzICgpIHtcbiAgd2hpbGUgKHRoaXMubWFya2Vycy5sZW5ndGggJiYgdGhpcy5tYXJrZXJzWzBdWzBdIDw9IHRoaXMuaHRtbEluZGV4KSB7XG4gICAgdGhpcy5hcHBlbmQodGhpcy5tYXJrZXJzLnNoaWZ0KClbMV0pO1xuICB9XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5pbnRlcmxlYXZlTWFya2VycyA9IGZ1bmN0aW9uIGludGVybGVhdmVNYXJrZXJzICh0ZXh0KSB7XG4gIHZhciBtYXJrZXI7XG4gIHZhciBtYXJrZXJTdGFydDtcbiAgdmFyIGxhc3RNYXJrZXJTdGFydCA9IDA7XG4gIHZhciBiaXRzID0gW107XG4gIHdoaWxlICh0aGlzLm1hcmtlcnMubGVuZ3RoICYmIHRoaXMubWFya2Vyc1swXVswXSA8PSB0aGlzLmh0bWxJbmRleCArIHRleHQubGVuZ3RoKSB7XG4gICAgbWFya2VyID0gdGhpcy5tYXJrZXJzLnNoaWZ0KCk7XG4gICAgbWFya2VyU3RhcnQgPSBNYXRoLm1heCgwLCBtYXJrZXJbMF0gLSB0aGlzLmh0bWxJbmRleCk7XG4gICAgYml0cy5wdXNoKFxuICAgICAgeyB0ZXh0OiB0ZXh0LnNsaWNlKGxhc3RNYXJrZXJTdGFydCwgbWFya2VyU3RhcnQpIH0sXG4gICAgICB7IG1hcmtlcjogbWFya2VyWzFdIH1cbiAgICApO1xuICAgIGxhc3RNYXJrZXJTdGFydCA9IG1hcmtlclN0YXJ0O1xuICB9XG4gIGJpdHMucHVzaCh7IHRleHQ6IHRleHQuc2xpY2UobGFzdE1hcmtlclN0YXJ0KSB9KTtcbiAgcmV0dXJuIGJpdHM7XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5wcm9jZXNzID0gZnVuY3Rpb24gcHJvY2VzcyAoZWwpIHtcbiAgdmFyIGFmdGVyO1xuICB2YXIgYmFzZTtcbiAgdmFyIGhyZWY7XG4gIHZhciBpO1xuICB2YXIgcmVmO1xuICB2YXIgc3VmZml4O1xuICB2YXIgc3VtbWFyeTtcbiAgdmFyIHRpdGxlO1xuICB2YXIgZnJhbWVTcmM7XG4gIHZhciBpbnRlcmxlYXZlZDtcblxuICBpZiAoIXRoaXMuaXNWaXNpYmxlKGVsKSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICgodGhpcy5pblRhYmxlIHx8IHRoaXMuaW5QcmUpICYmIGJsb2NrVGFncy5pbmRleE9mKGVsLnRhZ05hbWUpICE9PSAtMSkge1xuICAgIHJldHVybiB0aGlzLm91dHB1dChlbC5vdXRlckhUTUwpO1xuICB9XG5cbiAgaWYgKGVsLm5vZGVUeXBlID09PSB0aGlzLndpbmRvd0NvbnRleHQuTm9kZS5URVhUX05PREUpIHtcbiAgICBpZiAoIXRoaXMuaW5QcmUgJiYgZWwubm9kZVZhbHVlLnJlcGxhY2UoL1xcbi9nLCAnJykubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGludGVybGVhdmVkID0gdGhpcy5pbnRlcmxlYXZlTWFya2VycyhlbC5ub2RlVmFsdWUpO1xuICAgIGlmICh0aGlzLmluUHJlIHx8IHRoaXMuaW5UYWJsZSkge1xuICAgICAgcmV0dXJuIHRoaXMub3V0cHV0KGludGVybGVhdmVkLm1hcChvdXRwdXRNYXBwZXIoKSkuam9pbignJykpO1xuICAgIH1cbiAgICBpZiAodGhpcy5pbkNvZGUpIHtcbiAgICAgIHJldHVybiB0aGlzLm91dHB1dChpbnRlcmxlYXZlZC5tYXAob3V0cHV0TWFwcGVyKHByb2Nlc3NDb2RlKSkuam9pbignJykpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5vdXRwdXQoaW50ZXJsZWF2ZWQubWFwKG91dHB1dE1hcHBlcihwcm9jZXNzUGxhaW5UZXh0LCBlbC5wYXJlbnRFbGVtZW50ICYmIGVsLnBhcmVudEVsZW1lbnQudGFnTmFtZSkpLmpvaW4oJycpKTtcbiAgfVxuXG4gIGlmIChlbC5ub2RlVHlwZSAhPT0gdGhpcy53aW5kb3dDb250ZXh0Lk5vZGUuRUxFTUVOVF9OT0RFKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHRoaXMubGFzdEVsZW1lbnQpIHsgLy8gaS5lIG5vdCB0aGUgYXV0by1pbnNlcnRlZCA8ZGl2PiB3cmFwcGVyXG4gICAgdGhpcy5pbnNlcnRNYXJrZXJzKCk7XG4gICAgdGhpcy5hZHZhbmNlSHRtbEluZGV4KCc8JyArIGVsLnRhZ05hbWUpO1xuICAgIHRoaXMuYWR2YW5jZUh0bWxJbmRleCgnPicpO1xuXG4gICAgdmFyIHRyYW5zZm9ybWVkID0gdGhpcy5vcHRpb25zLnRyYW5zZm9ybShlbCk7XG4gICAgaWYgKHRyYW5zZm9ybWVkICE9PSB2b2lkIDApIHtcbiAgICAgIHJldHVybiB0aGlzLm91dHB1dCh0cmFuc2Zvcm1lZCk7XG4gICAgfVxuICB9XG4gIHRoaXMubGFzdEVsZW1lbnQgPSBlbDtcblxuICBpZiAoc2hhbGxvd1RhZ3MuaW5kZXhPZihlbC50YWdOYW1lKSAhPT0gLTEpIHtcbiAgICB0aGlzLmFkdmFuY2VIdG1sSW5kZXgoJ1xcXFwvXFxcXHM/PicpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHN3aXRjaCAoZWwudGFnTmFtZSkge1xuICAgIGNhc2UgJ0gxJzpcbiAgICBjYXNlICdIMic6XG4gICAgY2FzZSAnSDMnOlxuICAgIGNhc2UgJ0g0JzpcbiAgICBjYXNlICdINSc6XG4gICAgY2FzZSAnSDYnOlxuICAgICAgdGhpcy5wKCk7XG4gICAgICB0aGlzLm91dHB1dChtYW55KCcjJywgcGFyc2VJbnQoZWwudGFnTmFtZS5tYXRjaChyaGVhZGluZylbMV0pKSArICcgJyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdBRERSRVNTJzpcbiAgICBjYXNlICdBUlRJQ0xFJzpcbiAgICBjYXNlICdBU0lERSc6XG4gICAgY2FzZSAnRElWJzpcbiAgICBjYXNlICdGSUVMRFNFVCc6XG4gICAgY2FzZSAnRk9PVEVSJzpcbiAgICBjYXNlICdIRUFERVInOlxuICAgIGNhc2UgJ05BVic6XG4gICAgY2FzZSAnUCc6XG4gICAgY2FzZSAnU0VDVElPTic6XG4gICAgICB0aGlzLnAoKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0JPRFknOlxuICAgIGNhc2UgJ0ZPUk0nOlxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnREVUQUlMUyc6XG4gICAgICB0aGlzLnAoKTtcbiAgICAgIGlmICghaGFzKGVsLCAnb3BlbicsIGZhbHNlKSkge1xuICAgICAgICBzdW1tYXJ5ID0gZWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3N1bW1hcnknKVswXTtcbiAgICAgICAgaWYgKHN1bW1hcnkpIHtcbiAgICAgICAgICB0aGlzLnByb2Nlc3Moc3VtbWFyeSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnQlInOlxuICAgICAgdGhpcy5icigpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnSFInOlxuICAgICAgdGhpcy5wKCk7XG4gICAgICB0aGlzLm91dHB1dCgnLS0tLS0tLS0tJyk7XG4gICAgICB0aGlzLnAoKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0NJVEUnOlxuICAgIGNhc2UgJ0RGTic6XG4gICAgY2FzZSAnRU0nOlxuICAgIGNhc2UgJ0knOlxuICAgIGNhc2UgJ1UnOlxuICAgIGNhc2UgJ1ZBUic6XG4gICAgICB0aGlzLm91dHB1dCgnXycpO1xuICAgICAgdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IHRydWU7XG4gICAgICBhZnRlciA9IHRoaXMub3V0cHV0TGF0ZXIoJ18nKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ01BUksnOlxuICAgICAgdGhpcy5vdXRwdXQoJzxtYXJrPicpO1xuICAgICAgYWZ0ZXIgPSB0aGlzLm91dHB1dExhdGVyKCc8L21hcms+Jyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdEVCc6XG4gICAgY2FzZSAnQic6XG4gICAgY2FzZSAnU1RST05HJzpcbiAgICAgIGlmIChlbC50YWdOYW1lID09PSAnRFQnKSB7XG4gICAgICAgIHRoaXMucCgpO1xuICAgICAgfVxuICAgICAgdGhpcy5vdXRwdXQoJyoqJyk7XG4gICAgICB0aGlzLm5vVHJhaWxpbmdXaGl0ZXNwYWNlID0gdHJ1ZTtcbiAgICAgIGFmdGVyID0gdGhpcy5vdXRwdXRMYXRlcignKionKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ1EnOlxuICAgICAgdGhpcy5vdXRwdXQoJ1wiJyk7XG4gICAgICB0aGlzLm5vVHJhaWxpbmdXaGl0ZXNwYWNlID0gdHJ1ZTtcbiAgICAgIGFmdGVyID0gdGhpcy5vdXRwdXRMYXRlcignXCInKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ09MJzpcbiAgICAgIGFmdGVyID0gdGhpcy5vbCgpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnVUwnOlxuICAgICAgYWZ0ZXIgPSB0aGlzLnVsKCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdMSSc6XG4gICAgICB0aGlzLnJlcGxhY2VMZWZ0KCdcXG4nKTtcbiAgICAgIHRoaXMubGkoKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ1BSRSc6XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmZlbmNpbmcpIHtcbiAgICAgICAgdGhpcy5hcHBlbmQoJ1xcblxcbicpO1xuICAgICAgICB0aGlzLm9wZW5Db2RlRmVuY2UoZWwpO1xuICAgICAgICBhZnRlciA9IFt0aGlzLnByZSgpLCB0aGlzLm91dHB1dExhdGVyKCdcXG5gYGAnKV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhZnRlciA9IFt0aGlzLnB1c2hMZWZ0KCcgICAgJyksIHRoaXMucHJlKCldO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnQ09ERSc6XG4gICAgY2FzZSAnU0FNUCc6XG4gICAgICBpZiAodGhpcy5pblByZSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHRoaXMub3V0cHV0KCdgJyk7XG4gICAgICBhZnRlciA9IFt0aGlzLmNvZGUoKSwgdGhpcy5vdXRwdXRMYXRlcignYCcpXTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0JMT0NLUVVPVEUnOlxuICAgIGNhc2UgJ0REJzpcbiAgICAgIHRoaXMuc3RhcnRpbmdCbG9ja3F1b3RlID0gdHJ1ZTtcbiAgICAgIGFmdGVyID0gdGhpcy5wdXNoTGVmdCgnPiAnKTtcbiAgICAgIHRoaXMuc3RhcnRpbmdCbG9ja3F1b3RlID0gZmFsc2U7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdLQkQnOlxuICAgICAgYWZ0ZXIgPSB0aGlzLmh0bWxUYWcoJ2tiZCcpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnQSc6XG4gICAgY2FzZSAnSU1HJzpcbiAgICAgIGhyZWYgPSBhdHRyKGVsLCBlbC50YWdOYW1lID09PSAnQScgPyAnaHJlZicgOiAnc3JjJywgdGhpcy5vcHRpb25zLmFic29sdXRlKTtcbiAgICAgIGlmICghaHJlZikge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHRpdGxlID0gYXR0cihlbCwgJ3RpdGxlJyk7XG4gICAgICBpZiAodGl0bGUpIHtcbiAgICAgICAgaHJlZiArPSAnIFwiJyArIHRpdGxlICsgJ1wiJztcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuaW5saW5lKSB7XG4gICAgICAgIHN1ZmZpeCA9ICcoJyArIGhyZWYgKyAnKSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdWZmaXggPSAnWycgKyAoKGJhc2UgPSB0aGlzLmxpbmtNYXApW2hyZWZdICE9IG51bGwgPyBiYXNlW2hyZWZdIDogYmFzZVtocmVmXSA9IHRoaXMubGlua3MucHVzaChocmVmKSkgKyAnXSc7XG4gICAgICB9XG4gICAgICBpZiAoZWwudGFnTmFtZSA9PT0gJ0lNRycpIHtcbiAgICAgICAgdGhpcy5vdXRwdXQoJyFbJyArIGF0dHIoZWwsICdhbHQnKSArICddJyArIHN1ZmZpeCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMub3V0cHV0KCdbJyk7XG4gICAgICB0aGlzLm5vVHJhaWxpbmdXaGl0ZXNwYWNlID0gdHJ1ZTtcbiAgICAgIGFmdGVyID0gdGhpcy5vdXRwdXRMYXRlcignXScgKyBzdWZmaXgpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnSUZSQU1FJzpcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmICgocmVmID0gZWwuY29udGVudERvY3VtZW50KSAhPSBudWxsID8gcmVmLmRvY3VtZW50RWxlbWVudCA6IHZvaWQgMCkge1xuICAgICAgICAgIHRoaXMucHJvY2VzcyhlbC5jb250ZW50RG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmcmFtZVNyYyA9IGF0dHIoZWwsICdzcmMnKTtcbiAgICAgICAgICBpZiAoZnJhbWVTcmMgJiYgdGhpcy5vcHRpb25zLmFsbG93RnJhbWUgJiYgdGhpcy5vcHRpb25zLmFsbG93RnJhbWUoZnJhbWVTcmMpKSB7XG4gICAgICAgICAgICB0aGlzLm91dHB1dCgnPGlmcmFtZSBzcmM9XCInICsgZnJhbWVTcmMgKyAnXCI+PC9pZnJhbWU+Jyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgfVxuXG4gIGFmdGVyID0gdGhpcy50YWJsZXMoZWwpIHx8IGFmdGVyO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBlbC5jaGlsZE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy5wcm9jZXNzKGVsLmNoaWxkTm9kZXNbaV0pO1xuICB9XG5cbiAgdGhpcy5hZHZhbmNlSHRtbEluZGV4KCc8XFxcXHM/XFxcXC9cXFxccz8nICsgZWwudGFnTmFtZSArICc+Jyk7XG5cbiAgaWYgKHR5cGVvZiBhZnRlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGFmdGVyID0gW2FmdGVyXTtcbiAgfVxuICB3aGlsZSAoYWZ0ZXIgJiYgYWZ0ZXIubGVuZ3RoKSB7XG4gICAgYWZ0ZXIuc2hpZnQoKS5jYWxsKHRoaXMpO1xuICB9XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS50YWJsZXMgPSBmdW5jdGlvbiB0YWJsZXMgKGVsKSB7XG4gIGlmICh0aGlzLm9wdGlvbnMudGFibGVzID09PSBmYWxzZSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBuYW1lID0gZWwudGFnTmFtZTtcbiAgaWYgKG5hbWUgPT09ICdUQUJMRScpIHtcbiAgICB2YXIgb2xkSW5UYWJsZTtcbiAgICBvbGRJblRhYmxlID0gdGhpcy5pblRhYmxlO1xuICAgIHRoaXMuaW5UYWJsZSA9IHRydWU7XG4gICAgdGhpcy5hcHBlbmQoJ1xcblxcbicpO1xuICAgIHRoaXMudGFibGVDb2xzID0gW107XG4gICAgcmV0dXJuIChmdW5jdGlvbihfdGhpcykge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uIGFmdGVyICgpIHtcbiAgICAgICAgcmV0dXJuIF90aGlzLmluVGFibGUgPSBvbGRJblRhYmxlO1xuICAgICAgfTtcbiAgICB9KSh0aGlzKTtcbiAgfVxuICBpZiAobmFtZSA9PT0gJ1RIRUFEJykge1xuICAgIHJldHVybiBmdW5jdGlvbiBhZnRlciAoKSB7XG4gICAgICByZXR1cm4gdGhpcy5hcHBlbmQoJ3wnICsgdGhpcy50YWJsZUNvbHMucmVkdWNlKHJlZHVjZXIsICcnKSArICdcXG4nKTtcbiAgICAgIGZ1bmN0aW9uIHJlZHVjZXIgKGFsbCwgdGhMZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGFsbCArICctJy5yZXBlYXQodGhMZW5ndGggKyAyKSArICd8JztcbiAgICAgIH1cbiAgICB9O1xuICB9XG4gIGlmIChuYW1lID09PSAnVEgnKSB7XG4gICAgcmV0dXJuIFtmdW5jdGlvbiBhZnRlciAoKSB7XG4gICAgICB0aGlzLnRhYmxlQ29scy5wdXNoKHRoaXMuY2hpbGRCdWZmZXIubGVuZ3RoKTtcbiAgICB9LCB0aGlzLnRkKHRydWUpXTtcbiAgfVxuICBpZiAobmFtZSA9PT0gJ1RSJykge1xuICAgIHRoaXMudGFibGVDb2wgPSAwO1xuICAgIHRoaXMub3V0cHV0KCd8Jyk7XG4gICAgdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IHRydWU7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGFmdGVyICgpIHtcbiAgICAgIHRoaXMuYXBwZW5kKCdcXG4nKTtcbiAgICB9O1xuICB9XG4gIGlmIChuYW1lID09PSAnVEQnKSB7XG4gICAgcmV0dXJuIHRoaXMudGQoKTtcbiAgfVxufTtcblxuRG9tYWRvci5wcm90b3R5cGUucHVzaExlZnQgPSBmdW5jdGlvbiBwdXNoTGVmdCAodGV4dCkge1xuICB2YXIgb2xkO1xuICBvbGQgPSB0aGlzLmxlZnQ7XG4gIHRoaXMubGVmdCArPSB0ZXh0O1xuICBpZiAodGhpcy5hdFApIHtcbiAgICB0aGlzLmFwcGVuZCh0ZXh0KTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnAoKTtcbiAgfVxuICByZXR1cm4gKGZ1bmN0aW9uKF90aGlzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgX3RoaXMubGVmdCA9IG9sZDtcbiAgICAgIF90aGlzLmF0TGVmdCA9IF90aGlzLmF0UCA9IGZhbHNlO1xuICAgICAgcmV0dXJuIF90aGlzLnAoKTtcbiAgICB9O1xuICB9KSh0aGlzKTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLnJlcGxhY2VMZWZ0ID0gZnVuY3Rpb24gcmVwbGFjZUxlZnQgKHRleHQpIHtcbiAgaWYgKCF0aGlzLmF0TGVmdCkge1xuICAgIHRoaXMuYXBwZW5kKHRoaXMubGVmdC5yZXBsYWNlKC9bIF17Miw0fSQvLCB0ZXh0KSk7XG4gICAgcmV0dXJuIHRoaXMuYXRMZWZ0ID0gdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IHRoaXMuYXRQID0gdHJ1ZTtcbiAgfSBlbHNlIGlmICh0aGlzLmxhc3QpIHtcbiAgICByZXR1cm4gdGhpcy5sYXN0ID0gdGhpcy5sYXN0LnJlcGxhY2UoL1sgXXsyLDR9JC8sIHRleHQpO1xuICB9XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5pc1Zpc2libGUgPSBmdW5jdGlvbiBpc1Zpc2libGUgKGVsKSB7XG4gIHZhciBkaXNwbGF5O1xuICB2YXIgaTtcbiAgdmFyIHByb3BlcnR5O1xuICB2YXIgdmlzaWJpbGl0eTtcbiAgdmFyIHZpc2libGUgPSB0cnVlO1xuICB2YXIgc3R5bGUgPSBhdHRyKGVsLCAnc3R5bGUnLCBmYWxzZSk7XG4gIHZhciBwcm9wZXJ0aWVzID0gc3R5bGUgIT0gbnVsbCA/IHR5cGVvZiBzdHlsZS5tYXRjaCA9PT0gJ2Z1bmN0aW9uJyA/IHN0eWxlLm1hdGNoKHJkaXNwbGF5KSA6IHZvaWQgMCA6IHZvaWQgMDtcbiAgaWYgKHByb3BlcnRpZXMgIT0gbnVsbCkge1xuICAgIGZvciAoaSA9IDA7IGkgPCBwcm9wZXJ0aWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBwcm9wZXJ0eSA9IHByb3BlcnRpZXNbaV07XG4gICAgICB2aXNpYmxlID0gIXJoaWRkZW4udGVzdChwcm9wZXJ0eSk7XG4gICAgfVxuICB9XG4gIGlmICh2aXNpYmxlICYmIHR5cGVvZiB0aGlzLndpbmRvd0NvbnRleHQuZ2V0Q29tcHV0ZWRTdHlsZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHRyeSB7XG4gICAgICBzdHlsZSA9IHRoaXMud2luZG93Q29udGV4dC5nZXRDb21wdXRlZFN0eWxlKGVsLCBudWxsKTtcbiAgICAgIGlmICh0eXBlb2YgKHN0eWxlICE9IG51bGwgPyBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlIDogdm9pZCAwKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBkaXNwbGF5ID0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnZGlzcGxheScpO1xuICAgICAgICB2aXNpYmlsaXR5ID0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgndmlzaWJpbGl0eScpO1xuICAgICAgICB2aXNpYmxlID0gZGlzcGxheSAhPT0gJ25vbmUnICYmIHZpc2liaWxpdHkgIT09ICdoaWRkZW4nO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgIH1cbiAgfVxuICByZXR1cm4gdmlzaWJsZTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLm9wZW5Db2RlRmVuY2UgPSBmdW5jdGlvbiBvcGVuQ29kZUZlbmNlIChlbCkge1xuICB2YXIgZmVuY2luZ2xhbmd1YWdlID0gdGhpcy5vcHRpb25zLmZlbmNpbmdsYW5ndWFnZShlbCk7XG4gIHZhciBjaGlsZCA9IGVsLmNoaWxkTm9kZXNbMF07XG4gIGlmICghZmVuY2luZ2xhbmd1YWdlICYmIGNoaWxkICYmIGNoaWxkLnRhZ05hbWUgPT09ICdDT0RFJykge1xuICAgIGZlbmNpbmdsYW5ndWFnZSA9IHRoaXMub3B0aW9ucy5mZW5jaW5nbGFuZ3VhZ2UoZWwuY2hpbGROb2Rlc1swXSk7XG4gIH1cbiAgdGhpcy5vdXRwdXQoJ2BgYCcgKyAoZmVuY2luZ2xhbmd1YWdlIHx8ICcnKSArICdcXG4nKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gcGFyc2U7XG4iLCIvKiEgaHR0cDovL210aHMuYmUvcmVwZWF0IHYwLjIuMCBieSBAbWF0aGlhcyAqL1xuaWYgKCFTdHJpbmcucHJvdG90eXBlLnJlcGVhdCkge1xuXHQoZnVuY3Rpb24oKSB7XG5cdFx0J3VzZSBzdHJpY3QnOyAvLyBuZWVkZWQgdG8gc3VwcG9ydCBgYXBwbHlgL2BjYWxsYCB3aXRoIGB1bmRlZmluZWRgL2BudWxsYFxuXHRcdHZhciBkZWZpbmVQcm9wZXJ0eSA9IChmdW5jdGlvbigpIHtcblx0XHRcdC8vIElFIDggb25seSBzdXBwb3J0cyBgT2JqZWN0LmRlZmluZVByb3BlcnR5YCBvbiBET00gZWxlbWVudHNcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHZhciBvYmplY3QgPSB7fTtcblx0XHRcdFx0dmFyICRkZWZpbmVQcm9wZXJ0eSA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eTtcblx0XHRcdFx0dmFyIHJlc3VsdCA9ICRkZWZpbmVQcm9wZXJ0eShvYmplY3QsIG9iamVjdCwgb2JqZWN0KSAmJiAkZGVmaW5lUHJvcGVydHk7XG5cdFx0XHR9IGNhdGNoKGVycm9yKSB7fVxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9KCkpO1xuXHRcdHZhciByZXBlYXQgPSBmdW5jdGlvbihjb3VudCkge1xuXHRcdFx0aWYgKHRoaXMgPT0gbnVsbCkge1xuXHRcdFx0XHR0aHJvdyBUeXBlRXJyb3IoKTtcblx0XHRcdH1cblx0XHRcdHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG5cdFx0XHQvLyBgVG9JbnRlZ2VyYFxuXHRcdFx0dmFyIG4gPSBjb3VudCA/IE51bWJlcihjb3VudCkgOiAwO1xuXHRcdFx0aWYgKG4gIT0gbikgeyAvLyBiZXR0ZXIgYGlzTmFOYFxuXHRcdFx0XHRuID0gMDtcblx0XHRcdH1cblx0XHRcdC8vIEFjY291bnQgZm9yIG91dC1vZi1ib3VuZHMgaW5kaWNlc1xuXHRcdFx0aWYgKG4gPCAwIHx8IG4gPT0gSW5maW5pdHkpIHtcblx0XHRcdFx0dGhyb3cgUmFuZ2VFcnJvcigpO1xuXHRcdFx0fVxuXHRcdFx0dmFyIHJlc3VsdCA9ICcnO1xuXHRcdFx0d2hpbGUgKG4pIHtcblx0XHRcdFx0aWYgKG4gJSAyID09IDEpIHtcblx0XHRcdFx0XHRyZXN1bHQgKz0gc3RyaW5nO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChuID4gMSkge1xuXHRcdFx0XHRcdHN0cmluZyArPSBzdHJpbmc7XG5cdFx0XHRcdH1cblx0XHRcdFx0biA+Pj0gMTtcblx0XHRcdH1cblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fTtcblx0XHRpZiAoZGVmaW5lUHJvcGVydHkpIHtcblx0XHRcdGRlZmluZVByb3BlcnR5KFN0cmluZy5wcm90b3R5cGUsICdyZXBlYXQnLCB7XG5cdFx0XHRcdCd2YWx1ZSc6IHJlcGVhdCxcblx0XHRcdFx0J2NvbmZpZ3VyYWJsZSc6IHRydWUsXG5cdFx0XHRcdCd3cml0YWJsZSc6IHRydWVcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRTdHJpbmcucHJvdG90eXBlLnJlcGVhdCA9IHJlcGVhdDtcblx0XHR9XG5cdH0oKSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmlmICghd2luZG93Lk5vZGUpIHtcbiAgd2luZG93Lk5vZGUgPSB7XG4gICAgRUxFTUVOVF9OT0RFOiAxLFxuICAgIFRFWFRfTk9ERTogM1xuICB9O1xufVxuXG5mdW5jdGlvbiB3aW5kb3dDb250ZXh0ICgpIHtcbiAgcmV0dXJuIHdpbmRvdztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB3aW5kb3dDb250ZXh0O1xuIl19

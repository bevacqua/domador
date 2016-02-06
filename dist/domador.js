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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkb21hZG9yLmpzIiwibm9kZV9tb2R1bGVzL3N0cmluZy5wcm90b3R5cGUucmVwZWF0L3JlcGVhdC5qcyIsIndpbmRvd0NvbnRleHQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxucmVxdWlyZSgnc3RyaW5nLnByb3RvdHlwZS5yZXBlYXQnKTtcblxudmFyIHJlcGxhY2VtZW50cyA9IHtcbiAgJ1xcXFxcXFxcJzogJ1xcXFxcXFxcJyxcbiAgJ1xcXFxbJzogJ1xcXFxbJyxcbiAgJ1xcXFxdJzogJ1xcXFxdJyxcbiAgJz4nOiAnXFxcXD4nLFxuICAnXyc6ICdcXFxcXycsXG4gICdcXFxcKic6ICdcXFxcKicsXG4gICdgJzogJ1xcXFxgJyxcbiAgJyMnOiAnXFxcXCMnLFxuICAnKFswLTldKVxcXFwuKFxcXFxzfCQpJzogJyQxXFxcXC4kMicsXG4gICdcXHUwMGE5JzogJyhjKScsXG4gICdcXHUwMGFlJzogJyhyKScsXG4gICdcXHUyMTIyJzogJyh0bSknLFxuICAnXFx1MDBhMCc6ICcgJyxcbiAgJ1xcdTAwYjcnOiAnXFxcXConLFxuICAnXFx1MjAwMic6ICcgJyxcbiAgJ1xcdTIwMDMnOiAnICcsXG4gICdcXHUyMDA5JzogJyAnLFxuICAnXFx1MjAxOCc6ICdcXCcnLFxuICAnXFx1MjAxOSc6ICdcXCcnLFxuICAnXFx1MjAxYyc6ICdcIicsXG4gICdcXHUyMDFkJzogJ1wiJyxcbiAgJ1xcdTIwMjYnOiAnLi4uJyxcbiAgJ1xcdTIwMTMnOiAnLS0nLFxuICAnXFx1MjAxNCc6ICctLS0nXG59O1xudmFyIHJlcGxhY2VycyA9IE9iamVjdC5rZXlzKHJlcGxhY2VtZW50cykucmVkdWNlKHJlcGxhY2VyLCB7fSk7XG52YXIgcnNwYWNlcyA9IC9eXFxzK3xcXHMrJC9nO1xudmFyIHJkaXNwbGF5ID0gLyhkaXNwbGF5fHZpc2liaWxpdHkpXFxzKjpcXHMqW2Etel0rL2dpO1xudmFyIHJoaWRkZW4gPSAvKG5vbmV8aGlkZGVuKVxccyokL2k7XG52YXIgcmhlYWRpbmcgPSAvXkgoWzEtNl0pJC87XG52YXIgc2hhbGxvd1RhZ3MgPSBbXG4gICdBUFBMRVQnLCAnQVJFQScsICdBVURJTycsICdCVVRUT04nLCAnQ0FOVkFTJywgJ0RBVEFMSVNUJywgJ0VNQkVEJywgJ0hFQUQnLCAnSU5QVVQnLCAnTUFQJyxcbiAgJ01FTlUnLCAnTUVURVInLCAnTk9GUkFNRVMnLCAnTk9TQ1JJUFQnLCAnT0JKRUNUJywgJ09QVEdST1VQJywgJ09QVElPTicsICdQQVJBTScsICdQUk9HUkVTUycsXG4gICdSUCcsICdSVCcsICdSVUJZJywgJ1NDUklQVCcsICdTRUxFQ1QnLCAnU1RZTEUnLCAnVEVYVEFSRUEnLCAnVElUTEUnLCAnVklERU8nXG5dO1xudmFyIHBhcmFncmFwaFRhZ3MgPSBbXG4gICdBRERSRVNTJywgJ0FSVElDTEUnLCAnQVNJREUnLCAnRElWJywgJ0ZJRUxEU0VUJywgJ0ZPT1RFUicsICdIRUFERVInLCAnTkFWJywgJ1AnLCAnU0VDVElPTidcbl07XG52YXIgd2luZG93Q29udGV4dCA9IHJlcXVpcmUoJy4vdmlydHVhbFdpbmRvd0NvbnRleHQnKTtcblxuZnVuY3Rpb24gcmVwbGFjZXIgKHJlc3VsdCwga2V5KSB7XG4gIHJlc3VsdFtrZXldID0gbmV3IFJlZ0V4cChrZXksICdnJyk7IHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIG1hbnkgKHRleHQsIHRpbWVzKSB7XG4gIHJldHVybiBuZXcgQXJyYXkodGltZXMgKyAxKS5qb2luKHRleHQpO1xufVxuXG5mdW5jdGlvbiBwYWRMZWZ0ICh0ZXh0LCB0aW1lcykge1xuICByZXR1cm4gbWFueSgnICcsIHRpbWVzKSArIHRleHQ7XG59XG5cbmZ1bmN0aW9uIHRyaW0gKHRleHQpIHtcbiAgaWYgKHRleHQudHJpbSkge1xuICAgIHJldHVybiB0ZXh0LnRyaW0oKTtcbiAgfVxuICByZXR1cm4gdGV4dC5yZXBsYWNlKHJzcGFjZXMsICcnKTtcbn1cblxuZnVuY3Rpb24gYXR0ciAoZWwsIHByb3AsIGRpcmVjdCkge1xuICB2YXIgcHJvcGVyID0gZGlyZWN0ID09PSB2b2lkIDAgfHwgZGlyZWN0O1xuICBpZiAocHJvcGVyIHx8IHR5cGVvZiBlbC5nZXRBdHRyaWJ1dGUgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gZWxbcHJvcF0gfHwgJyc7XG4gIH1cbiAgcmV0dXJuIGVsLmdldEF0dHJpYnV0ZShwcm9wKSB8fCAnJztcbn1cblxuZnVuY3Rpb24gaGFzIChlbCwgcHJvcCwgZGlyZWN0KSB7XG4gIHZhciBwcm9wZXIgPSBkaXJlY3QgPT09IHZvaWQgMCB8fCBkaXJlY3Q7XG4gIGlmIChwcm9wZXIgfHwgdHlwZW9mIGVsLmhhc0F0dHJpYnV0ZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBlbC5oYXNPd25Qcm9wZXJ0eShwcm9wKTtcbiAgfVxuICByZXR1cm4gZWwuaGFzQXR0cmlidXRlKHByb3ApO1xufVxuXG5mdW5jdGlvbiBwcm9jZXNzUGxhaW5UZXh0ICh0ZXh0LCB0YWdOYW1lKSB7XG4gIHZhciBrZXk7XG4gIHZhciBibG9jayA9IHBhcmFncmFwaFRhZ3MuaW5kZXhPZih0YWdOYW1lKSAhPT0gLTEgfHwgdGFnTmFtZSA9PT0gJ0JMT0NLUVVPVEUnO1xuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9cXG4oWyBcXHRdKlxcbikrL2csICdcXG4nKTtcbiAgdGV4dCA9IHRleHQucmVwbGFjZSgvXFxuWyBcXHRdKy9nLCAnXFxuJyk7XG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1sgXFx0XSsvZywgJyAnKTtcbiAgZm9yIChrZXkgaW4gcmVwbGFjZW1lbnRzKSB7XG4gICAgdGV4dCA9IHRleHQucmVwbGFjZShyZXBsYWNlcnNba2V5XSwgcmVwbGFjZW1lbnRzW2tleV0pO1xuICB9XG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoLyhcXHMqKVxcXFwjL2csIGJsb2NrID8gcmVtb3ZlVW5uZWNlc3NhcnlFc2NhcGVzIDogJyQxIycpO1xuICByZXR1cm4gdGV4dDtcblxuICBmdW5jdGlvbiByZW1vdmVVbm5lY2Vzc2FyeUVzY2FwZXMgKGVzY2FwZWQsIHNwYWNlcywgaSkge1xuICAgIHJldHVybiBpID8gc3BhY2VzICsgJyMnIDogZXNjYXBlZDtcbiAgfVxufVxuXG5mdW5jdGlvbiBwcm9jZXNzQ29kZSAodGV4dCkge1xuICByZXR1cm4gdGV4dC5yZXBsYWNlKC9gL2csICdcXFxcYCcpO1xufVxuXG5mdW5jdGlvbiBvdXRwdXRNYXBwZXIgKGZuLCB0YWdOYW1lKSB7XG4gIHJldHVybiBmdW5jdGlvbiBiaXRQcm9jZXNzb3IgKGJpdCkge1xuICAgIGlmIChiaXQubWFya2VyKSB7XG4gICAgICByZXR1cm4gYml0Lm1hcmtlcjtcbiAgICB9XG4gICAgaWYgKCFmbikge1xuICAgICAgcmV0dXJuIGJpdC50ZXh0O1xuICAgIH1cbiAgICByZXR1cm4gZm4oYml0LnRleHQsIHRhZ05hbWUpO1xuICB9O1xufVxuXG5mdW5jdGlvbiBub29wICgpIHt9XG5cbmZ1bmN0aW9uIHBhcnNlIChodG1sLCBvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgRG9tYWRvcihodG1sLCBvcHRpb25zKS5wYXJzZSgpO1xufVxuXG5mdW5jdGlvbiBEb21hZG9yIChodG1sLCBvcHRpb25zKSB7XG4gIHRoaXMuaHRtbCA9IGh0bWwgfHwgJyc7XG4gIHRoaXMuaHRtbEluZGV4ID0gMDtcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgdGhpcy5tYXJrZXJzID0gdGhpcy5vcHRpb25zLm1hcmtlcnMgPyB0aGlzLm9wdGlvbnMubWFya2Vycy5zb3J0KGFzYykgOiBbXTtcbiAgdGhpcy53aW5kb3dDb250ZXh0ID0gd2luZG93Q29udGV4dCh0aGlzLm9wdGlvbnMpO1xuICB0aGlzLmF0TGVmdCA9IHRoaXMubm9UcmFpbGluZ1doaXRlc3BhY2UgPSB0aGlzLmF0UCA9IHRydWU7XG4gIHRoaXMuYnVmZmVyID0gdGhpcy5jaGlsZEJ1ZmZlciA9ICcnO1xuICB0aGlzLmV4Y2VwdGlvbnMgPSBbXTtcbiAgdGhpcy5vcmRlciA9IDE7XG4gIHRoaXMubGlzdERlcHRoID0gMDtcbiAgdGhpcy5pbkNvZGUgPSB0aGlzLmluUHJlID0gdGhpcy5pbk9yZGVyZWRMaXN0ID0gZmFsc2U7XG4gIHRoaXMubGFzdCA9IG51bGw7XG4gIHRoaXMubGVmdCA9ICdcXG4nO1xuICB0aGlzLmxpbmtzID0gW107XG4gIHRoaXMubGlua01hcCA9IHt9O1xuICB0aGlzLnVuaGFuZGxlZCA9IHt9O1xuICBpZiAodGhpcy5vcHRpb25zLmFic29sdXRlID09PSB2b2lkIDApIHsgdGhpcy5vcHRpb25zLmFic29sdXRlID0gZmFsc2U7IH1cbiAgaWYgKHRoaXMub3B0aW9ucy5mZW5jaW5nID09PSB2b2lkIDApIHsgdGhpcy5vcHRpb25zLmZlbmNpbmcgPSBmYWxzZTsgfVxuICBpZiAodGhpcy5vcHRpb25zLmZlbmNpbmdsYW5ndWFnZSA9PT0gdm9pZCAwKSB7IHRoaXMub3B0aW9ucy5mZW5jaW5nbGFuZ3VhZ2UgPSBub29wOyB9XG4gIGlmICh0aGlzLm9wdGlvbnMudHJhbnNmb3JtID09PSB2b2lkIDApIHsgdGhpcy5vcHRpb25zLnRyYW5zZm9ybSA9IG5vb3A7IH1cbiAgZnVuY3Rpb24gYXNjIChhLCBiKSB7IHJldHVybiBhWzBdIC0gYlswXTsgfVxufVxuXG5Eb21hZG9yLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbiBhcHBlbmQgKHRleHQpIHtcbiAgaWYgKHRoaXMubGFzdCAhPSBudWxsKSB7XG4gICAgdGhpcy5idWZmZXIgKz0gdGhpcy5sYXN0O1xuICB9XG4gIHRoaXMuY2hpbGRCdWZmZXIgKz0gdGV4dDtcbiAgcmV0dXJuIHRoaXMubGFzdCA9IHRleHQ7XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5iciA9IGZ1bmN0aW9uIGJyICgpIHtcbiAgdGhpcy5hcHBlbmQoJyAgJyArICB0aGlzLmxlZnQpO1xuICByZXR1cm4gdGhpcy5hdExlZnQgPSB0aGlzLm5vVHJhaWxpbmdXaGl0ZXNwYWNlID0gdHJ1ZTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLmNvZGUgPSBmdW5jdGlvbiBjb2RlICgpIHtcbiAgdmFyIG9sZDtcbiAgb2xkID0gdGhpcy5pbkNvZGU7XG4gIHRoaXMuaW5Db2RlID0gdHJ1ZTtcbiAgcmV0dXJuIChmdW5jdGlvbihfdGhpcykge1xuICAgIHJldHVybiBmdW5jdGlvbiBhZnRlciAoKSB7XG4gICAgICByZXR1cm4gX3RoaXMuaW5Db2RlID0gb2xkO1xuICAgIH07XG4gIH0pKHRoaXMpO1xufTtcblxuRG9tYWRvci5wcm90b3R5cGUubGkgPSBmdW5jdGlvbiBsaSAoKSB7XG4gIHZhciByZXN1bHQ7XG4gIHJlc3VsdCA9IHRoaXMuaW5PcmRlcmVkTGlzdCA/ICh0aGlzLm9yZGVyKyspICsgJy4gJyA6ICcqICc7XG4gIHJlc3VsdCA9IHBhZExlZnQocmVzdWx0LCAodGhpcy5saXN0RGVwdGggLSAxKSAqIDIpO1xuICByZXR1cm4gdGhpcy5hcHBlbmQocmVzdWx0KTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLnRkID0gZnVuY3Rpb24gdGQgKGhlYWRlcikge1xuICB0aGlzLm5vVHJhaWxpbmdXaGl0ZXNwYWNlID0gZmFsc2U7XG4gIHRoaXMub3V0cHV0KCcgJyk7XG4gIHRoaXMuY2hpbGRCdWZmZXIgPSAnJztcbiAgdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IGZhbHNlO1xuICByZXR1cm4gZnVuY3Rpb24gYWZ0ZXIgKCkge1xuICAgIHZhciBzcGFjZXMgPSBoZWFkZXIgPyAwIDogTWF0aC5tYXgoMCwgdGhpcy50YWJsZUNvbHNbdGhpcy50YWJsZUNvbCsrXSAtIHRoaXMuY2hpbGRCdWZmZXIubGVuZ3RoKTtcbiAgICB0aGlzLmFwcGVuZCgnICcucmVwZWF0KHNwYWNlcyArIDEpICsgJ3wnKTtcbiAgICB0aGlzLm5vVHJhaWxpbmdXaGl0ZXNwYWNlID0gdHJ1ZTtcbiAgfTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLm9sID0gZnVuY3Rpb24gb2wgKCkge1xuICB2YXIgaW5PcmRlcmVkTGlzdCwgb3JkZXI7XG4gIGlmICh0aGlzLmxpc3REZXB0aCA9PT0gMCkge1xuICAgIHRoaXMucCgpO1xuICB9XG4gIGluT3JkZXJlZExpc3QgPSB0aGlzLmluT3JkZXJlZExpc3Q7XG4gIG9yZGVyID0gdGhpcy5vcmRlcjtcbiAgdGhpcy5pbk9yZGVyZWRMaXN0ID0gdHJ1ZTtcbiAgdGhpcy5vcmRlciA9IDE7XG4gIHRoaXMubGlzdERlcHRoKys7XG4gIHJldHVybiAoZnVuY3Rpb24oX3RoaXMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gYWZ0ZXIgKCkge1xuICAgICAgX3RoaXMuaW5PcmRlcmVkTGlzdCA9IGluT3JkZXJlZExpc3Q7XG4gICAgICBfdGhpcy5vcmRlciA9IG9yZGVyO1xuICAgICAgcmV0dXJuIF90aGlzLmxpc3REZXB0aC0tO1xuICAgIH07XG4gIH0pKHRoaXMpO1xufTtcblxuRG9tYWRvci5wcm90b3R5cGUudWwgPSBmdW5jdGlvbiB1bCAoKSB7XG4gIHZhciBpbk9yZGVyZWRMaXN0LCBvcmRlcjtcbiAgaWYgKHRoaXMubGlzdERlcHRoID09PSAwKSB7XG4gICAgdGhpcy5wKCk7XG4gIH1cbiAgaW5PcmRlcmVkTGlzdCA9IHRoaXMuaW5PcmRlcmVkTGlzdDtcbiAgb3JkZXIgPSB0aGlzLm9yZGVyO1xuICB0aGlzLmluT3JkZXJlZExpc3QgPSBmYWxzZTtcbiAgdGhpcy5vcmRlciA9IDE7XG4gIHRoaXMubGlzdERlcHRoKys7XG4gIHJldHVybiAoZnVuY3Rpb24oX3RoaXMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gYWZ0ZXIgKCkge1xuICAgICAgX3RoaXMuaW5PcmRlcmVkTGlzdCA9IGluT3JkZXJlZExpc3Q7XG4gICAgICBfdGhpcy5vcmRlciA9IG9yZGVyO1xuICAgICAgcmV0dXJuIF90aGlzLmxpc3REZXB0aC0tO1xuICAgIH07XG4gIH0pKHRoaXMpO1xufTtcblxuRG9tYWRvci5wcm90b3R5cGUub3V0cHV0ID0gZnVuY3Rpb24gb3V0cHV0ICh0ZXh0KSB7XG4gIGlmICghdGV4dCkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoIXRoaXMuaW5QcmUpIHtcbiAgICB0ZXh0ID0gdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA/IHRleHQucmVwbGFjZSgvXlsgXFx0XFxuXSsvLCAnJykgOiAvXlsgXFx0XSpcXG4vLnRlc3QodGV4dCkgPyB0ZXh0LnJlcGxhY2UoL15bIFxcdFxcbl0rLywgJ1xcbicpIDogdGV4dC5yZXBsYWNlKC9eWyBcXHRdKy8sICcgJyk7XG4gIH1cbiAgaWYgKHRleHQgPT09ICcnKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRoaXMuYXRQID0gL1xcblxcbiQvLnRlc3QodGV4dCk7XG4gIHRoaXMuYXRMZWZ0ID0gL1xcbiQvLnRlc3QodGV4dCk7XG4gIHRoaXMubm9UcmFpbGluZ1doaXRlc3BhY2UgPSAvWyBcXHRcXG5dJC8udGVzdCh0ZXh0KTtcbiAgcmV0dXJuIHRoaXMuYXBwZW5kKHRleHQucmVwbGFjZSgvXFxuL2csIHRoaXMubGVmdCkpO1xufTtcblxuRG9tYWRvci5wcm90b3R5cGUub3V0cHV0TGF0ZXIgPSBmdW5jdGlvbiBvdXRwdXRMYXRlciAodGV4dCkge1xuICByZXR1cm4gKGZ1bmN0aW9uKHNlbGYpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gYWZ0ZXIgKCkge1xuICAgICAgcmV0dXJuIHNlbGYub3V0cHV0KHRleHQpO1xuICAgIH07XG4gIH0pKHRoaXMpO1xufTtcblxuRG9tYWRvci5wcm90b3R5cGUucCA9IGZ1bmN0aW9uIHAgKCkge1xuICBpZiAodGhpcy5hdFApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKHRoaXMuc3RhcnRpbmdCbG9ja3F1b3RlKSB7XG4gICAgdGhpcy5hcHBlbmQoJ1xcbicpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuYXBwZW5kKHRoaXMubGVmdCk7XG4gIH1cbiAgaWYgKCF0aGlzLmF0TGVmdCkge1xuICAgIHRoaXMuYXBwZW5kKHRoaXMubGVmdCk7XG4gICAgdGhpcy5hdExlZnQgPSB0cnVlO1xuICB9XG4gIHJldHVybiB0aGlzLm5vVHJhaWxpbmdXaGl0ZXNwYWNlID0gdGhpcy5hdFAgPSB0cnVlO1xufTtcblxuRG9tYWRvci5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbiBwYXJzZSAoKSB7XG4gIHZhciBjb250YWluZXI7XG4gIHZhciBpO1xuICB2YXIgbGluaztcbiAgdmFyIHJlZjtcbiAgdGhpcy5idWZmZXIgPSAnJztcbiAgaWYgKCF0aGlzLmh0bWwpIHtcbiAgICByZXR1cm4gdGhpcy5idWZmZXI7XG4gIH1cbiAgaWYgKHR5cGVvZiB0aGlzLmh0bWwgPT09ICdzdHJpbmcnKSB7XG4gICAgY29udGFpbmVyID0gdGhpcy53aW5kb3dDb250ZXh0LmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGNvbnRhaW5lci5pbm5lckhUTUwgPSB0aGlzLmh0bWxMZWZ0ID0gdGhpcy5odG1sO1xuICB9IGVsc2Uge1xuICAgIGNvbnRhaW5lciA9IHRoaXMuaHRtbDtcbiAgICB0aGlzLmh0bWwgPSB0aGlzLmh0bWxMZWZ0ID0gY29udGFpbmVyLmlubmVySFRNTDtcbiAgfVxuICB0aGlzLnByb2Nlc3MoY29udGFpbmVyKTtcbiAgaWYgKHRoaXMubGlua3MubGVuZ3RoKSB7XG4gICAgd2hpbGUgKHRoaXMubGFzdEVsZW1lbnQucGFyZW50RWxlbWVudCAhPT0gY29udGFpbmVyICYmIHRoaXMubGFzdEVsZW1lbnQudGFnTmFtZSAhPT0gJ0JMT0NLUVVPVEUnKSB7XG4gICAgICB0aGlzLmxhc3RFbGVtZW50ID0gdGhpcy5sYXN0RWxlbWVudC5wYXJlbnRFbGVtZW50O1xuICAgIH1cbiAgICBpZiAodGhpcy5sYXN0RWxlbWVudC50YWdOYW1lICE9PSAnQkxPQ0tRVU9URScpIHtcbiAgICAgIHRoaXMuYXBwZW5kKCdcXG5cXG4nKTtcbiAgICB9XG4gICAgcmVmID0gdGhpcy5saW5rcztcbiAgICBmb3IgKGkgPSAwOyBpIDwgcmVmLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsaW5rID0gcmVmW2ldO1xuICAgICAgaWYgKGxpbmspIHtcbiAgICAgICAgdGhpcy5hcHBlbmQoJ1snICsgKGkgKyAxKSArICddOiAnICsgbGluayArICdcXG4nKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgdGhpcy5hcHBlbmQoJycpO1xuICByZXR1cm4gdGhpcy5idWZmZXIgPSB0cmltKHRoaXMuYnVmZmVyKTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLnByZSA9IGZ1bmN0aW9uIHByZSAoKSB7XG4gIHZhciBvbGQ7XG4gIG9sZCA9IHRoaXMuaW5QcmU7XG4gIHRoaXMuaW5QcmUgPSB0cnVlO1xuICByZXR1cm4gKGZ1bmN0aW9uKF90aGlzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGFmdGVyICgpIHtcbiAgICAgIHJldHVybiBfdGhpcy5pblByZSA9IG9sZDtcbiAgICB9O1xuICB9KSh0aGlzKTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLmh0bWxUYWcgPSBmdW5jdGlvbiBodG1sVGFnICh0eXBlKSB7XG4gIHRoaXMub3V0cHV0KCc8JyArIHR5cGUgKyAnPicpO1xuICByZXR1cm4gdGhpcy5vdXRwdXRMYXRlcignPC8nICsgdHlwZSArICc+Jyk7XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5hZHZhbmNlSHRtbEluZGV4ID0gZnVuY3Rpb24gYWR2YW5jZUh0bWxJbmRleCAodG9rZW4pIHtcbiAgaWYgKHRoaXMubWFya2Vycy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgcmUgPSBuZXcgUmVnRXhwKHRva2VuLCAnaWcnKTtcbiAgdmFyIG1hdGNoID0gcmUuZXhlYyh0aGlzLmh0bWxMZWZ0KTtcbiAgaWYgKCFtYXRjaCkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgZGlmZiA9IHJlLmxhc3RJbmRleDtcbiAgdGhpcy5odG1sSW5kZXggKz0gZGlmZjtcbiAgdGhpcy5odG1sTGVmdCA9IHRoaXMuaHRtbExlZnQuc2xpY2UoZGlmZik7XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5pbnNlcnRNYXJrZXJzID0gZnVuY3Rpb24gaW5zZXJ0TWFya2VycyAoKSB7XG4gIHdoaWxlICh0aGlzLm1hcmtlcnMubGVuZ3RoICYmIHRoaXMubWFya2Vyc1swXVswXSA8PSB0aGlzLmh0bWxJbmRleCkge1xuICAgIHRoaXMuYXBwZW5kKHRoaXMubWFya2Vycy5zaGlmdCgpWzFdKTtcbiAgfVxufTtcblxuRG9tYWRvci5wcm90b3R5cGUuaW50ZXJsZWF2ZU1hcmtlcnMgPSBmdW5jdGlvbiBpbnRlcmxlYXZlTWFya2VycyAodGV4dCkge1xuICB2YXIgbWFya2VyO1xuICB2YXIgbWFya2VyU3RhcnQ7XG4gIHZhciBsYXN0TWFya2VyU3RhcnQgPSAwO1xuICB2YXIgYml0cyA9IFtdO1xuICB3aGlsZSAodGhpcy5tYXJrZXJzLmxlbmd0aCAmJiB0aGlzLm1hcmtlcnNbMF1bMF0gPD0gdGhpcy5odG1sSW5kZXggKyB0ZXh0Lmxlbmd0aCkge1xuICAgIG1hcmtlciA9IHRoaXMubWFya2Vycy5zaGlmdCgpO1xuICAgIG1hcmtlclN0YXJ0ID0gTWF0aC5tYXgoMCwgbWFya2VyWzBdIC0gdGhpcy5odG1sSW5kZXgpO1xuICAgIGJpdHMucHVzaChcbiAgICAgIHsgdGV4dDogdGV4dC5zbGljZShsYXN0TWFya2VyU3RhcnQsIG1hcmtlclN0YXJ0KSB9LFxuICAgICAgeyBtYXJrZXI6IG1hcmtlclsxXSB9XG4gICAgKTtcbiAgICBsYXN0TWFya2VyU3RhcnQgPSBtYXJrZXJTdGFydDtcbiAgfVxuICBiaXRzLnB1c2goeyB0ZXh0OiB0ZXh0LnNsaWNlKGxhc3RNYXJrZXJTdGFydCkgfSk7XG4gIHJldHVybiBiaXRzO1xufTtcblxuRG9tYWRvci5wcm90b3R5cGUucHJvY2VzcyA9IGZ1bmN0aW9uIHByb2Nlc3MgKGVsKSB7XG4gIHZhciBhZnRlcjtcbiAgdmFyIGJhc2U7XG4gIHZhciBocmVmO1xuICB2YXIgaTtcbiAgdmFyIHJlZjtcbiAgdmFyIHN1ZmZpeDtcbiAgdmFyIHN1bW1hcnk7XG4gIHZhciB0aXRsZTtcbiAgdmFyIGZyYW1lU3JjO1xuICB2YXIgaW50ZXJsZWF2ZWQ7XG5cbiAgaWYgKCF0aGlzLmlzVmlzaWJsZShlbCkpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoZWwubm9kZVR5cGUgPT09IHRoaXMud2luZG93Q29udGV4dC5Ob2RlLlRFWFRfTk9ERSkge1xuICAgIGlmIChlbC5ub2RlVmFsdWUucmVwbGFjZSgvXFxuL2csICcnKS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaW50ZXJsZWF2ZWQgPSB0aGlzLmludGVybGVhdmVNYXJrZXJzKGVsLm5vZGVWYWx1ZSk7XG4gICAgaWYgKHRoaXMuaW5QcmUpIHtcbiAgICAgIHJldHVybiB0aGlzLm91dHB1dChpbnRlcmxlYXZlZC5tYXAob3V0cHV0TWFwcGVyKCkpLmpvaW4oJycpKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuaW5Db2RlKSB7XG4gICAgICByZXR1cm4gdGhpcy5vdXRwdXQoaW50ZXJsZWF2ZWQubWFwKG91dHB1dE1hcHBlcihwcm9jZXNzQ29kZSkpLmpvaW4oJycpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMub3V0cHV0KGludGVybGVhdmVkLm1hcChvdXRwdXRNYXBwZXIocHJvY2Vzc1BsYWluVGV4dCwgZWwucGFyZW50RWxlbWVudCAmJiBlbC5wYXJlbnRFbGVtZW50LnRhZ05hbWUpKS5qb2luKCcnKSk7XG4gIH1cblxuICBpZiAoZWwubm9kZVR5cGUgIT09IHRoaXMud2luZG93Q29udGV4dC5Ob2RlLkVMRU1FTlRfTk9ERSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICh0aGlzLmxhc3RFbGVtZW50KSB7IC8vIGkuZSBub3QgdGhlIGF1dG8taW5zZXJ0ZWQgPGRpdj4gd3JhcHBlclxuICAgIHRoaXMuaW5zZXJ0TWFya2VycygpO1xuICAgIHRoaXMuYWR2YW5jZUh0bWxJbmRleCgnPCcgKyBlbC50YWdOYW1lKTtcbiAgICB0aGlzLmFkdmFuY2VIdG1sSW5kZXgoJz4nKTtcblxuICAgIHZhciB0cmFuc2Zvcm1lZCA9IHRoaXMub3B0aW9ucy50cmFuc2Zvcm0oZWwpO1xuICAgIGlmICh0cmFuc2Zvcm1lZCAhPT0gdm9pZCAwKSB7XG4gICAgICByZXR1cm4gdGhpcy5vdXRwdXQodHJhbnNmb3JtZWQpO1xuICAgIH1cbiAgfVxuICB0aGlzLmxhc3RFbGVtZW50ID0gZWw7XG5cbiAgaWYgKHNoYWxsb3dUYWdzLmluZGV4T2YoZWwudGFnTmFtZSkgIT09IC0xKSB7XG4gICAgdGhpcy5hZHZhbmNlSHRtbEluZGV4KCdcXFxcL1xcXFxzPz4nKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBzd2l0Y2ggKGVsLnRhZ05hbWUpIHtcbiAgICBjYXNlICdIMSc6XG4gICAgY2FzZSAnSDInOlxuICAgIGNhc2UgJ0gzJzpcbiAgICBjYXNlICdINCc6XG4gICAgY2FzZSAnSDUnOlxuICAgIGNhc2UgJ0g2JzpcbiAgICAgIHRoaXMucCgpO1xuICAgICAgdGhpcy5vdXRwdXQobWFueSgnIycsIHBhcnNlSW50KGVsLnRhZ05hbWUubWF0Y2gocmhlYWRpbmcpWzFdKSkgKyAnICcpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnQUREUkVTUyc6XG4gICAgY2FzZSAnQVJUSUNMRSc6XG4gICAgY2FzZSAnQVNJREUnOlxuICAgIGNhc2UgJ0RJVic6XG4gICAgY2FzZSAnRklFTERTRVQnOlxuICAgIGNhc2UgJ0ZPT1RFUic6XG4gICAgY2FzZSAnSEVBREVSJzpcbiAgICBjYXNlICdOQVYnOlxuICAgIGNhc2UgJ1AnOlxuICAgIGNhc2UgJ1NFQ1RJT04nOlxuICAgICAgdGhpcy5wKCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdCT0RZJzpcbiAgICBjYXNlICdGT1JNJzpcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0RFVEFJTFMnOlxuICAgICAgdGhpcy5wKCk7XG4gICAgICBpZiAoIWhhcyhlbCwgJ29wZW4nLCBmYWxzZSkpIHtcbiAgICAgICAgc3VtbWFyeSA9IGVsLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzdW1tYXJ5JylbMF07XG4gICAgICAgIGlmIChzdW1tYXJ5KSB7XG4gICAgICAgICAgdGhpcy5wcm9jZXNzKHN1bW1hcnkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0JSJzpcbiAgICAgIHRoaXMuYnIoKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0hSJzpcbiAgICAgIHRoaXMucCgpO1xuICAgICAgdGhpcy5vdXRwdXQoJy0tLS0tLS0tLScpO1xuICAgICAgdGhpcy5wKCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdDSVRFJzpcbiAgICBjYXNlICdERk4nOlxuICAgIGNhc2UgJ0VNJzpcbiAgICBjYXNlICdJJzpcbiAgICBjYXNlICdVJzpcbiAgICBjYXNlICdWQVInOlxuICAgICAgdGhpcy5vdXRwdXQoJ18nKTtcbiAgICAgIHRoaXMubm9UcmFpbGluZ1doaXRlc3BhY2UgPSB0cnVlO1xuICAgICAgYWZ0ZXIgPSB0aGlzLm91dHB1dExhdGVyKCdfJyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdNQVJLJzpcbiAgICAgIHRoaXMub3V0cHV0KCc8bWFyaz4nKTtcbiAgICAgIGFmdGVyID0gdGhpcy5vdXRwdXRMYXRlcignPC9tYXJrPicpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnRFQnOlxuICAgIGNhc2UgJ0InOlxuICAgIGNhc2UgJ1NUUk9ORyc6XG4gICAgICBpZiAoZWwudGFnTmFtZSA9PT0gJ0RUJykge1xuICAgICAgICB0aGlzLnAoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMub3V0cHV0KCcqKicpO1xuICAgICAgdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IHRydWU7XG4gICAgICBhZnRlciA9IHRoaXMub3V0cHV0TGF0ZXIoJyoqJyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdRJzpcbiAgICAgIHRoaXMub3V0cHV0KCdcIicpO1xuICAgICAgdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IHRydWU7XG4gICAgICBhZnRlciA9IHRoaXMub3V0cHV0TGF0ZXIoJ1wiJyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdPTCc6XG4gICAgICBhZnRlciA9IHRoaXMub2woKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ1VMJzpcbiAgICAgIGFmdGVyID0gdGhpcy51bCgpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnTEknOlxuICAgICAgdGhpcy5yZXBsYWNlTGVmdCgnXFxuJyk7XG4gICAgICB0aGlzLmxpKCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdQUkUnOlxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5mZW5jaW5nKSB7XG4gICAgICAgIHRoaXMuYXBwZW5kKCdcXG5cXG4nKTtcbiAgICAgICAgdGhpcy5vdXRwdXQoWydgYGAnLCAnXFxuJ10uam9pbih0aGlzLm9wdGlvbnMuZmVuY2luZ2xhbmd1YWdlKGVsKSB8fCAnJykpO1xuICAgICAgICBhZnRlciA9IFt0aGlzLnByZSgpLCB0aGlzLm91dHB1dExhdGVyKCdcXG5gYGAnKV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhZnRlciA9IFt0aGlzLnB1c2hMZWZ0KCcgICAgJyksIHRoaXMucHJlKCldO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnQ09ERSc6XG4gICAgY2FzZSAnU0FNUCc6XG4gICAgICBpZiAodGhpcy5pblByZSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHRoaXMub3V0cHV0KCdgJyk7XG4gICAgICBhZnRlciA9IFt0aGlzLmNvZGUoKSwgdGhpcy5vdXRwdXRMYXRlcignYCcpXTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ0JMT0NLUVVPVEUnOlxuICAgIGNhc2UgJ0REJzpcbiAgICAgIHRoaXMuc3RhcnRpbmdCbG9ja3F1b3RlID0gdHJ1ZTtcbiAgICAgIGFmdGVyID0gdGhpcy5wdXNoTGVmdCgnPiAnKTtcbiAgICAgIHRoaXMuc3RhcnRpbmdCbG9ja3F1b3RlID0gZmFsc2U7XG4gICAgICBicmVhaztcbiAgICBjYXNlICdLQkQnOlxuICAgICAgYWZ0ZXIgPSB0aGlzLmh0bWxUYWcoJ2tiZCcpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnQSc6XG4gICAgY2FzZSAnSU1HJzpcbiAgICAgIGhyZWYgPSBhdHRyKGVsLCBlbC50YWdOYW1lID09PSAnQScgPyAnaHJlZicgOiAnc3JjJywgdGhpcy5vcHRpb25zLmFic29sdXRlKTtcbiAgICAgIGlmICghaHJlZikge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIHRpdGxlID0gYXR0cihlbCwgJ3RpdGxlJyk7XG4gICAgICBpZiAodGl0bGUpIHtcbiAgICAgICAgaHJlZiArPSAnIFwiJyArIHRpdGxlICsgJ1wiJztcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuaW5saW5lKSB7XG4gICAgICAgIHN1ZmZpeCA9ICcoJyArIGhyZWYgKyAnKSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdWZmaXggPSAnWycgKyAoKGJhc2UgPSB0aGlzLmxpbmtNYXApW2hyZWZdICE9IG51bGwgPyBiYXNlW2hyZWZdIDogYmFzZVtocmVmXSA9IHRoaXMubGlua3MucHVzaChocmVmKSkgKyAnXSc7XG4gICAgICB9XG4gICAgICBpZiAoZWwudGFnTmFtZSA9PT0gJ0lNRycpIHtcbiAgICAgICAgdGhpcy5vdXRwdXQoJyFbJyArIGF0dHIoZWwsICdhbHQnKSArICddJyArIHN1ZmZpeCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMub3V0cHV0KCdbJyk7XG4gICAgICB0aGlzLm5vVHJhaWxpbmdXaGl0ZXNwYWNlID0gdHJ1ZTtcbiAgICAgIGFmdGVyID0gdGhpcy5vdXRwdXRMYXRlcignXScgKyBzdWZmaXgpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnSUZSQU1FJzpcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmICgocmVmID0gZWwuY29udGVudERvY3VtZW50KSAhPSBudWxsID8gcmVmLmRvY3VtZW50RWxlbWVudCA6IHZvaWQgMCkge1xuICAgICAgICAgIHRoaXMucHJvY2VzcyhlbC5jb250ZW50RG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmcmFtZVNyYyA9IGF0dHIoZWwsICdzcmMnKTtcbiAgICAgICAgICBpZiAoZnJhbWVTcmMgJiYgdGhpcy5vcHRpb25zLmFsbG93RnJhbWUgJiYgdGhpcy5vcHRpb25zLmFsbG93RnJhbWUoZnJhbWVTcmMpKSB7XG4gICAgICAgICAgICB0aGlzLm91dHB1dCgnPGlmcmFtZSBzcmM9XCInICsgZnJhbWVTcmMgKyAnXCI+PC9pZnJhbWU+Jyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgfVxuXG4gIGFmdGVyID0gdGhpcy50YWJsZXMoZWwpIHx8IGFmdGVyO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBlbC5jaGlsZE5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGhpcy5wcm9jZXNzKGVsLmNoaWxkTm9kZXNbaV0pO1xuICB9XG5cbiAgdGhpcy5hZHZhbmNlSHRtbEluZGV4KCc8XFxcXHM/XFxcXC9cXFxccz8nICsgZWwudGFnTmFtZSArICc+Jyk7XG5cbiAgaWYgKHR5cGVvZiBhZnRlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGFmdGVyID0gW2FmdGVyXTtcbiAgfVxuICB3aGlsZSAoYWZ0ZXIgJiYgYWZ0ZXIubGVuZ3RoKSB7XG4gICAgYWZ0ZXIuc2hpZnQoKS5jYWxsKHRoaXMpO1xuICB9XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS50YWJsZXMgPSBmdW5jdGlvbiB0YWJsZXMgKGVsKSB7XG4gIGlmICh0aGlzLm9wdGlvbnMudGFibGVzID09PSBmYWxzZSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBuYW1lID0gZWwudGFnTmFtZTtcbiAgaWYgKG5hbWUgPT09ICdUQUJMRScpIHtcbiAgICB0aGlzLnRhYmxlQ29scyA9IFtdO1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAobmFtZSA9PT0gJ1RIRUFEJykge1xuICAgIHJldHVybiBmdW5jdGlvbiBhZnRlciAoKSB7XG4gICAgICByZXR1cm4gdGhpcy5hcHBlbmQoJ3wnICsgdGhpcy50YWJsZUNvbHMucmVkdWNlKHJlZHVjZXIsICcnKSArICdcXG4nKTtcbiAgICAgIGZ1bmN0aW9uIHJlZHVjZXIgKGFsbCwgdGhMZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGFsbCArICctJy5yZXBlYXQodGhMZW5ndGggKyAyKSArICd8JztcbiAgICAgIH1cbiAgICB9O1xuICB9XG4gIGlmIChuYW1lID09PSAnVEgnKSB7XG4gICAgcmV0dXJuIFtmdW5jdGlvbiBhZnRlciAoKSB7XG4gICAgICB0aGlzLnRhYmxlQ29scy5wdXNoKHRoaXMuY2hpbGRCdWZmZXIubGVuZ3RoKTtcbiAgICB9LCB0aGlzLnRkKHRydWUpXTtcbiAgfVxuICBpZiAobmFtZSA9PT0gJ1RSJykge1xuICAgIHRoaXMudGFibGVDb2wgPSAwO1xuICAgIHRoaXMub3V0cHV0KCd8Jyk7XG4gICAgdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IHRydWU7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIGFmdGVyICgpIHtcbiAgICAgIHRoaXMuYXBwZW5kKCdcXG4nKTtcbiAgICB9O1xuICB9XG4gIGlmIChuYW1lID09PSAnVEQnKSB7XG4gICAgcmV0dXJuIHRoaXMudGQoKTtcbiAgfVxufTtcblxuRG9tYWRvci5wcm90b3R5cGUucHVzaExlZnQgPSBmdW5jdGlvbiBwdXNoTGVmdCAodGV4dCkge1xuICB2YXIgb2xkO1xuICBvbGQgPSB0aGlzLmxlZnQ7XG4gIHRoaXMubGVmdCArPSB0ZXh0O1xuICBpZiAodGhpcy5hdFApIHtcbiAgICB0aGlzLmFwcGVuZCh0ZXh0KTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnAoKTtcbiAgfVxuICByZXR1cm4gKGZ1bmN0aW9uKF90aGlzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgX3RoaXMubGVmdCA9IG9sZDtcbiAgICAgIF90aGlzLmF0TGVmdCA9IF90aGlzLmF0UCA9IGZhbHNlO1xuICAgICAgcmV0dXJuIF90aGlzLnAoKTtcbiAgICB9O1xuICB9KSh0aGlzKTtcbn07XG5cbkRvbWFkb3IucHJvdG90eXBlLnJlcGxhY2VMZWZ0ID0gZnVuY3Rpb24gcmVwbGFjZUxlZnQgKHRleHQpIHtcbiAgaWYgKCF0aGlzLmF0TGVmdCkge1xuICAgIHRoaXMuYXBwZW5kKHRoaXMubGVmdC5yZXBsYWNlKC9bIF17Miw0fSQvLCB0ZXh0KSk7XG4gICAgcmV0dXJuIHRoaXMuYXRMZWZ0ID0gdGhpcy5ub1RyYWlsaW5nV2hpdGVzcGFjZSA9IHRoaXMuYXRQID0gdHJ1ZTtcbiAgfSBlbHNlIGlmICh0aGlzLmxhc3QpIHtcbiAgICByZXR1cm4gdGhpcy5sYXN0ID0gdGhpcy5sYXN0LnJlcGxhY2UoL1sgXXsyLDR9JC8sIHRleHQpO1xuICB9XG59O1xuXG5Eb21hZG9yLnByb3RvdHlwZS5pc1Zpc2libGUgPSBmdW5jdGlvbiBpc1Zpc2libGUgKGVsKSB7XG4gIHZhciBkaXNwbGF5O1xuICB2YXIgaTtcbiAgdmFyIHByb3BlcnR5O1xuICB2YXIgdmlzaWJpbGl0eTtcbiAgdmFyIHZpc2libGUgPSB0cnVlO1xuICB2YXIgc3R5bGUgPSBhdHRyKGVsLCAnc3R5bGUnLCBmYWxzZSk7XG4gIHZhciBwcm9wZXJ0aWVzID0gc3R5bGUgIT0gbnVsbCA/IHR5cGVvZiBzdHlsZS5tYXRjaCA9PT0gJ2Z1bmN0aW9uJyA/IHN0eWxlLm1hdGNoKHJkaXNwbGF5KSA6IHZvaWQgMCA6IHZvaWQgMDtcbiAgaWYgKHByb3BlcnRpZXMgIT0gbnVsbCkge1xuICAgIGZvciAoaSA9IDA7IGkgPCBwcm9wZXJ0aWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBwcm9wZXJ0eSA9IHByb3BlcnRpZXNbaV07XG4gICAgICB2aXNpYmxlID0gIXJoaWRkZW4udGVzdChwcm9wZXJ0eSk7XG4gICAgfVxuICB9XG4gIGlmICh2aXNpYmxlICYmIHR5cGVvZiB0aGlzLndpbmRvd0NvbnRleHQuZ2V0Q29tcHV0ZWRTdHlsZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHRyeSB7XG4gICAgICBzdHlsZSA9IHRoaXMud2luZG93Q29udGV4dC5nZXRDb21wdXRlZFN0eWxlKGVsLCBudWxsKTtcbiAgICAgIGlmICh0eXBlb2YgKHN0eWxlICE9IG51bGwgPyBzdHlsZS5nZXRQcm9wZXJ0eVZhbHVlIDogdm9pZCAwKSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBkaXNwbGF5ID0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgnZGlzcGxheScpO1xuICAgICAgICB2aXNpYmlsaXR5ID0gc3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSgndmlzaWJpbGl0eScpO1xuICAgICAgICB2aXNpYmxlID0gZGlzcGxheSAhPT0gJ25vbmUnICYmIHZpc2liaWxpdHkgIT09ICdoaWRkZW4nO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgIH1cbiAgfVxuICByZXR1cm4gdmlzaWJsZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gcGFyc2U7XG4iLCIvKiEgaHR0cDovL210aHMuYmUvcmVwZWF0IHYwLjIuMCBieSBAbWF0aGlhcyAqL1xuaWYgKCFTdHJpbmcucHJvdG90eXBlLnJlcGVhdCkge1xuXHQoZnVuY3Rpb24oKSB7XG5cdFx0J3VzZSBzdHJpY3QnOyAvLyBuZWVkZWQgdG8gc3VwcG9ydCBgYXBwbHlgL2BjYWxsYCB3aXRoIGB1bmRlZmluZWRgL2BudWxsYFxuXHRcdHZhciBkZWZpbmVQcm9wZXJ0eSA9IChmdW5jdGlvbigpIHtcblx0XHRcdC8vIElFIDggb25seSBzdXBwb3J0cyBgT2JqZWN0LmRlZmluZVByb3BlcnR5YCBvbiBET00gZWxlbWVudHNcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHZhciBvYmplY3QgPSB7fTtcblx0XHRcdFx0dmFyICRkZWZpbmVQcm9wZXJ0eSA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eTtcblx0XHRcdFx0dmFyIHJlc3VsdCA9ICRkZWZpbmVQcm9wZXJ0eShvYmplY3QsIG9iamVjdCwgb2JqZWN0KSAmJiAkZGVmaW5lUHJvcGVydHk7XG5cdFx0XHR9IGNhdGNoKGVycm9yKSB7fVxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9KCkpO1xuXHRcdHZhciByZXBlYXQgPSBmdW5jdGlvbihjb3VudCkge1xuXHRcdFx0aWYgKHRoaXMgPT0gbnVsbCkge1xuXHRcdFx0XHR0aHJvdyBUeXBlRXJyb3IoKTtcblx0XHRcdH1cblx0XHRcdHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG5cdFx0XHQvLyBgVG9JbnRlZ2VyYFxuXHRcdFx0dmFyIG4gPSBjb3VudCA/IE51bWJlcihjb3VudCkgOiAwO1xuXHRcdFx0aWYgKG4gIT0gbikgeyAvLyBiZXR0ZXIgYGlzTmFOYFxuXHRcdFx0XHRuID0gMDtcblx0XHRcdH1cblx0XHRcdC8vIEFjY291bnQgZm9yIG91dC1vZi1ib3VuZHMgaW5kaWNlc1xuXHRcdFx0aWYgKG4gPCAwIHx8IG4gPT0gSW5maW5pdHkpIHtcblx0XHRcdFx0dGhyb3cgUmFuZ2VFcnJvcigpO1xuXHRcdFx0fVxuXHRcdFx0dmFyIHJlc3VsdCA9ICcnO1xuXHRcdFx0d2hpbGUgKG4pIHtcblx0XHRcdFx0aWYgKG4gJSAyID09IDEpIHtcblx0XHRcdFx0XHRyZXN1bHQgKz0gc3RyaW5nO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChuID4gMSkge1xuXHRcdFx0XHRcdHN0cmluZyArPSBzdHJpbmc7XG5cdFx0XHRcdH1cblx0XHRcdFx0biA+Pj0gMTtcblx0XHRcdH1cblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fTtcblx0XHRpZiAoZGVmaW5lUHJvcGVydHkpIHtcblx0XHRcdGRlZmluZVByb3BlcnR5KFN0cmluZy5wcm90b3R5cGUsICdyZXBlYXQnLCB7XG5cdFx0XHRcdCd2YWx1ZSc6IHJlcGVhdCxcblx0XHRcdFx0J2NvbmZpZ3VyYWJsZSc6IHRydWUsXG5cdFx0XHRcdCd3cml0YWJsZSc6IHRydWVcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRTdHJpbmcucHJvdG90eXBlLnJlcGVhdCA9IHJlcGVhdDtcblx0XHR9XG5cdH0oKSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmlmICghd2luZG93Lk5vZGUpIHtcbiAgd2luZG93Lk5vZGUgPSB7XG4gICAgRUxFTUVOVF9OT0RFOiAxLFxuICAgIFRFWFRfTk9ERTogM1xuICB9O1xufVxuXG5mdW5jdGlvbiB3aW5kb3dDb250ZXh0ICgpIHtcbiAgcmV0dXJuIHdpbmRvdztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB3aW5kb3dDb250ZXh0O1xuIl19

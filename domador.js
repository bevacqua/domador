'use strict';

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
function isVisible (el) {
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
  if (visible && typeof windowContext.getComputedStyle === 'function') {
    try {
      style = windowContext.getComputedStyle(el, null);
      if (typeof (style != null ? style.getPropertyValue : void 0) === 'function') {
        display = style.getPropertyValue('display');
        visibility = style.getPropertyValue('visibility');
        visible = display !== 'none' && visibility !== 'hidden';
      }
    } catch (err) {
    }
  }
  return visible;
}

function nonPreProcess (text) {
  text = text.replace(/\n([ \t]*\n)+/g, '\n');
  text = text.replace(/\n[ \t]+/g, '\n');
  text = text.replace(/[ \t]+/g, ' ');
  for (var key in replacements) {
    text = text.replace(replacers[key], replacements[key]);
  }
  return text;
}

function inCodeProcess (text) {
  return text.replace(/`/g, '\\`');
}

function noop () {}

function parse (html, options) {
  return new Domador(html, options).parse();
}

function Domador (html, options) {
  this.html = html != null ? html : '';
  this.options = options || {};
  this.atLeft = this.atNoWS = this.atP = true;
  this.buffer = '';
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
}

Domador.prototype.append = function (text) {
  if (this.last != null) {
    this.buffer += this.last;
  }
  return this.last = text;
};

Domador.prototype.br = function () {
  this.append('  ' +  this.left);
  return this.atLeft = this.atNoWS = true;
};

Domador.prototype.code = function () {
  var old;
  old = this.inCode;
  this.inCode = true;
  return (function(_this) {
    return function() {
      return _this.inCode = old;
    };
  })(this);
};

Domador.prototype.li = function () {
  var result;
  result = this.inOrderedList ? (this.order++) + '. ' : '* ';
  result = padLeft(result, (this.listDepth - 1) * 2);
  return this.append(result);
};

Domador.prototype.ol = function () {
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
    return function() {
      _this.inOrderedList = inOrderedList;
      _this.order = order;
      return _this.listDepth--;
    };
  })(this);
};

Domador.prototype.output = function (text) {
  if (!text) {
    return;
  }
  if (!this.inPre) {
    text = this.atNoWS ? text.replace(/^[ \t\n]+/, '') : /^[ \t]*\n/.test(text) ? text.replace(/^[ \t\n]+/, '\n') : text.replace(/^[ \t]+/, ' ');
  }
  if (text === '') {
    return;
  }
  this.atP = /\n\n$/.test(text);
  this.atLeft = /\n$/.test(text);
  this.atNoWS = /[ \t\n]$/.test(text);
  return this.append(text.replace(/\n/g, this.left));
};

Domador.prototype.outputLater = function (text) {
  return (function(self) {
    return function () {
      return self.output(text);
    };
  })(this);
};

Domador.prototype.p = function (lonely) {
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
  return this.atNoWS = this.atP = true;
};

Domador.prototype.parse = function () {
  var container;
  var i;
  var link;
  var ref;
  this.buffer = '';
  if (!this.html) {
    return this.buffer;
  }
  if (typeof this.html === 'string') {
    container = windowContext.document.createElement('div');
    container.innerHTML = this.html;
    this.process(container);
  } else {
    this.process(this.html.parentElement);
  }
  if (this.links.length) {
    this.append('\n\n');
    ref = this.links;
    for (i = 0; i < ref.length; i++) {
      link = ref[i];
      if (link) {
        this.append('[' + i + ']: ' + link + '\n');
      }
    }
  }
  this.append('');
  return this.buffer = trim(this.buffer);
};

Domador.prototype.pre = function () {
  var old;
  old = this.inPre;
  this.inPre = true;
  return (function(_this) {
    return function() {
      return _this.inPre = old;
    };
  })(this);
};

Domador.prototype.process = function (el) {
  var after;
  var after1;
  var after2;
  var base;
  var childNode;
  var href;
  var i;
  var ref;
  var ref1;
  var skipChildren;
  var src;
  var suffix;
  var summary;
  var title;
  if (!isVisible(el)) {
    return;
  }
  if (el.nodeType === windowContext.Node.ELEMENT_NODE) {
    skipChildren = false;
    try {
      if (shallowTags.indexOf(el.tagName) !== -1) {
        skipChildren = true;
      } else if (/^H[1-6]$/.test(el.tagName)) {
        this.p();
        this.output(many('#', parseInt(el.tagName.match(/([1-6])$/)[1])) + ' ');
      } else if (paragraphTags.indexOf(el.tagName) !== -1) {
        this.p();
      } else {
        switch (el.tagName) {
          case 'BODY':
          case 'FORM':
            break;
          case 'DETAILS':
            this.p();
            if (!has(el, 'open', false)) {
              skipChildren = true;
              summary = el.getElementsByTagName('summary')[0];
              if (summary) {
                this.process(summary);
              }
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
            this.atNoWS = true;
            after = this.outputLater('_');
            break;
          case 'DT':
          case 'B':
          case 'STRONG':
            if (el.tagName === 'DT') {
              this.p();
            }
            this.output('**');
            this.atNoWS = true;
            after = this.outputLater('**');
            break;
          case 'Q':
            this.output('"');
            this.atNoWS = true;
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
            el.className.split(/\s+/)
            if (this.options.fencing) {
              this.append('\n\n');
              this.output(['```', '\n'].join(this.options.fencinglanguage(el) || ''));
              after1 = this.pre();
              after2 = this.outputLater('\n```');
            } else {
              after1 = this.pushLeft('    ');
              after2 = this.pre();
            }
            after = function() {
              after1();
              return after2();
            };
            break;
          case 'CODE':
          case 'KBD':
          case 'SAMP':
            if (this.inPre) {
              break;
            }
            this.output('`');
            after1 = this.code();
            after2 = this.outputLater('`');
            after = function() {
              after1();
              return after2();
            };
            break;
          case 'BLOCKQUOTE':
          case 'DD':
            this.startingBlockquote = true;
            after = this.pushLeft('> ');
            this.startingBlockquote = false;
            break;
          case 'A':
            href = attr(el, 'href', this.options.absolute);
            if (!href) {
              break;
            }
            title = attr(el, 'title');
            if (title) {
              href += ' "' + title + '"';
            }
            suffix = this.options.inline ? '(' + href + ')' : '[' + ((base = this.linkMap)[href] != null ? base[href] : base[href] = this.links.push(href) - 1) + ']';
            this.output('[');
            this.atNoWS = true;
            after = this.outputLater(']' + suffix);
            break;
          case 'IMG':
            skipChildren = true;
            src = attr(el, 'src', this.options.absolute);
            if (!src) {
              break;
            }
            this.output('![' + (attr(el, 'alt')) + '](' + src + ')');
            break;
          case 'FRAME':
          case 'IFRAME':
            skipChildren = true;
            try {
              if ((ref = el.contentDocument) != null ? ref.documentElement : void 0) {
                this.process(el.contentDocument.documentElement);
              }
            } catch (err) {
            }
            break;
          case 'TR':
            after = this.p;
            break;
        }
      }
    } catch (err) {
    }
    if (!skipChildren) {
      ref1 = el.childNodes;
      for (i = 0; i < ref1.length; i++) {
        childNode = ref1[i];
        this.process(childNode);
      }
    }
    if (after) {
      return after.call(this);
    }
  } else if (el.nodeType === windowContext.Node.TEXT_NODE) {
    return this.output(this.inPre ? el.nodeValue : this.inCode ? inCodeProcess(el.nodeValue) : nonPreProcess(el.nodeValue));
  }
};

Domador.prototype.pushLeft = function (text) {
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

Domador.prototype.replaceLeft = function (text) {
  if (!this.atLeft) {
    this.append(this.left.replace(/[ ]{2,4}$/, text));
    return this.atLeft = this.atNoWS = this.atP = true;
  } else if (this.last) {
    return this.last = this.last.replace(/[ ]{2,4}$/, text);
  }
};

Domador.prototype.ul = function () {
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
    return function() {
      _this.inOrderedList = inOrderedList;
      _this.order = order;
      return _this.listDepth--;
    };
  })(this);
};

module.exports = parse;

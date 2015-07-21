'use strict';

var options = {
  features: {
    FetchExternalResources: false
  }
};
var _document = jsdom()(null, {}, options);
var _window = _document.defaultView;

module.exports = _window;

function jsdom () {
  try {
    return require('jsdom').jsdom;
  } catch (e) {
    throw new Error('domador requires you to install optional dependency `jsdom` to enable its server-side functionality.');
  }
}

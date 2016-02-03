'use strict';

function jsdom () {
  try {
    return require('jsdom').jsdom;
  } catch (e) {
    throw new Error('domador requires you to install optional dependency `jsdom` to enable its server-side functionality.');
  }
}

function virtualWindowContext (userOptions) {
  var options = {
    features: {
      FetchExternalResources: false
    }
  };
  var _document = jsdom()(null, { url: userOptions.href }, options);
  var _window = _document.defaultView;
  return _window;
}

module.exports = virtualWindowContext;

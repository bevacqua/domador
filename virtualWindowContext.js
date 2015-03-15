'use strict';

function jsdom () {
  try {
    return require('jsdom').jsdom;
  } catch (e) {
    throw new Error('domador requires you to install optional dependency `jsdom` to enable its server-side functionality.');
  }
}

var doc = jsdom()(null, {}, {
  features: {
    FetchExternalResources: false
  }
});

module.exports = doc.parentWindow;

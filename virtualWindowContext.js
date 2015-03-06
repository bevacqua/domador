'use strict';

var jsdom = require('jsdom').jsdom;
var doc = jsdom(null, {}, {
  features: {
    FetchExternalResources: false
  }
});

module.exports = doc.parentWindow;

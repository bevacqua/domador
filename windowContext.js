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

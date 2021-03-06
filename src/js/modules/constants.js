'use strict';

var dictionary = {
  REQUIRED: '`%s` parameter is required'
};

// ----------------
// public methods
// ----------------

var pGet = function(entry, vars) {
  return dictionary[entry].replace('`%s`', vars);
};

// ---------
// interface
// ---------

export {
  pGet as get
};


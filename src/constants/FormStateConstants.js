'use strict';

var keyMirror = require('react/lib/keyMirror');

var FormStateConstants = {
  Actions: keyMirror({
    UPDATE_FORM_DATA: null
  }),

  Statuses: keyMirror({
    READY: null,
    SUBMITTED: null,
    SUCCESS: null,
    ERROR: null
  })
};

module.exports = FormStateConstants;
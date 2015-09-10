'use strict';

var keyMirror = require('keymirror');

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
'use strict';

var LCARS = require('lcars');
var FormStateConstants = require('../constants/FormStateConstants');

var FormStateActionCreator = {
  updateFormData: function(data, action_options) {
    LCARS.dispatch({
      type: FormStateConstants.Actions.UPDATE_FORM_DATA,
      options: action_options,
      data: data
    });
  }
};

module.exports = FormStateActionCreator;
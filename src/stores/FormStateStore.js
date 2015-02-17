'use strict';

var LCARS = require('lcars');
var CargoBay = require('cargo-bay');
var MemoryAlpha = require('memory-alpha');
var FormStateConstants = require('./../constants/FormStateConstants');
var merge = require('amp-merge');

var _data = [];
var SUCCESS_EVENT = 'form_success';
var SUBMIT_EVENT = 'form_submit';
var ERROR_EVENT = 'form_error';

var _getDefaultState = function() {
  return {
    // #FORMDATAFIX
    // form_data: {},
    form_status: FormStateConstants.Statuses.READY,
    form_status_code: undefined,
    form_errors: {},
    form_messages: undefined
  };
};

var _findOrCreate = function(form_state_cid) {
  return (_data[form_state_cid] = _data[form_state_cid] || _getDefaultState());
};

var _setFormErrors = function(form_state_cid, form_errors) {

  var form_state = _findOrCreate(form_state_cid);

  // Reset the form_errors
  form_state.form_errors = {};

  // Loop through the errors from the action and ensure that they're all being saved
  // into form_state.form_errors as arrays instead of strings.
  Object.keys(form_errors).forEach(function(key) {
    var errors = form_errors[key];
    if (typeof errors === 'string') {
      errors = [errors];
    }
    form_state.form_errors[key] = errors;
  });
};

var FormStateStore = merge(CargoBay, {

  emitSubmit:  function(cid) { this.emit(SUBMIT_EVENT, cid); },
  emitSuccess: function(cid) { this.emit(SUCCESS_EVENT, cid); },
  emitError:   function(cid) { this.emit(ERROR_EVENT, cid); },

  addSubmitListener:  function(callback) { this.on(SUBMIT_EVENT, callback); },
  addSuccessListener: function(callback) { this.on(SUCCESS_EVENT, callback); },
  addErrorListener:   function(callback) { this.on(ERROR_EVENT, callback); },

  removeSubmitListener:  function(callback) { this.removeListener(SUBMIT_EVENT, callback); },
  removeSuccessListener: function(callback) { this.removeListener(SUCCESS_EVENT, callback); },
  removeErrorListener:   function(callback) { this.removeListener(ERROR_EVENT, callback); },

  getDefaultState: function() {
    // TODO: Is this function necessary and useful?
    return _getDefaultState();
  },

  getByCID: function(form_state_cid) {
    return _findOrCreate(form_state_cid);
  }
});

FormStateStore.dispatchToken = LCARS.register(function(action){
  // Only process this action if there was a form_state_cid sent in the options
  if (typeof action.options !== 'object' || typeof action.options.form_state_cid !== 'number') {
    return;
  }
  var cid = action.options.form_state_cid;
  var form_state = _findOrCreate(cid);

  if (action.request) {
    // We're mostly interested in the state of any Async Request being sent.
    // So if there's request data, process that.
    switch(action.request.status) {
      case MemoryAlpha.AsyncRequestStatuses.STARTED:
        _setFormErrors(cid, {});
        form_state.form_status = FormStateConstants.Statuses.SUBMITTED;
        form_state.form_status_code = undefined;
        form_state.form_messages = undefined;
        FormStateStore.emitChange();
        FormStateStore.emitSubmit(action.options.form_state_cid);
        break;

      case MemoryAlpha.AsyncRequestStatuses.SUCCEEDED:
        _setFormErrors(cid, {});
        if (action.data){
          form_state.form_messages = action.data.messages;
        }
        form_state.form_status = FormStateConstants.Statuses.SUCCESS;
        form_state.form_status_code = action.request.status_code;
        FormStateStore.emitChange();
        FormStateStore.emitSuccess(action.options.form_state_cid);
        break;

      case MemoryAlpha.AsyncRequestStatuses.FAILED:
        if (action.errors) {
          _setFormErrors(cid, action.errors);
        } else {
          _setFormErrors(cid, {});
        }
        form_state.form_status = FormStateConstants.Statuses.ERROR;
        form_state.form_status_code = action.request.status_code;
        FormStateStore.emitChange();
        FormStateStore.emitError(action.options.form_state_cid);
        break;
    }
  } else if (action.errors) {

    // If any errors come through an action that are connected to this form, go ahead
    // and process them regardless of the action type or request status
    _setFormErrors(cid, action.errors);
    form_state.form_status = FormStateConstants.Statuses.ERROR;
    form_state.form_status_code = undefined;
    FormStateStore.emitChange();
    FormStateStore.emitError(action.options.form_state_cid);

  }
});

module.exports = FormStateStore;
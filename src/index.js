'use strict';

/******
 TODO: Document better

 This mixin ties the state of this component to a specific FormState in FormStateStore.
 It sets the following state for the component:

 form_data:    An object representation of the state of this form's data at any point in time
 form_status:  The state of the form's ready/working/success state, using FormStateconstants.Statuses
 form_errors:  An object containing any errors in this form, keyed on the field names

 ******/


var FormStateStore = require('./stores/FormStateStore');
var FormStateConstants = require('./constants/FormStateConstants');
var FormStateActionCreator = require('./actions/FormStateActionCreator');
var merge = require('amp-merge');

var FormStateMixin = {

  getInitialState: function() {
    var initial_state = {
      form_data: {}
    };

    // On initialization, assign a unique form id. This ensures that all data, errors,
    // and messages generated by this form will filter back to this form itself.
    this.form_state_cid = FormStateStore.generateCID();

    // Users of this mixin can declare a getInitialFormData() function which returns
    // an object that will be set to the initial value of this.state.form_data
    if (typeof this.getInitialFormData === 'function') {
      // #FORMDATAFIX
      // // TODO: Update how LCARD enqueues actions. An action should only wait
      // // for other actions before processing, not wait for the whole JS call stack.
      // // The side effect of the current way is, the action below will not immediately
      // // fire, causing the FormStateStore to be empty until after the component is
      // // already mounted. Then the action fires, and the component has to re-render.
      // FormStateActionCreator.updateFormData(this.getInitialFormData(), {
      //   form_state_cid: this.form_state_cid
      // });

      initial_state.form_data = this.getInitialFormData();
    }

    // TODO: This is a case where immutable data structures would be very helpful —
    // if we just returned the data from the store, the then this.state would be saved
    // as a reference to the object coming from the store. Thus any future state changes
    // on this component would also change the object in the store!
    //
    // For right now we'll get around that by merging the store's data into an empty object
    // and passing that into the initial state. But longer-term, it would really benefit
    // us to only pass immutable data structures out of the stores, so that we can super
    // protect the store internals from outside mutation.
    return merge(initial_state, FormStateStore.getByCID(this.form_state_cid));
  },

  componentDidMount: function() {
    FormStateStore.addChangeListener(this._handleFormStateChange);

    if (this.handleFormSubmit) {
      FormStateStore.addSubmitListener(this._handleFormSubmit);
    }
    if (this.handleFormSuccess) {
      FormStateStore.addSuccessListener(this._handleFormSuccess);
    }
    if (this.handleFormError) {
      FormStateStore.addErrorListener(this._handleFormError);
    }
  },

  componentWillUnmount: function() {
    FormStateStore.removeChangeListener(this._handleFormStateChange);

    if (this.handleFormSubmit) {
      FormStateStore.removeSubmitListener(this._handleFormSubmit);
    }
    if (this.handleFormSuccess) {
      FormStateStore.removeSuccessListener(this._handleFormSuccess);
    }
    if (this.handleFormError) {
      FormStateStore.removeErrorListener(this._handleFormError);
    }
  },

  _handleFormStateChange: function() {
    this.setState(FormStateStore.getByCID(this.form_state_cid));
  },

  _handleFormSubmit: function(cid) {
    if (cid === this.form_state_cid) {
      this.handleFormSubmit();
    }
  },

  _handleFormSuccess: function(cid) {
    if (cid === this.form_state_cid) {
      this.handleFormSuccess();
    }
  },

  _handleFormError: function(cid) {
    if (cid === this.form_state_cid) {
      this.handleFormError();
    }
  },

  handleFormChange: function(evt) {
    // This is a callback that you should attach to the onChange event of every
    // form input. It takes the changed value and pumps it into a FormState action,
    // so that the FormStateStore can pick up on it, store the new value, and then
    // feed it back into your component. Yay FLUX!

    var new_form_data = merge({}, this.state.form_data);
    var input = evt.target;
    var value = input.value;

    // By default input.value always comes as a string... but often we actually want
    // it to represent another type such as a boolean or integer. On your inputs
    // you can set data-type="[type]" to auto-cast the type when it's set to state.
    //
    // Supported data-types: boolean, integer
    if (input.dataset && input.dataset.type === 'integer') {
      value = parseInt(value);
    } else if (input.dataset && input.dataset.type === 'boolean') {
      if (input.type === 'checkbox') {
        value = input.checked;
      } else {
        throw new Error('FormStateMixin doesn\'t know how to use data-type="boolean" on non-checkbox inputs.');
      }
    }

    // Input names may be references to nested objects, e.g.:
    //    <input name="user[role][title]" />
    //
    // They may also be references to dynamic arrays of data, e.g:
    //    <input type="checkbox" name="user[subscriptions][]" value="12" />
    //
    // So we actually need to climb into the new_form_data tree to find the right
    // nested object to edit. If we remove ] characters from the name and then split
    // on [ characters, this should split the name segments as an array like so:
    //  user                    =>  user                =>  ['user']
    //  user[role][title]       =>  user[role[title     =>  ['user', 'role', 'title']
    //  user[subscriptions][]   =>  user[subscriptions[ =>  ['user', 'subscriptions', ''] 
    //
    // In the last case, the final empty string indicates that this an array element.
    //
    // So we'll create a bucket variable current_data_object which will climb through
    // the new_form_data using all but the last array element. That way current_data_object
    // will contain a reference to the parent object or array, and editing it will
    // update the value in new_form_data.
    //
    // (Note: This might be made simpler with a deep merge instead of a tree climb,
    // but deep merges can get expensive and tricky. Maybe something to play with later.)

    var is_input_an_array_element = false;

    // To get the name segments first remove any ] characters and then split on [.
    var name_segments = input.name.replace(/]/g, '').split('[');

    // Pop the last name segment off the array, to use later
    var last_name_segment = name_segments.pop();

    if (last_name_segment === '') {
      // If the last segment is empty that means the name ends with []. Mark that
      // this should be saved as part of a dynamic array, and grab the actual last segment.
      is_input_an_array_element = true;
      last_name_segment = name_segments.pop();
    }

    // Start the tree climb at the base
    var current_data_object = new_form_data;

    // Use each name_segment to climb through the form data tree in current_data_object
    name_segments.forEach(function(name_segment) {
      if (typeof current_data_object[name_segment] === 'undefined') {
        // If this is the first time this input has been modified, the form state
        // might not already contain references to every step on the tree. Create
        // stub objects in this case.
        current_data_object[name_segment] = {};
      }
      current_data_object = current_data_object[name_segment];
    });

    if (is_input_an_array_element) {
      // The name ended with [], meaning this is part of a dynamic array of values.
      // For now we can only realistically support this kind of behavior with checkboxes.
      if (input.type !== 'checkbox') {
        throw new Error('FormStateMixin can only process inputs with names ending in [] if they are checkboxes. All other input types are unsupported.');
      } else {
        current_data_object[last_name_segment] = current_data_object[last_name_segment] || [];
        if (!Array.isArray(current_data_object[last_name_segment])) {
          throw new Error('FormStateMixin is trying to modify ' + input.name + ' as a dynamic array, but it found a non-array value. Please double-check your input names and default form data for possible naming conflicts.');
        }
        if (input.checked === true) {
          // The checkbox is on now, so let's add the value to the array
          current_data_object[last_name_segment].push(value);
        } else if (current_data_object[last_name_segment].indexOf(value) > -1) {
          // The checkbox is off now and the value exists in the array, so let's remove it
          current_data_object[last_name_segment].splice(current_data_object[last_name_segment].indexOf(value), 1);
        }
      }
    } else {
      // The name didn't contain nested objects or ended with a reference to a
      // scalar value. So let's just set that scalar value.

      if (input.type === 'checkbox' && input.checked === false) {
        // If this is an unchecked checkbox, set the value to false
        value = false;
      }
      current_data_object[last_name_segment] = value;
    }

    this.setState( {form_data: new_form_data } );

    // #FORMDATAFIX
    // FormStateActionCreator.updateFormData(new_form_data, {
    //   form_state_cid: this.form_state_cid
    // });
  },

  isFormReady: function() {
    return this.state.form_status === FormStateConstants.Statuses.READY;
  },

  isFormSubmitted: function() {
    return this.state.form_status === FormStateConstants.Statuses.SUBMITTED;
  },

  isFormSuccessful: function() {
    return this.state.form_status === FormStateConstants.Statuses.SUCCESS;
  },

  isFormFailed: function() {
    return this.state.form_status === FormStateConstants.Statuses.ERROR;
  }
};

module.exports = FormStateMixin;
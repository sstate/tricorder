jest.autoMockOff();

describe('FormStateMixin', function() {
  'use strict';

  var FormStateMixin = require('./../index');
  var FormStateStore = require('./../stores/FormStateStore');
  var React = require('react/addons');
  var TestUtils = React.addons.TestUtils;

  var TestComponent = React.createClass({
    mixins: [FormStateMixin],

    getInitialFormData: function() {
    return {
      single_data: 'default',
      nested: { data: 'default' },
      deeply: { nested: { data: 'default' }},
      array: {
        checkbox: ['1', '3', '4'],
        text: ['this', 'wont', 'work', 'anyways']
      },
      integer_text: 1,
      integer_checkbox: 1,
      boolean_text: true,
      boolean_checkbox: true
    };
  },

  handleFormSubmit: function() { },
  handleFormSuccess: function() { },
  handleFormError: function() { },

  render: function() {
    return (
      <form>
      <h1>SINGLE DATA</h1>
      <input type="text" ref="single_data" name="single_data" value={this.state.form_data.single_value} onChange={this.handleFormChange} />

      <h1>NESTED DATA</h1>
      <input type="text" ref="nested_data" name="nested[data]" value={this.state.form_data.nested.data} onChange={this.handleFormChange} />
      <input type="text" ref="deeply_nested_data" name="deeply[nested][data]" value={this.state.form_data.deeply.nested.data} onChange={this.handleFormChange} />

      <h1>DYNAMIC ARRAY DATA</h1>
      <input type="checkbox" ref="array_checkbox_1" name="array[checkbox][]" value="1" checked={this.state.form_data.array.checkbox.indexOf('1') > -1} onChange={this.handleFormChange} />
      <input type="checkbox" ref="array_checkbox_2" name="array[checkbox][]" value="2" checked={this.state.form_data.array.checkbox.indexOf('2') > -1} onChange={this.handleFormChange} />
      <input type="checkbox" ref="array_checkbox_3" name="array[checkbox][]" value="3" checked={this.state.form_data.array.checkbox.indexOf('3') > -1} onChange={this.handleFormChange} />
      <input type="checkbox" ref="array_checkbox_4" name="array[checkbox][]" value="4" checked={this.state.form_data.array.checkbox.indexOf('4') > -1} onChange={this.handleFormChange} />
      <input type="text" ref="array_text" name="array[text][]" value="1" onChange={this.handleFormChange} />

      <h1>TYPE CASTING</h1>
      <input type="text" ref="integer_text" name="integer_text" value={this.state.form_data.integer_text} data-type="integer" onChange={this.handleFormChange} />
      <input type="checkbox" ref="integer_checkbox" name="integer_checkbox" value="1" checked={this.state.form_data.integer_checkbox === 1} data-type="integer" onChange={this.handleFormChange} />
      <input type="text" ref="boolean_text" name="boolean_text" value={this.state.form_data.boolean_text} data-type="boolean" onChange={this.handleFormChange} />
      <input type="checkbox" ref="boolean_checkbox" name="boolean_checkbox" value="1" checked={this.state.form_data.boolean_checkbox === true} data-type="boolean" onChange={this.handleFormChange} />
      </form>

    );
  }
  });

var SimpleComponent = React.createClass({
  mixins: [FormStateMixin],
  render: function() { return <div>ABC</div>; }
});

var component; // Holds the DOM-inserted component for each test

beforeEach(function() {
  component = TestUtils.renderIntoDocument(<TestComponent />);
});

it('listens to FormStateStore for changes, and updates component state to match', function() {
  spyOn(component, 'setState');

  // Unmocking the whole event path through FormStateStore is a little difficult, and
  // actually makes this not a unit test any more. Instead, we'll call the callback
  // handler directly from FormStateMixin
  component._handleFormStateChange();
  expect(component.setState).toHaveBeenCalled();
});

describe('mounting/getInitialState', function() {
  it('sets a form_state_cid on the component', function() {
    expect(component.form_state_cid).not.toEqual(undefined);
  });

  it('sets default data from FormStateStore as state', function() {
    expect(Object.keys(component.state)).toEqual(['form_data', 'form_status', 'form_status_code', 'form_errors', 'form_messages']);
  });
});

describe('getInitialFormData', function() {
  it('return value is saved in state.form_data on mounting', function() {
    expect(component.state.form_data).toEqual(component.getInitialFormData());
  });

  it('is optional', function() {
    var renderSimpleComponent = function() {
      return TestUtils.renderIntoDocument(<SimpleComponent />);
    };

    // If the function is required, should get something like a "no method" error.
    // So no error thrown = optional.
    expect(renderSimpleComponent).not.toThrow();
  });
});

describe('handleFormSubmit, handleFormSuccess, handleFormError', function() {
  it('are called when FormStateStore fires these events for this form_state_cid', function() {
    var cid = component.form_state_cid;

    spyOn(component, 'handleFormSubmit');
    spyOn(component, 'handleFormSuccess');
    spyOn(component, 'handleFormError');

    // Unmocking the whole event path through FormStateStore is a little difficult, and
    // actually makes this not a unit test any more. Instead, we'll call the callback
    // handler directly from FormStateMixin
    component._handleFormSubmit(cid);
    component._handleFormSuccess(cid);
    component._handleFormError(cid);

    expect(component.handleFormSubmit.callCount).toEqual(1);
    expect(component.handleFormSuccess.callCount).toEqual(1);
    expect(component.handleFormError.callCount).toEqual(1);
  });

  it('are not called when FormStateStore fires these events for another form_state_cid', function() {
    var cid = component.form_state_cid;

    spyOn(component, 'handleFormSubmit');
    spyOn(component, 'handleFormSuccess');
    spyOn(component, 'handleFormError');

    // Unmocking the whole event path through FormStateStore is a little difficult, and
    // actually makes this not a unit test any more. Instead, we'll call the callback
    // handler directly from FormStateMixin
    component._handleFormSubmit(cid + 1);
    component._handleFormSuccess(cid + 1);
    component._handleFormError(cid + 1);

    expect(component.handleFormSubmit).not.toHaveBeenCalled();
    expect(component.handleFormSuccess).not.toHaveBeenCalled();
    expect(component.handleFormError).not.toHaveBeenCalled();
  });

  it('if not present in the parent component, FormStateMixin will not listen to FormStateStore', function() {
    spyOn(FormStateStore, 'addSubmitListener');
    spyOn(FormStateStore, 'addSuccessListener');
    spyOn(FormStateStore, 'addErrorListener');

    TestUtils.renderIntoDocument(<SimpleComponent />);

    expect(FormStateStore.addSubmitListener).not.toHaveBeenCalled();
    expect(FormStateStore.addSuccessListener).not.toHaveBeenCalled();
    expect(FormStateStore.addErrorListener).not.toHaveBeenCalled();
  });
});

describe('handleFormChange', function() {
  it('calls setState', function() {
    spyOn(component, 'setState');
    expect(component.setState).not.toHaveBeenCalled();
    TestUtils.Simulate.change(component.refs.single_data.getDOMNode());
    expect(component.setState).toHaveBeenCalled();
  });

  it('knows how to set form_data for single-value properties like name="abc"', function() {
    var single_data_input = component.refs.single_data.getDOMNode();
    expect(component.state.form_data.single_data).toEqual('default');

    single_data_input.value = 'changed';
    expect(component.state.form_data.single_data).toEqual('default');

    TestUtils.Simulate.change(single_data_input);
    expect(component.state.form_data.single_data).toEqual('changed');
  });

  it('knows how to set form_data for nested properties like name="abc[def][ghi]"', function() {
    var nested_data_input = component.refs.nested_data.getDOMNode();
    var deeply_nested_data_input = component.refs.deeply_nested_data.getDOMNode();

    expect(component.state.form_data.nested.data).toEqual('default');
    expect(component.state.form_data.deeply.nested.data).toEqual('default');

    nested_data_input.value = 'changed nested';
    TestUtils.Simulate.change(nested_data_input);
    deeply_nested_data_input.value = 'changed deeply nested';
    TestUtils.Simulate.change(deeply_nested_data_input);

    expect(component.state.form_data.nested.data).toEqual('changed nested');
    expect(component.state.form_data.deeply.nested.data).toEqual('changed deeply nested');
  });

  it('knows how to set form_data for dynamic array properties like name="abc[]" for checkboxes only', function() {
    var array_checkbox_1 = component.refs.array_checkbox_1.getDOMNode();
    var array_checkbox_2 = component.refs.array_checkbox_2.getDOMNode();
    var array_checkbox_3 = component.refs.array_checkbox_3.getDOMNode();
    var array_checkbox_4 = component.refs.array_checkbox_4.getDOMNode();

    expect(component.state.form_data.array.checkbox).toEqual(['1', '3', '4']);

    // Unchecking should remove from the array
    array_checkbox_1.checked = false;
    TestUtils.Simulate.change(array_checkbox_1);
    expect(component.state.form_data.array.checkbox).toEqual(['3', '4']);

    // Checking should add to the array
    array_checkbox_2.checked = true;
    TestUtils.Simulate.change(array_checkbox_2);
    expect(component.state.form_data.array.checkbox).toEqual(['3', '4', '2']);

    array_checkbox_1.checked = true;
    TestUtils.Simulate.change(array_checkbox_1);
    array_checkbox_4.checked = false;
    TestUtils.Simulate.change(array_checkbox_4);
    array_checkbox_2.checked = false;
    TestUtils.Simulate.change(array_checkbox_2);
    expect(component.state.form_data.array.checkbox).toEqual(['3', '1']);

    // Doesn't support non-checkbox inputs as dynamic array types — make sure an error is thrown
    var makeTextArrayChange = function() {
      var array_text = component.refs.array_text.getDOMNode();
      TestUtils.Simulate.change(array_text);
    };
    expect(makeTextArrayChange).toThrow();
  });

  it('casts data-type="integer" from strings to integers', function() {
    var integer_text = component.refs.integer_text.getDOMNode();
    var integer_checkbox = component.refs.integer_checkbox.getDOMNode();

    // Oddly, the React test utils don't seem to automatically bundle data- attributes
    // into a dataset object, like all browsers do. So unfortunately, this means
    // we need to explicitly set them on the inputs.
    integer_text.dataset = { type: 'integer' };
    integer_checkbox.dataset = { type: 'integer' };

    integer_text.value = '999';
    TestUtils.Simulate.change(integer_text);
    expect(component.state.form_data.integer_text).toEqual(999);

    integer_checkbox.value = '2';
    TestUtils.Simulate.change(integer_checkbox);
    expect(component.state.form_data.integer_checkbox).toEqual(2);
  });

  it('casts data-type="boolean" as true/false on checkboxes', function() {
    var boolean_text = component.refs.boolean_text.getDOMNode();
    var boolean_checkbox = component.refs.boolean_checkbox.getDOMNode();

    // Oddly, the React test utils don't seem to automatically bundle data- attributes
    // into a dataset object, like all browsers do. So unfortunately, this means
    // we need to explicitly set them on the inputs.
    boolean_text.dataset = { type: 'boolean' };
    boolean_checkbox.dataset = { type: 'boolean' };

    boolean_checkbox.checked = false;
    TestUtils.Simulate.change(boolean_checkbox);
    expect(component.state.form_data.boolean_checkbox).toEqual(false);

    boolean_checkbox.checked = true;
    TestUtils.Simulate.change(boolean_checkbox);
    expect(component.state.form_data.boolean_checkbox).toEqual(true);

    // Only checkbox input are supported by data-type="boolean"
    var makeTextBooleanChange = function() {
      boolean_text.value = 'false';
      TestUtils.Simulate.change(boolean_text);
    };
    expect(makeTextBooleanChange).toThrow();
  });
});
});
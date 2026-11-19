const React = require("react");
const { View } = require("react-native");

const open = jest.fn();
const dismiss = jest.fn();

function DateTimePicker(props) {
  return React.createElement(View, props);
}

module.exports = DateTimePicker;
module.exports.default = DateTimePicker;
module.exports.DateTimePickerAndroid = { open, dismiss };
module.exports.__esModule = true;

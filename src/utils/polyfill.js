/**
 * src/utils/polyfill.js
 * 
 * Polyfills codegenNativeComponent on the react-native module for React Native 0.75.
 * This ensures third-party libraries (like react-native-svg and react-native-gesture-handler)
 * can access codegenNativeComponent without throwing undefined errors in Hermes.
 */

const ReactNative = require('react-native');

if (!ReactNative.codegenNativeComponent) {
  try {
    const codegen = require('react-native/Libraries/Utilities/codegenNativeComponent');
    ReactNative.codegenNativeComponent = codegen.default || codegen;
  } catch (err) {
    try {
      const requireNative = require('react-native/Libraries/ReactNative/requireNativeComponent');
      ReactNative.codegenNativeComponent = requireNative.default || requireNative;
    } catch (_) {
      // Fallback stub
      ReactNative.codegenNativeComponent = function(name) {
        return name;
      };
    }
  }
}

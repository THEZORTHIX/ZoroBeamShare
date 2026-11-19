/**
 * scripts/patch-gesture-handler.js
 * 
 * Patches react-native-gesture-handler specs to use requireNativeComponent,
 * preventing @react-native/babel-plugin-codegen parsing errors on React Native 0.75+.
 */
const fs = require('fs');
const path = require('path');

const file1 = path.join(
  __dirname,
  '../node_modules/react-native-gesture-handler/src/specs/RNGestureHandlerRootViewNativeComponent.ts'
);

if (fs.existsSync(file1)) {
  const content = `import { requireNativeComponent } from 'react-native';
import type { HostComponent, ViewProps } from 'react-native';

export interface RootViewNativeProps extends ViewProps {
  unstable_forceActive?: boolean;
}

export default requireNativeComponent<RootViewNativeProps>(
  'RNGestureHandlerRootView'
) as HostComponent<RootViewNativeProps>;
`;
  fs.writeFileSync(file1, content, 'utf8');
  console.log('Patched RNGestureHandlerRootViewNativeComponent.ts');
}

const file2 = path.join(
  __dirname,
  '../node_modules/react-native-gesture-handler/src/specs/RNGestureHandlerButtonNativeComponent.ts'
);

if (fs.existsSync(file2)) {
  const content = `import { requireNativeComponent } from 'react-native';
import type { HostComponent, ViewProps, ColorValue } from 'react-native';

export interface NativeProps extends ViewProps {
  exclusive?: boolean;
  foreground?: boolean;
  borderless?: boolean;
  enabled?: boolean;
  rippleColor?: ColorValue;
  rippleRadius?: number;
  touchSoundDisabled?: boolean;
  borderWidth?: number;
  borderColor?: ColorValue;
  borderStyle?: string;
}

export default requireNativeComponent<NativeProps>(
  'RNGestureHandlerButton'
) as HostComponent<NativeProps>;
`;
  fs.writeFileSync(file2, content, 'utf8');
  console.log('Patched RNGestureHandlerButtonNativeComponent.ts');
}

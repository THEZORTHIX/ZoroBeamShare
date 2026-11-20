/**
 * scripts/patch-gesture-handler.js
 * 
 * Patches dependencies for React Native 0.75 compatibility:
 * 1. Exposes codegenNativeComponent in react-native/index.js.
 * 2. Patches react-native-gesture-handler codegen specs.
 * 3. Patches react-native-svg fabric imports to use codegenNativeComponent directly.
 */
const fs = require('fs');
const path = require('path');

// 1. Patch react-native/index.js to export codegenNativeComponent
const rnIndex = path.join(__dirname, '../node_modules/react-native/index.js');
if (fs.existsSync(rnIndex)) {
  let content = fs.readFileSync(rnIndex, 'utf8');
  if (!content.includes('codegenNativeComponent')) {
    content = content.replace(
      'get requireNativeComponent()',
      'get codegenNativeComponent() {\n    return require("./Libraries/Utilities/codegenNativeComponent").default;\n  },\n  get requireNativeComponent()'
    );
    fs.writeFileSync(rnIndex, content, 'utf8');
    console.log('Patched react-native/index.js with codegenNativeComponent');
  }
}

// 2. Patch react-native-gesture-handler specs
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

// 3. Patch react-native-svg fabric components
function patchSvgDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const files = fs.readdirSync(dirPath);
  for (const f of files) {
    if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js')) {
      const fp = path.join(dirPath, f);
      let content = fs.readFileSync(fp, 'utf8');
      if (content.includes("import { codegenNativeComponent } from 'react-native';")) {
        content = content.replace(
          "import { codegenNativeComponent } from 'react-native';",
          "import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';"
        );
        fs.writeFileSync(fp, content, 'utf8');
      }
    }
  }
}

patchSvgDirectory(path.join(__dirname, '../node_modules/react-native-svg/src/fabric'));
patchSvgDirectory(path.join(__dirname, '../node_modules/react-native-svg/lib/module/fabric'));
console.log('Patched react-native-svg fabric files.');

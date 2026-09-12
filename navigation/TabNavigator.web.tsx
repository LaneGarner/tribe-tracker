// The native iOS tab implementation statically imports native-only modules.
// Keep the browser bundle on the existing cross-platform tab navigator.
export { default } from './TabNavigatorClassic';

/*
 * Public API Surface of mock-control
 */

// framework-free: used by MSW handlers
export * from './lib/core/configurable';
export * from './lib/core/presets';
export * from './lib/core/store';
export * from './lib/core/types';

// Angular: the control panel, and the store exposed as signals
export { MockControl } from './lib/panel/mock-control';
export { MockPanel } from './lib/panel/mock-panel';

import { EndpointConfig } from './types';

export interface Preset {
  label: string;
  description: string;
  /** Applied on top of the defaults for every endpoint. */
  patch: Partial<EndpointConfig>;
}

export const presets = {
  happy: {
    label: 'Happy path',
    description: 'Instant, successful responses.',
    patch: {},
  },
  slow: {
    label: 'Slow network',
    description: 'Every request takes 2 seconds.',
    patch: { delayMode: 'fixed', delayMs: 2000 },
  },
  racey: {
    label: 'Out of order',
    description: 'Random 200–3000ms delays, so responses arrive out of order.',
    patch: { delayMode: 'random', delayMinMs: 200, delayMaxMs: 3000 },
  },
  flaky: {
    label: 'Flaky',
    description: 'Some latency, and 30% of requests fail with a 503.',
    patch: {
      delayMode: 'random',
      delayMinMs: 300,
      delayMaxMs: 1500,
      failureMode: 'http',
      status: 503,
      failureRate: 30,
    },
  },
  down: {
    label: 'Server down',
    description: 'Every request returns a 500.',
    patch: { failureMode: 'http', status: 500, failureRate: 100 },
  },
  offline: {
    label: 'Offline',
    description: 'Every request fails with a network error (status 0).',
    patch: { failureMode: 'network', failureRate: 100 },
  },
  empty: {
    label: 'Empty lists',
    description: 'Array endpoints return [].',
    patch: { empty: true },
  },
} satisfies Record<string, Preset>;

export type PresetName = keyof typeof presets;

export function isPresetName(name: string | null): name is PresetName {
  return name !== null && Object.hasOwn(presets, name);
}

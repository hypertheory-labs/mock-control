export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Describes a mocked endpoint. Registered by `configurable()` so the control panel can list it. */
export interface EndpointMeta {
  /** Stable id, used as the key for persisted settings (e.g. `products.list`). */
  id: string;
  label: string;
  method: HttpMethod;
  path: string;
  /** When true, the panel offers the "return an empty array" option. */
  returnsArray?: boolean;
  /** Named alternative responses. Filled in by `configurable()` from its `variants` argument. */
  variants?: VariantMeta[];
}

export interface VariantMeta {
  name: string;
  label: string;
}

export type DelayMode = 'none' | 'fixed' | 'random' | 'hold';
export type FailureMode = 'none' | 'http' | 'network';

export interface EndpointConfig {
  /** Name of the response variant to serve; `''` is the default response. */
  variant: string;
  delayMode: DelayMode;
  delayMs: number;
  delayMinMs: number;
  delayMaxMs: number;
  failureMode: FailureMode;
  /** HTTP status used when `failureMode` is `http`. */
  status: number;
  /** Percentage (0–100) of requests that fail when a failure mode is set. */
  failureRate: number;
  /** Return `[]` instead of the real data (array endpoints only). */
  empty: boolean;
  /** When set, settings only apply if a path param equals this value (e.g. only product `3`). */
  onlyForParam: string;
}

export const defaultConfig: EndpointConfig = {
  variant: '',
  delayMode: 'none',
  delayMs: 1000,
  delayMinMs: 200,
  delayMaxMs: 2000,
  failureMode: 'none',
  status: 500,
  failureRate: 100,
  empty: false,
  onlyForParam: '',
};

export type LogOutcome =
  | 'passthrough' // handed to the real server: a resolver or variant returned MSW's passthrough()
  | 'pending'
  | 'held'
  | 'ok'
  | 'empty'
  | 'http-error'
  | 'network-error'
  | 'aborted';

export interface LogEntry {
  seq: number;
  endpointId: string;
  method: HttpMethod;
  url: string;
  /** Label of the variant served, if not the default. */
  variant?: string;
  startedAt: number;
  durationMs?: number;
  status?: number;
  outcome: LogOutcome;
}

export interface MockState {
  endpoints: EndpointMeta[];
  configs: Record<string, EndpointConfig>;
  /** Newest first. */
  log: LogEntry[];
  activePreset: string | null;
}

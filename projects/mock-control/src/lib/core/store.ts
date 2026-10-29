import { isPresetName, presets } from './presets';
import {
  defaultConfig,
  EndpointConfig,
  EndpointMeta,
  HttpMethod,
  LogEntry,
  LogOutcome,
  MockState,
} from './types';

/*
  A tiny framework-free store. MSW handlers run in the page (the service worker only
  forwards requests), so they read this directly. Angular subscribes to it via MockControl.
  State is replaced immutably on every change, so a snapshot can go straight into a signal.
*/

const STORAGE_KEY = 'mock-control:v1';
const LOG_LIMIT = 100;

type Listener = (state: MockState) => void;

interface Persisted {
  configs: Record<string, Partial<EndpointConfig>>;
  activePreset: string | null;
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Persisted;
  } catch {
    // ignore corrupt or unavailable storage
  }
  return { configs: {}, activePreset: null };
}

function createMockStore() {
  const persisted = load();
  let state: MockState = {
    endpoints: [],
    configs: {},
    log: [],
    activePreset: persisted.activePreset,
  };
  let seq = 0;
  const listeners = new Set<Listener>();
  const releasers = new Map<number, () => void>();

  function setState(next: MockState) {
    state = next;
    listeners.forEach((l) => l(state));
  }

  function persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ configs: state.configs, activePreset: state.activePreset }),
      );
    } catch {
      // storage full or blocked; settings just won't survive a reload
    }
  }

  function setConfigs(configs: Record<string, EndpointConfig>, activePreset: string | null) {
    setState({ ...state, configs, activePreset });
    persist();
  }

  function patchLog(entrySeq: number, patch: Partial<LogEntry>) {
    setState({
      ...state,
      log: state.log.map((e) => (e.seq === entrySeq ? { ...e, ...patch } : e)),
    });
  }

  return {
    getSnapshot: () => state,

    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    register(meta: EndpointMeta) {
      const endpoints = [...state.endpoints.filter((e) => e.id !== meta.id), meta];
      const config = { ...defaultConfig, ...persisted.configs[meta.id] };
      // a saved variant may have been renamed or removed since
      if (!meta.variants?.some((v) => v.name === config.variant)) config.variant = '';
      setState({ ...state, endpoints, configs: { ...state.configs, [meta.id]: config } });
    },

    update(id: string, patch: Partial<EndpointConfig>) {
      const config = { ...defaultConfig, ...state.configs[id], ...patch };
      setConfigs({ ...state.configs, [id]: config }, null);
    },

    /** Presets describe network conditions, so each endpoint keeps its chosen response variant. */
    applyPreset(name: string) {
      if (!isPresetName(name)) return;
      const config = { ...defaultConfig, ...presets[name].patch };
      setConfigs(
        Object.fromEntries(
          state.endpoints.map((e) => [
            e.id,
            { ...config, variant: state.configs[e.id]?.variant ?? '' },
          ]),
        ),
        name === 'happy' ? null : name,
      );
    },

    resetAll() {
      setConfigs(
        Object.fromEntries(state.endpoints.map((e) => [e.id, { ...defaultConfig }])),
        null,
      );
      this.releaseAll();
    },

    // --- request lifecycle (called by configurable()) ---

    startRequest(endpointId: string, method: HttpMethod, url: string): number {
      const entry: LogEntry = {
        seq: ++seq,
        endpointId,
        method,
        url,
        startedAt: performance.now(),
        outcome: 'pending',
      };
      setState({ ...state, log: [entry, ...state.log].slice(0, LOG_LIMIT) });
      return entry.seq;
    },

    finishRequest(entrySeq: number, outcome: LogOutcome, status?: number, variant?: string) {
      const entry = state.log.find((e) => e.seq === entrySeq);
      if (!entry) return;
      patchLog(entrySeq, {
        outcome,
        status,
        variant,
        durationMs: Math.round(performance.now() - entry.startedAt),
      });
    },

    /** Resolves when released from the panel, or when the client aborts the request. */
    hold(entrySeq: number, signal: AbortSignal): Promise<void> {
      patchLog(entrySeq, { outcome: 'held' });
      return new Promise((resolve) => {
        const done = () => {
          releasers.delete(entrySeq);
          resolve();
        };
        releasers.set(entrySeq, done);
        signal.addEventListener('abort', done, { once: true });
      });
    },

    release(entrySeq: number) {
      releasers.get(entrySeq)?.();
    },

    releaseAll() {
      [...releasers.values()].forEach((release) => release());
    },

    clearLog() {
      // in-flight requests stay so they can still be finished (or released)
      setState({
        ...state,
        log: state.log.filter((e) => e.outcome === 'held' || e.outcome === 'pending'),
      });
    },
  };
}

export const mockStore = createMockStore();
export type MockStore = typeof mockStore;

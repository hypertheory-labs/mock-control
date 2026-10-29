import { computed, DestroyRef, inject, Service, signal } from '@angular/core';
import { presets } from '../core/presets';
import { mockStore } from '../core/store';
import { defaultConfig, EndpointConfig } from '../core/types';

/** Exposes the framework-free mock store as signals. */
@Service()
export class MockControl {
  readonly #state = signal(mockStore.getSnapshot());

  readonly endpoints = computed(() => this.#state().endpoints);
  readonly configs = computed(() => this.#state().configs);
  readonly log = computed(() => this.#state().log);
  readonly activePreset = computed(() => this.#state().activePreset);
  readonly heldCount = computed(() => this.log().filter((e) => e.outcome === 'held').length);
  readonly modifiedCount = computed(
    () => Object.values(this.configs()).filter((c) => !isDefault(c)).length,
  );
  readonly presets = Object.entries(presets).map(([name, p]) => ({ name, ...p }));

  constructor() {
    const unsubscribe = mockStore.subscribe((s) => this.#state.set(s));
    inject(DestroyRef).onDestroy(unsubscribe);
  }

  update(id: string, config: Partial<EndpointConfig>) {
    mockStore.update(id, config);
  }
  reset(id: string) {
    mockStore.update(id, defaultConfig);
  }
  applyPreset(name: string) {
    mockStore.applyPreset(name);
  }
  resetAll() {
    mockStore.resetAll();
  }
  release(seq: number) {
    mockStore.release(seq);
  }
  releaseAll() {
    mockStore.releaseAll();
  }
  clearLog() {
    mockStore.clearLog();
  }
}

export function isDefault(config: EndpointConfig) {
  return sameConfig(config, defaultConfig);
}

export function sameConfig(a: EndpointConfig, b: EndpointConfig) {
  return (Object.keys(defaultConfig) as (keyof EndpointConfig)[]).every((k) => a[k] === b[k]);
}

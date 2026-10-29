import { Component, computed, effect, inject, input, linkedSignal, untracked } from '@angular/core';
import { form, FormField, max, min } from '@angular/forms/signals';
import { EndpointConfig, EndpointMeta } from '../core/types';
import { isDefault, MockControl, sameConfig } from './mock-control';

@Component({
  selector: 'app-mock-endpoint-settings',
  imports: [FormField],
  template: `
    @let ep = endpoint();
    @let m = model();
    <details class="collapse collapse-arrow bg-base-200 rounded-box">
      <summary class="collapse-title flex flex-wrap items-center gap-2 pe-10">
        <span class="badge badge-sm badge-neutral font-mono">{{ ep.method }}</span>
        <span class="font-semibold">{{ ep.label }}</span>
        @if (variantLabel(); as label) {
          <span class="badge badge-sm badge-info">{{ label }}</span>
        }
        @if (modified()) {
          <span class="badge badge-sm badge-warning">modified</span>
        }
        <code class="basis-full text-xs opacity-80">{{ ep.path }}</code>
      </summary>

      <div class="collapse-content flex flex-col gap-3 text-sm">
        <div class="grid grid-cols-[8rem_1fr] items-center gap-x-3 gap-y-2">
          @if (ep.variants?.length) {
            <label [for]="uid('variant')" class="font-medium">Response</label>
            <select [id]="uid('variant')" class="select select-sm w-full" [formField]="f.variant">
              <option value="">Default</option>
              @for (v of ep.variants; track v.name) {
                <option [value]="v.name">{{ v.label }}</option>
              }
            </select>
          }

          <label [for]="uid('delayMode')" class="font-medium">Delay</label>
          <select [id]="uid('delayMode')" class="select select-sm w-full" [formField]="f.delayMode">
            <option value="none">None</option>
            <option value="fixed">Fixed</option>
            <option value="random">Random range</option>
            <option value="hold">Hold until released</option>
          </select>

          @switch (m.delayMode) {
            @case ('fixed') {
              <label [for]="uid('delayMs')" class="font-medium">Milliseconds</label>
              <input
                [id]="uid('delayMs')"
                type="number"
                step="100"
                class="input input-sm w-full"
                [formField]="f.delayMs"
              />
            }
            @case ('random') {
              <label [for]="uid('delayMinMs')" class="font-medium">Min ms</label>
              <input
                [id]="uid('delayMinMs')"
                type="number"
                step="100"
                class="input input-sm w-full"
                [formField]="f.delayMinMs"
              />
              <label [for]="uid('delayMaxMs')" class="font-medium">Max ms</label>
              <input
                [id]="uid('delayMaxMs')"
                type="number"
                step="100"
                class="input input-sm w-full"
                [formField]="f.delayMaxMs"
              />
            }
          }

          <label [for]="uid('failureMode')" class="font-medium">Failure</label>
          <select
            [id]="uid('failureMode')"
            class="select select-sm w-full"
            [formField]="f.failureMode"
          >
            <option value="none">None</option>
            <option value="http">HTTP error</option>
            <option value="network">Network error</option>
          </select>

          @if (m.failureMode === 'http') {
            <label [for]="uid('status')" class="font-medium">Status code</label>
            <input
              [id]="uid('status')"
              type="number"
              class="input input-sm w-full"
              [attr.list]="uid('statuses')"
              [formField]="f.status"
            />
            <datalist [id]="uid('statuses')">
              @for (s of commonStatuses; track s) {
                <option [value]="s"></option>
              }
            </datalist>
          }

          @if (m.failureMode !== 'none') {
            <label [for]="uid('failureRate')" class="font-medium">
              Fail rate: {{ m.failureRate }}%
            </label>
            <input
              [id]="uid('failureRate')"
              type="range"
              step="10"
              class="range range-sm range-error"
              [formField]="f.failureRate"
            />
          }

          @if (ep.returnsArray) {
            <label [for]="uid('empty')" class="font-medium">Empty array</label>
            <input
              [id]="uid('empty')"
              type="checkbox"
              class="toggle toggle-sm"
              [formField]="f.empty"
            />
          }

          @if (hasParams()) {
            <label [for]="uid('onlyForParam')" class="font-medium">Only when param =</label>
            <input
              [id]="uid('onlyForParam')"
              type="text"
              class="input input-sm w-full"
              placeholder="any (e.g. 3)"
              [attr.aria-describedby]="uid('onlyForParam-hint')"
              [formField]="f.onlyForParam"
            />
            <p [id]="uid('onlyForParam-hint')" class="col-start-2 text-xs opacity-80">
              Leave blank to apply to every request.
            </p>
          }
        </div>

        @if (errors().length) {
          <ul class="text-error text-xs" role="alert">
            @for (e of errors(); track e) {
              <li>{{ e }}</li>
            }
          </ul>
        }

        <button
          type="button"
          class="btn btn-sm btn-ghost self-end"
          [disabled]="!modified()"
          (click)="control.reset(ep.id)"
        >
          Reset endpoint
        </button>
      </div>
    </details>
  `,
})
export class EndpointSettings {
  protected readonly control = inject(MockControl);

  readonly endpoint = input.required<EndpointMeta>();
  readonly config = input.required<EndpointConfig>();

  protected readonly model = linkedSignal(() => this.config());
  protected readonly f = form(this.model, (p) => {
    min(p.delayMs, 0);
    min(p.delayMinMs, 0);
    min(p.delayMaxMs, 0);
    min(p.status, 400, { message: 'Status must be 400–599' });
    max(p.status, 599, { message: 'Status must be 400–599' });
    min(p.failureRate, 0);
    max(p.failureRate, 100);
  });

  protected readonly commonStatuses = [400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504];
  protected readonly modified = computed(() => !isDefault(this.config()));
  protected readonly variantLabel = computed(
    () => this.endpoint().variants?.find((v) => v.name === this.config().variant)?.label,
  );
  protected readonly hasParams = computed(() => this.endpoint().path.includes('/:'));
  protected readonly errors = computed(() =>
    this.f()
      .errorSummary()
      .map((e) => e.message ?? `Invalid value (${e.kind})`),
  );

  constructor() {
    // settings apply as you change them; push valid edits back to the store
    effect(() => {
      const value = this.model();
      if (!this.f().valid()) return;
      untracked(() => {
        if (!sameConfig(value, this.config())) this.control.update(this.endpoint().id, value);
      });
    });
  }

  protected uid(field: string) {
    return `mock-${this.endpoint().id}-${field}`;
  }
}

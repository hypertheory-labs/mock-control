import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { EndpointSettings } from './endpoint-settings';
import { MockControl } from './mock-control';
import { RequestLog } from './request-log';

type Tab = 'endpoints' | 'log';

/** Dev-only drawer for changing how the MSW mocks behave at runtime. */
@Component({
  selector: 'app-mock-panel',
  imports: [EndpointSettings, RequestLog],
  template: `
    <div class="fixed bottom-4 left-4 z-40 flex items-center gap-2">
      @if (control.heldCount()) {
        <button type="button" class="btn btn-warning shadow-lg" (click)="control.releaseAll()">
          Release {{ control.heldCount() }} held
        </button>
      }
      <button
        type="button"
        class="btn btn-primary shadow-lg"
        aria-haspopup="dialog"
        (click)="open()"
      >
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="size-5"
        >
          <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
        </svg>
        Mocks
        @if (control.modifiedCount()) {
          <span class="badge badge-sm badge-warning">
            {{ control.modifiedCount() }}<span class="sr-only"> endpoints modified</span>
          </span>
        }
      </button>
    </div>

    <dialog #dialog class="modal modal-end" aria-labelledby="mock-panel-title">
      <div class="modal-box w-full sm:w-md flex flex-col gap-4">
        <header class="flex items-center justify-between">
          <h2 id="mock-panel-title" class="text-lg font-bold">Mock API settings</h2>
          <form method="dialog">
            <button class="btn btn-sm btn-circle btn-ghost" aria-label="Close mock settings">
              <span aria-hidden="true">✕</span>
            </button>
          </form>
        </header>

        <section aria-labelledby="mock-presets-heading">
          <h3 id="mock-presets-heading" class="text-sm font-semibold mb-2">Scenarios</h3>
          <div class="flex flex-wrap gap-2">
            @for (p of control.presets; track p.name) {
              <button
                type="button"
                class="btn btn-sm"
                [class.btn-active]="control.activePreset() === p.name"
                [attr.aria-pressed]="control.activePreset() === p.name"
                [title]="p.description"
                (click)="control.applyPreset(p.name)"
              >
                {{ p.label }}
              </button>
            }
          </div>
          <p class="text-xs opacity-80 mt-2">
            Tip: add <code>?mock=flaky</code> (or another scenario) to a URL to start with it.
          </p>
        </section>

        <div role="tablist" class="tabs tabs-border" aria-label="Mock settings sections">
          @for (t of tabs; track t.id) {
            <button
              type="button"
              role="tab"
              class="tab text-base-content"
              [id]="'mock-tab-' + t.id"
              [class.tab-active]="tab() === t.id"
              [attr.aria-selected]="tab() === t.id"
              [attr.aria-controls]="'mock-tabpanel-' + t.id"
              [attr.tabindex]="tab() === t.id ? 0 : -1"
              (click)="tab.set(t.id)"
              (keydown.arrowRight)="switchTab()"
              (keydown.arrowLeft)="switchTab()"
            >
              {{ t.label }}
              @if (t.id === 'log' && control.heldCount()) {
                <span class="badge badge-sm badge-warning ms-1"
                  >{{ control.heldCount() }} held</span
                >
              }
            </button>
          }
        </div>

        <div
          role="tabpanel"
          [id]="'mock-tabpanel-' + tab()"
          [attr.aria-labelledby]="'mock-tab-' + tab()"
          class="flex-1 overflow-y-auto"
        >
          @if (tab() === 'endpoints') {
            <div class="flex flex-col gap-2">
              @for (ep of control.endpoints(); track ep.id) {
                <app-mock-endpoint-settings [endpoint]="ep" [config]="control.configs()[ep.id]" />
              }
            </div>
          } @else {
            <app-mock-request-log />
          }
        </div>

        <footer class="flex justify-end">
          <button type="button" class="btn btn-sm btn-outline" (click)="control.resetAll()">
            Reset everything
          </button>
        </footer>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button tabindex="-1">Close</button>
      </form>
    </dialog>
  `,
})
export class MockPanel {
  protected readonly control = inject(MockControl);
  protected readonly tab = signal<Tab>('endpoints');
  protected readonly tabs: { id: Tab; label: string }[] = [
    { id: 'endpoints', label: 'Endpoints' },
    { id: 'log', label: 'Request log' },
  ];
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected open() {
    this.dialog().nativeElement.showModal();
  }

  protected switchTab() {
    const next: Tab = this.tab() === 'endpoints' ? 'log' : 'endpoints';
    this.tab.set(next);
    queueMicrotask(() =>
      this.host.nativeElement.querySelector<HTMLElement>(`#mock-tab-${next}`)?.focus(),
    );
  }
}

import { Component, inject } from '@angular/core';
import { LogOutcome } from '../core/types';
import { MockControl } from './mock-control';

@Component({
  selector: 'app-mock-request-log',
  template: `
    <div class="flex justify-between items-center mb-2">
      <p class="text-sm opacity-80">Newest first. Only mocked endpoints are logged.</p>
      <button type="button" class="btn btn-sm btn-ghost" (click)="control.clearLog()">Clear</button>
    </div>

    @if (control.log().length) {
      <div class="overflow-x-auto">
        <table class="table table-sm">
          <caption class="sr-only">
            Mocked requests
          </caption>
          <thead>
            <tr class="text-base-content">
              <th scope="col">#</th>
              <th scope="col">Request</th>
              <th scope="col">Result</th>
              <th scope="col" class="text-end">Time</th>
            </tr>
          </thead>
          <tbody>
            @for (entry of control.log(); track entry.seq) {
              <tr>
                <td class="font-mono">{{ entry.seq }}</td>
                <td class="font-mono text-xs break-all">
                  <span class="font-semibold">{{ entry.method }}</span> {{ path(entry.url) }}
                  @if (entry.variant) {
                    <span class="block font-sans italic">{{ entry.variant }}</span>
                  }
                </td>
                <td>
                  @if (entry.outcome === 'held') {
                    <button
                      type="button"
                      class="btn btn-xs btn-warning"
                      (click)="control.release(entry.seq)"
                    >
                      Release
                    </button>
                  } @else {
                    <span class="badge badge-sm {{ badge[entry.outcome] }}">
                      {{ entry.status ?? '' }} {{ entry.outcome }}
                    </span>
                  }
                </td>
                <td class="text-end font-mono">
                  <!-- for a passthrough we only know when it was handed off, not the server's time -->
                  {{
                    entry.outcome === 'passthrough'
                      ? '—'
                      : entry.durationMs === undefined
                        ? '…'
                        : entry.durationMs + 'ms'
                  }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <p class="text-sm">No requests yet.</p>
    }
  `,
})
export class RequestLog {
  protected readonly control = inject(MockControl);

  protected readonly badge: Record<LogOutcome, string> = {
    passthrough: 'badge-outline',
    pending: 'badge-ghost',
    held: 'badge-warning',
    ok: 'badge-success',
    empty: 'badge-info',
    'http-error': 'badge-error',
    'network-error': 'badge-error',
    aborted: 'badge-neutral',
  };

  protected path(url: string) {
    const u = new URL(url);
    return u.pathname + u.search;
  }
}

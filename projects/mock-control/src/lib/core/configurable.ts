import { delay, http, HttpResponse, type HttpResponseResolver, type PathParams } from 'msw';
import { mockStore } from './store';
import { EndpointConfig, EndpointMeta } from './types';

type ResolverInfo = Parameters<HttpResponseResolver<PathParams>>[0];
type Resolver = (info: ResolverInfo) => Response | Promise<Response>;

/** A named alternative response, selectable from the control panel. */
export interface Variant {
  label: string;
  resolve: Resolver;
}

const statusTitles: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

/**
 * Wraps an MSW resolver so its behaviour (delay, failure, empty results) can be
 * changed at runtime from the mock control panel.
 *
 * The resolver is the "happy path"; everything else is applied around it.
 * `variants` are named alternatives to it (e.g. a large data set, or malformed data).
 */
export function configurable(
  meta: Omit<EndpointMeta, 'variants'>,
  resolver: Resolver,
  variants: Record<string, Variant> = {},
) {
  mockStore.register({
    ...meta,
    variants: Object.entries(variants).map(([name, v]) => ({ name, label: v.label })),
  });
  const method = http[meta.method.toLowerCase() as Lowercase<EndpointMeta['method']>];

  return method(meta.path, async (info) => {
    const { request, params } = info;
    // read once, so changing settings mid-request doesn't affect it
    const cfg = mockStore.getSnapshot().configs[meta.id];
    const seq = mockStore.startRequest(meta.id, meta.method, request.url);

    if (!appliesTo(cfg, params)) {
      const response = await resolver(info);
      finish(seq, response);
      return response;
    }

    const variant = variants[cfg.variant];

    await applyDelay(cfg, seq, request.signal);
    if (request.signal.aborted) {
      mockStore.finishRequest(seq, 'aborted');
      return HttpResponse.error();
    }

    if (cfg.failureMode !== 'none' && Math.random() * 100 < cfg.failureRate) {
      if (cfg.failureMode === 'network') {
        mockStore.finishRequest(seq, 'network-error', 0);
        return HttpResponse.error();
      }
      mockStore.finishRequest(seq, 'http-error', cfg.status);
      return problem(cfg.status, meta, request.url);
    }

    if (meta.returnsArray && cfg.empty) {
      mockStore.finishRequest(seq, 'empty', 200);
      return HttpResponse.json([]);
    }

    const response = await (variant?.resolve ?? resolver)(info);
    finish(seq, response, variant?.label);
    return response;
  });
}

/**
 * MSW's `passthrough()` is a sentinel response (a 302 with this header), not the server's
 * answer. Logging it as a 302 error would misreport a request that went to the real server.
 */
function finish(seq: number, response: Response, variant?: string) {
  if (response.headers.get('x-msw-intention') === 'passthrough') {
    mockStore.finishRequest(seq, 'passthrough', undefined, variant);
  } else {
    mockStore.finishRequest(seq, response.ok ? 'ok' : 'http-error', response.status, variant);
  }
}

function appliesTo(cfg: EndpointConfig, params: PathParams) {
  const target = cfg.onlyForParam.trim();
  if (!target) return true;
  return Object.values(params).some((v) => (Array.isArray(v) ? v.includes(target) : v === target));
}

async function applyDelay(cfg: EndpointConfig, seq: number, signal: AbortSignal) {
  switch (cfg.delayMode) {
    case 'fixed':
      return delay(cfg.delayMs);
    case 'random': {
      const min = Math.min(cfg.delayMinMs, cfg.delayMaxMs);
      const max = Math.max(cfg.delayMinMs, cfg.delayMaxMs);
      return delay(min + Math.random() * (max - min));
    }
    case 'hold':
      return mockStore.hold(seq, signal);
    case 'none':
      return;
  }
}

/** An RFC 9457 problem details response, like ASP.NET Core returns. */
function problem(status: number, meta: EndpointMeta, url: string) {
  return HttpResponse.json(
    {
      type: 'about:blank',
      title: statusTitles[status] ?? 'Error',
      status,
      detail: `Simulated failure from the mock control panel (${meta.label}).`,
      instance: new URL(url).pathname,
    },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

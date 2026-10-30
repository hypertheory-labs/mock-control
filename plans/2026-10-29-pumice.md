---
cart: pumice
base: da023f1
backfilled: 2026-10-30, by Claude, from aide's .loom/event-log.md
---

# Get mock-control ready to publish as an Angular-only package

The class apps used mock-control from source, so installing it from npm had never been
tried. We set out to make the README a setup guide for an Angular app, settle the
package's public surface before the first publish, and find out whether it can stay out
of production builds.

## Decision: The README is a setup guide for an Angular app
- where: `projects/mock-control/README.md › mock-control › Using it › Wiring it into an app`
- quote: `### Wiring it into an app`

**Because (Jeff):** class is all Angular, and someone installing from npm needs steps, not
a tour of the internals. "Core never imports Angular" stays as a rule for contributors,
not a promise to users.

## Decision: Selectors use the library's prefix, `mock-panel`
- where: `` scip-typescript npm @hypertheory-labs/mock-control . src/lib/panel/`mock-panel.ts`/MockPanel# ``
- quote: `selector: 'app-mock-panel',`

**Because (Jeff):** a rename is cheapest before the first publish. Breaking the class apps
is fine.

## Decision: Install as a devDependency
- where (new): `projects/mock-control/README.md › mock-control › Setup › 1. Install`

**Because (Claude, not asked):** the app bundles it at build time, so nothing needs it from
`node_modules` at runtime.

## Decision: `@defer` stays the default, and file replacement is documented as an option
- where (new): `projects/mock-control/README.md › mock-control › Setup › Keeping it out of production`

**Because (measured):** in a production build of the class app, the panel, store, handlers,
and MSW land only in lazy chunks behind `isDevMode()`. They're emitted but never loaded.
File replacement removes them entirely, but it costs a stub file and `angular.json`
changes, which is a lot to ask of a class app.

## Decline: Analog's Vite plugin to keep mocks out of the build
- where (new): `projects/mock-control/README.md › mock-control › Setup › Leaving it out of the build entirely`

**Because (measured):** the CLI's `fileReplacements` already does it.

## Decision: Keep daisyUI for now, and say it's a stopgap
- where (new): `projects/mock-control/README.md › mock-control › Requirements`

**Because (Jeff):** the panel should get its own CSS, shared with stellar-ng-devtools, so
both tools look the same and the contrast problems get fixed once. That's its own round.

## Decline: A spike compiling the panel's CSS into the package
- where (new): `projects/mock-control/README.md › mock-control › Requirements`

**Because (Jeff and Claude):** with our own CSS coming, the spike would measure something
we're about to throw away.

## Guess: Tailwind finds the panel's classes through an `@source` line into node_modules
- where (new): `projects/mock-control/README.md › mock-control › Setup › 5. Add the panel, deferred`

**Disproved if:** in a fresh app that installs the package from npm, the panel renders
unstyled.

## Decision: Publish to npm later, and stay at 0.0.1
- where: `projects/mock-control/package.json › version`
- quote: `"version": "0.0.1",`

**Because (Jeff):** this round is the work Jeff is into; publishing waits until the `@source`
guess is tested.

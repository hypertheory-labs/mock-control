# Plan: leave mock-control out of production builds entirely

**Dissolved, 2026-10-29.** This was a tour of a proposed change. Jeff took every default
without annotating, so what's below is the decisions and their reasons. The README is the
source for how; this is the record of why. Earlier plans are in `git log -p plan.md`.

- **File replacement is an option, not the main path.** `@defer` stays the default
  because it's what the class apps do, it needs nothing in `angular.json`, and its only
  cost is chunks that are emitted but never loaded.
- **Everything dev-only goes in one `dev-tools.ts`.** `fileReplacements` swaps files, not
  expressions, so the build needs a single place to make the swap.
- **The stub's trap is documented where someone would hit it.** The stub is only
  compiled in production builds, so a missing export fails `ng build`, not `ng serve`.
- **The `assets` override is documented, not designed around.** A configuration's
  `assets` replaces the base list. Moving the worker out of `public/` would avoid that,
  but it means changing `msw init`'s target and `package.json`'s `"msw"` entry, which is
  more setup to explain for less benefit. This gap was found while writing the tour, not
  while writing the change.

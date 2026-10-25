# Treasury downloaded-file QA

A finite, independently hosted file-origin test for the public Treasury release 1.5.0.
It downloads only the public blank HTML and verifies SHA256 before execution.
The three-row CSV is invented, with no real bank/customer identifiers.

The job opens the actual file URL in Chromium, Firefox and Linux WebKit, imports
the CSV, adds a payment, guidance and a goal, checks duplicate reimport, saves an
HTML copy, reopens it in a fresh browser context and restores a JSON backup.
All local-file contexts run offline. Exact pennies, original embedded code,
retained notes/goals, zero page errors and zero attempted external requests are
asserted. Linux WebKit is not proof of Safari or Windows browser behaviour.

The workflow is manual-dispatch only, uses a standard GitHub-hosted runner and
read-only repository permissions, and records fictional results in job logs and summaries. Artifact uploads and
caching are disabled to avoid any metered storage use.
It never deploys the app, changes the app audience or uses a desktop browser profile.
No personal source tree, data, credentials, sessions or private history belongs here.

Sam approved this public repository and its finite free-only manual runs. Syntax and
fixture checks are separate from native-file proof: each release requires a fresh
green three-engine run and inspection of its exact report.

References: https://playwright.dev/docs/ci and Playwright's upstream file-URL
navigation test in tests/page/page-goto.spec.ts. Standard public GitHub-hosted
runners are free under GitHub's current documented terms; do not use larger or
paid runners or enable billing.

Release 1.2.0 adds exact blank-download checks in all five public contexts, hover/focus/tap explanations, non-modal appearance through all skins and modes, narrow-screen icon/panel checks, direct common settings and offline draft preservation. Local Import and populated-copy saves keep their original lifecycle checks.

Release 1.3.0 also checks the welcome order/copy, one dock Help control and saved gold-white preference. A second native file test uses two documented RBS Bankline layouts with invented rows, repeat import, exact original CSV retention, fresh saved-HTML reopen, and unmapped foreign-currency/mixed-account refusal. This is constructed format coverage, not a claim of customer-export certification.

Treasury 1.4 checks the hosted demo landing after saved pause/fold/marker changes, actual autoplay progression and reduced-motion opt-in. The six appearance/mode combinations verify distinct green incoming/red outgoing stack segments around the real zero line. The removed master marker checkbox is replaced by direct notable selections; the existing unfinished-draft preference check now uses Paydays. No private data or workflow/billing changes.

Treasury 1.4.1 adds full plot-height notable lines and a separate reduced-motion test for compact-header and expanded Play/Pause. The original footer opt-in, native file/recovery and bank fixture journeys remain. Nine cases across three engines; workflow and billing settings unchanged.

Treasury 1.5.0 adds constructed consumer Lloyds and NatWest named-month layouts plus a Revolut product/state/fee journey. The visible product choice, exact fee deduction, excluded-row counts, account/product refusal, saved HTML reopen and JSON restore are exercised. Twelve cases across three engines. Downloaded anonymised external statements remain local and never enter this repository; these are independently invented regression records. Workflow and billing settings remain unchanged.

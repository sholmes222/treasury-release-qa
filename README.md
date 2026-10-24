# Treasury downloaded-file QA

A finite, independently hosted file-origin test for the public Treasury R60 beta.
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
It never deploys the app, changes its beta label or uses a desktop browser profile.
No personal source tree, data, credentials, sessions or private history belongs here.

Prepared, not executed. Syntax/fixture/package checks are not a passing native-file
test. A green CI run and inspection of its report are required to close the gap.
Publishing this package to its own public QA repository needs explicit approval.

References: https://playwright.dev/docs/ci and Playwright's upstream file-URL
navigation test in tests/page/page-goto.spec.ts. Standard public GitHub-hosted
runners are free under GitHub's current documented terms; do not use larger or
paid runners or enable billing.

# Easy Express Training Portal — implementation and handoff

## Start here

Portal: https://easy-express-sites-izwi.vercel.app

The CEO identity is **ACD5808EE029F206**. Sign in using the email and password already registered with that game account. The API verifies the PlayFab session and recognizes this exact ID; entering an ID into a browser form does not grant a role. The CEO employee profile is created automatically on the first successful website sign-in.

To add administrators later:

1. Sign in as the CEO.
2. Open **Employees → Provision employee**.
3. Link an existing game account by its PlayFab ID, or select **Create a new employee game account**.
4. Enter the employee name, registered email and department/group.
5. On the employee row, select **Grant admin → Confirm role change**.
6. Use **Revoke admin** to return that account to employee access.

Only the CEO can grant or revoke administrator roles. Administrators can provision employees, assign training, review results, configure supported pass marks and provide feedback. They cannot promote themselves, deactivate the CEO or deactivate another administrator. Deactivation and role changes are audited and checked on the backend on subsequent requests.

## Delivered scope

The public storefront was replaced with a training landing page and controlled employee sign-in. DLC catalog/checkout/webhook routes, purchase ownership code, prices, payment copy, public registration UI and the old generic admin proxy were removed. Account recovery was retained; the password-reset confirmation now uses the existing protected server reset route. No company affiliation or research effectiveness claims were retained.

The employee workspace includes assignments, due dates, attempt limits, completion status, first-answer results, practice priorities, compatible attempt comparisons, feedback and installation/support instructions. The administrator workspace includes searchable employees and profiles, department/group editing, controlled provisioning, individual/group assignment, rubric settings, filtered attempt review, CSV export and session observation. The CEO receives the additional role-management controls.

**Supported assessment:** PC component fundamentals, implemented in the existing Unity component tutorial and knowledge replay. This is the actual ten-question question bank in `PCTutorialQuestionBank.cs`, not a new browser simulation. Other repair, assembly and service scenarios remain gameplay features and have not been represented as assessed portal scenarios. Extend the contract only after instrumenting and validating those gameplay systems.

The Windows training build includes the employee authorization gate and reporting hooks. It requires online authorization and does not provide guest access. It preserves the existing PlayFab account ID and cloud-save workflow. Historical public/demo builds remain outside this employee training workflow and should not be distributed as the training build.

## Verification status

| Check | Result |
|---|---|
| React/Vite production build and ESLint | Passed |
| Eight automated backend workflow/security tests | Passed |
| Live private Blob encryption and four concurrent writes | Passed |
| Production anonymous API and cross-origin denial | Passed |
| Production isolated demonstration: provisioning, assignments, CEO grants and persistence | Passed |
| Production employee record scoping, correct-attempt feedback, role denial and logout | Passed |
| Demo accounts prohibited from Unity telemetry ingestion | Passed |
| Browser: provisioning, group assignment and persistence after refresh | Passed |
| Browser: CEO role grant and employee-visible feedback | Passed |
| Desktop and narrow-screen layout checks | Checked; tables scroll within their containers |
| Unity source compilation | Passed |
| Unity question bank, serialization and disabled guest regression | Passed |
| Windows standalone build | Succeeded |
| Private installer access | Anonymous access denied; scoped signed GET range verified |
| Real CEO / employee PlayFab sign-in | **Not verified during this task** |
| Actual signed-in tutorial → authenticated Unity telemetry → portal result | **Not verified during this task** |
| New real PlayFab account creation and email recovery | **Not verified during this task** |
| Tested minimum CPU / GPU / RAM specification | **Not available** |

No existing account password/session was available for a real participant playthrough. Compilation, transport fixtures and demonstration records do not prove that the Unity tutorial has been completed by a real authorized employee. The remaining manual test is listed below. This is a documented verification dependency, not a claim that the game connection is complete.

## Complete the signed-in workflow check

1. Sign in to the portal with CEO account ACD5808EE029F206.
2. Provision an employee game account. For an existing account, confirm the PlayFab ID in the PlayFab Players page. For a new account, retain the initial credentials through your company’s approved channel; the portal does not store or email the password.
3. Assign **PC component fundamentals**, choose a due date and set an attempt limit.
4. Sign in as that employee to confirm only their own assignments/results appear.
5. Download the approved Windows build from **Resources & support**, extract the whole archive and launch `EasyExpress.exe`.
6. Sign in with the same game email/password. Choose the assigned assessment in the training selector before the existing game menu proceeds.
7. Open the component tutorial or knowledge replay. Answer all ten knowledge questions. Observe the in-game reporting status and wait until **Pending: 0**.
8. Confirm that the portal result belongs to the correct employee and assignment, with the recorded phase, build, scenario/rubric versions and ten first answers. Compare the server score with the recorded answer inputs.
9. Sign in as the administrator, review the event timeline and save feedback. Sign in as the employee and confirm the same attempt shows that feedback.
10. Test another account against the first employee’s assignment/attempt IDs: direct requests must fail. Deactivate the employee, then verify a new game login/session and further telemetry are denied.
11. Interrupt the connection briefly during a check. The queue should retry without creating duplicate answers or a second result. After 90 seconds without successful authorization activity, the game requires sign-in again.
12. Try free practice. Its result must have no assignment ID and must not complete an assignment.

The API’s ownership, idempotency and deactivation behavior is covered by automated tests, but these steps verify the actual account and game UI path as well.

## Architecture and identity

The stack remains React/Vite, Vercel functions and PlayFab identity. Shared training records use the private Vercel Blob container **easy-express-training** attached to the supplied site’s Vercel project. The original URL belongs to project `easy-express-sites-izwi`; the checkout had initially been linked to a different related project. Deployment was corrected to the supplied project and the related project’s previous deployment was restored.

Website sign-in calls PlayFab Client `LoginWithEmailAddress` on the server, then `GetAccountInfo` to resolve the canonical player ID. A sealed, HttpOnly, SameSite=Strict cookie carries the session ticket for up to four hours. Sensitive responses use `Cache-Control: no-store`. Unity sends its existing PlayFab session ticket as a bearer credential. Every game request resolves that ticket again, checks active employee access and checks ownership. A client-supplied employee ID or role is ignored.

The CEO ID is fixed in server configuration. Other administrator grants are employee records in the encrypted database. The legacy administrator environment allowlist is not a bypass to the CEO-managed role model.

The Unity `AuthManager` verifies employee access before starting `GameSession`, loading the account’s existing cloud save or publishing login success. The training selector explicitly distinguishes assigned assessment from free practice. The reporting client persists an account-specific outbox under `Application.persistentDataPath`; tickets and server secrets are not written into it. Writes use a temporary file and replacement so interrupted writes do not intentionally replace the valid queue with partial JSON.

The game checks authorization every 25 seconds. A 401/403 revokes local access; a prolonged lost connection locks access after 90 seconds without a successful request. Offline evidence stays queued. Logout/quit queue abandonment and session-end operations; a sudden process crash is represented by stale/unknown session activity rather than invented completion.

## Storage schema and access rules

Each workspace is one versioned JSON document in private storage, also encrypted with AES-256-GCM. `TRAINING_DATA_KEY` derives the encryption key; random nonces prevent repeated plaintext from producing identical ciphertext. Store credentials remain server-only. Production lives under `training-v1/production.enc`; each demonstration receives a separate unpredictable `training-v1/demo-<random>.enc` namespace. A demo cookie cannot select production, and demo telemetry is rejected.

The records are:

| Collection | Principal fields |
|---|---|
| employees | Canonical PlayFab ID, name, informational email, group, active status, persisted admin role |
| assignments | UUID, employee ID, scenario/version, due date, attempt limit, complete rubric snapshot, creator/time |
| sessions | UUID, idempotent request ID, employee ID, build, started/last received/ended timestamps, state |
| attempts | UUID, client request ID, employee/session/assignment IDs, assessment/practice mode, scenario/version, rubric snapshot, phase, score, result, tutorial time |
| attempt.events | Unique event ID and payload hash, received/client timestamps, first answer input, server correctness, terminal outcome |
| attempt.feedback | Feedback ID, author ID, text, timestamp, bound to one attempt |
| audit | Actor, operation, target, time |
| rates | Hashed IP/action rate buckets for public login/demo/recovery operations |

All mutations occur on a fresh snapshot and commit with conditional ETag writes. Conflicts retry from a new snapshot; unsuccessful mutations do not save partial state. Origin reads bypass the private CDN cache. The storage body hash is checked against metadata when compression changes the HTTP ETag. Duplicate event IDs with altered content are rejected; identical retries return the existing result.

Employee reads are restricted to their employee record and records whose `employeeId` matches the authenticated identity. Employee writes are limited to their authenticated session/attempt telemetry. Administrator operations require an active administrator/CEO identity. CEO-only grants are checked separately. There are no client storage tokens, public record URLs, client-created role flags or browser-only assignment databases.

This is a small thesis/workshop backend rather than a high-volume analytics database. The encrypted snapshot is capped at 8 MB; conflict retries are bounded. For larger deployments, migrate the same API contract to a transactional database with row-level permissions, indexed event IDs and a retention policy. Do not silently truncate historical attempts. Demo workspaces currently remain in private storage until an operator removes them; they contain fictional data and are separate from real records.

## Game API contract

Endpoint: `POST https://easy-express-sites-izwi.vercel.app/api/training`

Header for Unity: `Authorization: Bearer <current PlayFab SessionTicket>` plus `Content-Type: application/json`. Do not embed a title secret, storage token or administrator credential in the game.

| action | Purpose and required fields |
|---|---|
| gameAccess | Verify active employee authorization; return that employee’s assignments |
| sessionStart | `requestId`, `gameBuild`; returns server session ID |
| heartbeat | `sessionId`; updates received-activity time |
| attemptStart | `requestId`, `sessionId`, `scenarioId`, `scenarioVersion`, optional `assignmentId`, optional `clientStartedAt`; returns attempt ID |
| events | `attemptId`, 1–100 events; validates ownership and payload consistency |
| sessionEnd | `sessionId`; requires the open attempt to finish or abandon first |

Example scenario start:

```json
{
  "action": "attemptStart",
  "requestId": "a-stable-client-attempt-guid",
  "sessionId": "server-session-uuid",
  "assignmentId": "employee-owned-assignment-uuid",
  "scenarioId": "pc-components",
  "scenarioVersion": "1",
  "clientStartedAt": "2026-10-08T12:00:00Z"
}
```

Omit/empty the assignment ID for free practice. Never attach a practice result to an unrelated assignment.

Example recorded first answer:

```json
{
  "action": "events",
  "attemptId": "server-attempt-uuid",
  "events": [{
    "id": "unique-stable-event-guid",
    "type": "answer",
    "timestamp": "2026-10-08T12:01:00Z",
    "phase": "post",
    "questionId": "gpu-identify",
    "selectedCategory": "GPU"
  }]
}
```

For multiple choice, send `selectedIndex` (0–2) instead of a category. Supported phases are `pre`, `post` and `replay`. Only the first answer per question/phase is accepted. Lesson quick checks remain local gameplay feedback, not scored portal evidence.

After all ten first answers for the selected phase, send `completed` or `failed`, the phase and optional `tutorialSeconds`. The backend computes the result from recorded inputs; it does not accept the submitted final score. Send `abandoned` for an unfinished check. Client timestamps are constrained; a newly accepted queued attempt may be at most seven days old. Received timestamps are server-generated.

Session start, attempt start and event IDs must be retained across retry. The Unity client does this with the existing local tutorial attempt GUID, server ID mapping and persistent outbox. A rejected 400/409 is displayed and retained for support/reconciliation; it is not silently converted to a successful result. Deactivated identities cannot flush or start additional authorized work.

## Rubric, measurements and limits

Scenario version 1 mirrors these actual Unity knowledge question IDs: `case-safe`, `cables-diagnose`, `gpu-identify`, `ram-identify`, `storage-diagnose`, `fan-airflow`, `cooler-identify`, `paste-diagnose`, `cpu-safe`, `psu-identify`.

Default rubric `components-1` requires 8/10 correct first answers (80%). The server checks the selected multiple-choice index or component category against its versioned question bank. Administrators can set a new pass mark in steps of ten percent. New assignments receive a new rubric snapshot; existing assignments and attempts retain their original criteria. Pre/post/replay are stored separately, and improvement charts compare only the same employee, scenario version, rubric version and phase.

Completion rate = assignments with a finalized scored assessment divided by assignments in the displayed workspace. Pass rate = passed scored assigned attempts divided by scored assigned attempts. Both denominators and sample counts are visible. Practice and abandoned attempts do not produce a passed assessment. Started/overdue counts use actual assignment attempts and due dates.

Tutorial time comes from the existing tutorial clock and includes tutorial UI time. It is not claimed as hands-on active task time. Diagnosis accuracy, assembly errors, procedure mistakes and hints are **not recorded** by this core integration. Existing game currency, shop reputation, business star ratings and entertainment progression are not converted into employee competency.

The client still reports the selected input and tutorial clock. An authenticated, modified game client can fabricate plausible answer events; server validation cannot prove physical PC interaction or attendance. There is no video replay, live camera stream, anti-cheat attestation or verified training-effectiveness finding. The observation page displays received telemetry and explicit refresh/activity timestamps.

Presence rules: heartbeat ≤60 seconds = online; activity ≤5 minutes = recent; older activity = unknown/stale. Ended sessions remain ended. The observation page refreshes every 30 seconds and also has a manual Refresh control. Due dates use UTC calendar days; displayed activity times use the browser’s local timezone.

## Required environment variables

| Variable | Use |
|---|---|
| PLAYFAB_TITLE_ID | Existing title, 164227; public identifier |
| EASY_EXPRESS_CEO_PLAYFAB_ID | CEO account, ACD5808EE029F206; server-owned role authority |
| TRAINING_DATA_KEY | Stable encryption/cookie secret, configured in Vercel; never expose or casually rotate |
| BLOB_READ_WRITE_TOKEN | Private training container credential, configured by the Vercel store attachment |
| TRAINING_INSTALLER_PATH | Private training ZIP pathname |
| TRAINING_INSTALLER_TOKEN | Optional only if the installer uses a different private store |
| PLAYFAB_SECRET_KEY | Existing server-side password-reset service; not needed for training identity verification |
| SITE_URL | Existing recovery/service configuration, set to the supplied portal URL |

Back up the encrypted training state together with secure access to its key. Changing `TRAINING_DATA_KEY` without re-encrypting saved records makes those records unreadable and invalidates cookies. Secret values are deliberately absent from this document, source archives and `.env.example`.

The private installer requires active employee authorization before the API issues a read-only URL for that one ZIP. The URL expires after 60 seconds and carries no server storage token. A URL already issued can be used until it expires; future requests from a deactivated employee are denied. Direct anonymous access to the stored ZIP is denied. Use the portal’s approved installer rather than earlier public game releases.

## Demonstration and developer setup

Use **Explore thesis demonstration** on the public page. It creates an isolated workspace with fictional employees, sample attempts and sample feedback. The clearly labeled role selector switches only the demonstration role. Provisioning, assignments, feedback, role grants and exports operate on that isolated backend state, and survive refresh while the demo cookie is valid.

For local work, `npm ci`, then `npm run dev`. The preview at http://127.0.0.1:5173 uses an encrypted file backend under ignored `work/`, with a stable development key. A server restart retains local demo records. The preview deliberately does not use production records even if loading an exported Vercel environment file.

Run `npm run lint`, `npm test`, `npm run build`. For a production fictional workflow check, run `node scripts/production-smoke.mjs`. The script states explicitly that it does not prove real PlayFab/game sign-in. Run storage/installer tools only with authorized server credentials supplied through the environment, not command arguments.

The Unity project is `C:/Users/garci/Documents/EasyExpress3/EasyExpress`, Unity 6000.3.2f1. Reporting bootstraps at runtime; no scene prefab wiring is required. Hooks were added to AuthManager, the tutorial assessment store and first-answer handling. `TrainingPortalRegression.Run` checks the question contract, serialization and guest gate. `TrainingPortalRegression.BuildTraining` builds the enabled existing scenes as Windows x64 when `EE_TRAINING_BUILD_PATH` is supplied.

## Remaining items for the thesis/operator

- Perform the signed-in workflow test above and retain its evidence; no account password should be pasted into this chat.
- Confirm actual company departments, personnel and support contact details before entering real records.
- Confirm the PlayFab title’s new-account and recovery settings through a real onboarding/recovery test.
- Establish retention, secure backups and minimum supported hardware using measured testing.
- Instrument additional game scenarios before adding their metrics or treating them as assigned assessments.
- For a larger production audience, migrate the snapshot backend to a transactional database and test that migration; the current design is scoped to the thesis/workshop workflow.

The source bundle and Unity patch accompany this handoff. User edits to the two existing Unity font assets were not included in the training patch.

The training build also retires the in-game paid DLC catalog and purchase synchronization controls. Compatibility code can still resolve previously saved decoration art without a paid ownership gate. Game currency remains part of the original simulation and is excluded from competency metrics. The inspected PlayFab shared settings contain no serialized developer secret.

Website source is saved on the repository’s `training-portal` branch. Unity changes are present in the existing project and included separately as an integration ZIP and a patch checked against the repository’s baseline. The Windows archive contains the updated build and a start-here file. `QA-Sample-Report.csv` is fictional demonstration output, not a real employee report.

# Easy Express game progress

The current portal follows the existing EasyExpress4 game automatically. Employees do not choose portal assignments. The game’s levels, goals, grading, tutorials, unlocks and UI remain unchanged.

## Identity and approval

The website and game use PlayFab title `164227`. Create an account on the portal, request employee access, and wait for the CEO/administrator to approve it. The approved email and password work in both places. The configured CEO is `CA613F3FEACEFDC6`; only that account can grant administrator access. An inactive/pending employee cannot authorize game access, download the build, or upload game records.

“Workplace / company” means where the person works, for example **EasyPC**. It is a free-text field reviewed during approval and editable in the employee profile. The existing `group` storage property is preserved for compatibility; existing workplaces are not silently overwritten. Local preview approvals are isolated from the published portal. The production game checks the published portal.

## Automatic records

`GameActivityReporter` observes existing game results through six small logging hooks. No new game overlay or assessment selector is added.

| Record | Meaning |
| --- | --- |
| PCs built | Submitted Build jobs with no unresolved issues in the existing game evaluation |
| PCs repaired | Submitted Repair jobs that pass the existing repair-quality report, or existing unresolved-issue check if no report exists |
| Unsuccessful jobs | Submitted jobs that fail those existing checks; counted separately from blocked clicks or boot tests |
| Boot tests | Existing PC power-test outcomes |
| Blocked submission | A submission refused by the existing repair approval workflow |
| Service-only return | A returned PC without completed repair; excluded from successful/unsuccessful job totals |
| Level run | Existing level start/resume, with a stable run ID across reconnects |
| Level passed/failed | Existing three-day campaign evaluation; reporting never changes this result |
| Tutorial summary | Existing finished assessment’s pre/post totals and recorded tutorial seconds; no new questions or grading |
| Session | Account-specific game connection and background heartbeat; presence does not prove active work |

Ten level titles match `PCProblemCatalog`. Single-player and multiplayer results are displayed separately. Infinite activity remains in history and does not complete campaign levels. Multiplayer shared-shop submissions describe the reporting host, not each guest’s individual contribution.

Records are authenticated client reports, not an anti-cheat system or independent server grading. Counts cover activity received since the updated build was installed. Earlier gameplay cannot be reconstructed.

## Queue and API

Each account has its own outbox at `Application.persistentDataPath/training-reports/gameplay-<PlayFabID>.json`. It contains event data, never passwords, session tickets or server keys. Writes use a temporary file and atomic replacement. Events remain queued after network/authorization errors and retry when that same account reconnects. Invalid/conflicting events are retained in the local `quarantined` collection rather than preventing later valid events from uploading.

`POST /api/training` uses `Authorization: Bearer <PlayFab session ticket>`:

| Action | Input / authorization |
| --- | --- |
| `gameAccess` | Existing active employee approval check; authenticated account must match the response |
| `gameplayEvents` | 1–50 events; server assigns ownership from authenticated PlayFab identity |
| `gameplayHeartbeat` | The authenticated player’s existing open session ID |

Event/session/run IDs are 32 hex characters. Event timestamps must be within 30 days and at most five minutes ahead. Exact retry deliveries are idempotent; changed event IDs, conflicting final jobs and conflicting final level outcomes are rejected. One final job outcome is counted per player/run/job. One terminal level result is counted per player/run. Customer names/emails and issue descriptions are not uploaded; job IDs are one-way hashes.

The API persists `gameEvents` and `gameSessions` in the existing private AES-256-GCM store. Conditional writes prevent concurrent overwrites. The existing workspace snapshot limit is 8 MB; no history is silently pruned. Larger deployments need a database/event archive before that limit is reached. Legacy assignment/attempt APIs and stored records remain for compatibility, but are absent from the current navigation and game build.

## Windows build and installer

The target project is `C:\Users\garci\Documents\EasyExpress4\EasyExpress`, Unity `6000.3.2f1`, Windows x64. The application and executable are **Easy Express** / **Easy Express.exe**. The Windows icon comes from the original `Assets/Resources/UI/EasyExpressPauseLogo.png`.

**Easy Express Setup.exe** installs the complete Unity build into a dedicated per-user folder, creates a Start-menu shortcut and optional desktop shortcut, and registers an uninstaller. It does not require administrator elevation. Users receive an EXE, not a ZIP to extract. Compression is internal to the installer.

The previous `My project (1)` save location and PlayerPrefs are copied once without overwriting newer Easy Express data. Old saves remain available. Uninstall removes only installer-owned unchanged files, retains unrelated/modified files, and does not delete Unity saves or PlayerPrefs. This thesis installer is unsigned; no security warning is bypassed automatically.

`TRAINING_INSTALLER_PATH` must point to the private EXE blob. Active employee authorization is required before issuing a read-only download URL for that file, expiring after 60 seconds. Direct anonymous blob access and demonstration download access are denied. Earlier public builds do not include this workflow.

## Verification

The server suite checks authorization, scope, retry deduplication, conflicting outcomes, delayed events, session ownership, inactive accounts and demonstration isolation. Lint and Vite build are required. The Windows build must report success with zero errors. Installer testing compares every installed payload file with the actual build’s SHA-256 and verifies uninstall retains an unrelated user-owned file.

The opt-in editor fixture verifies observer payloads and account/guest isolation without modifying game saves. It is a fixture, not a complete signed-in level playthrough. A real employee should play and finish a level in the new build, then verify its automatic progress in the published portal; compilation or sample demonstration results do not establish that end-to-end result.

The dark design, original Unity branding and licensed real stock photographs are preserved. See `public/photo-credits.html` for sources and licenses. Demonstration employees and gameplay records are explicitly fictional and isolated from production.

# NexusVault 200+ Feature Roadmap

This roadmap prioritizes visible, browser-verifiable product work for NexusVault before general cleanup. Ideas are adapted for an SSH/RDP access-management product from current patterns in Linear views and dashboards, Notion docs/databases/templates, Stripe self-service billing, Supabase auth/storage/realtime/platform tooling, GitHub audit/security logs, Retool internal-tool building, and n8n workflow automation.

Sources used:
- Linear features and dashboards: https://linear.app/features, https://linear.app/docs/dashboards
- Notion product workspace features: https://www.notion.com/product/notion
- Stripe Billing customer portal: https://docs.stripe.com/billing/subscriptions/integrating-customer-portal
- Supabase platform capabilities: https://supabase.com/docs/guides/platform
- GitHub security and audit logs: https://docs.github.com/en/enterprise-cloud@latest/authentication/keeping-your-account-and-data-secure/reviewing-your-security-log
- Retool app builder positioning: https://retool.com/apps
- n8n workflow automation features: https://n8n.io/features/

## Dashboard

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 1 | Usage analytics cards | See connection, session, protocol, and credential coverage at a glance | Dashboard top band | Reuse connections and sessions APIs | Four cards render real counts with loading and empty states | Log in and inspect dashboard cards |
| 2 | Connection health snapshot | Identify unreachable hosts before starting sessions | Dashboard below analytics | Add health probe endpoint with bounded timeout | Each saved connection shows last reachability status | Seed connection and call health refresh |
| 3 | Recent session timeline | Resume or audit recent terminal work quickly | Dashboard activity section | Add paginated recent sessions endpoint | Timeline lists recent sessions with status and timestamps | Create sessions and verify timeline order |
| 4 | Favorite connections rail | Launch critical hosts faster | Dashboard side panel | Persist favorite flag on connections | Favorite toggles stay after reload | Mark favorite, reload, verify rail |
| 5 | Risk summary panel | Spot insecure or stale connection configs | Dashboard risk section | Add risk scoring service for saved targets | Panel lists high-risk connections and reasons | Create risky connection and verify warning |
| 6 | Quick launch command box | Start sessions from keyboard-focused command text | Dashboard header | Add connection lookup by name/id | User can type host name and start SSH/RDP flow | Use keyboard to open and select connection |
| 7 | Protocol utilization chart | Understand SSH vs RDP usage patterns | Dashboard analytics tab | Aggregate session histories by protocol | Chart renders counts for selected range | Add histories and verify chart data |
| 8 | Failed login trend | Detect access problems and brute-force attempts | Dashboard security section | Aggregate failed auth/activity events | Trend shows daily failed-login counts | Generate failed logins and verify trend |
| 9 | Maintenance banner | Warn operators about planned outages | Dashboard top notice | Add system announcement setting | Admin-created banner appears for users | Save banner and reload dashboard |
| 10 | Saved view widgets | Let users customize dashboard sections | Dashboard customize drawer | Persist per-user widget layout | Hidden widgets remain hidden after reload | Toggle widgets and refresh |

## Auth & User Settings

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 11 | Profile editor | Keep name, email, and avatar accurate | Settings profile tab | Add profile update endpoint | User can edit profile and see changes in nav | Update profile and reload |
| 12 | Password change flow | Rotate credentials without admin help | Settings security tab | Add password change endpoint with current-password check | Password changes only with valid current password | Change password then log in again |
| 13 | MFA setup | Reduce account takeover risk | Settings security tab | Add TOTP secret, verify, disable endpoints | QR/setup code flow enables MFA | Enroll TOTP and verify login prompt |
| 14 | Active device list | Review signed-in devices | Settings sessions tab | Store refresh/session metadata | Devices list shows current and older sessions | Log in twice and revoke one device |
| 15 | Session timeout preference | Let users tune idle security | Settings security tab | Persist user idle timeout preference | Selected timeout affects idle warning | Change timeout and wait for idle state |
| 16 | API token management | Enable scripts without sharing passwords | Settings API tokens tab | Add scoped API token CRUD | Token can be created, copied once, revoked | Create token and call health API |
| 17 | Notification preferences | Control noisy alerts | Settings notifications tab | Persist per-channel notification settings | Toggles affect notification delivery | Toggle preference and trigger event |
| 18 | Theme preference | Improve comfort in light/dark environments | Settings appearance tab | Persist theme preference | Theme survives reload and new login | Change theme, reload, verify |
| 19 | Accessibility preferences | Support reduced motion and larger text | Settings appearance tab | Persist accessibility flags | UI reflects reduced motion/larger text | Toggle settings and inspect UI |
| 20 | Account recovery codes | Provide backup MFA access | Settings security tab | Generate hashed recovery codes | Codes shown once and usable once | Generate and consume test code |

## Teams & Roles

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 21 | Team directory | See who can access NexusVault | Admin teams page | Add team member list endpoint | Directory lists users with roles and status | Admin opens team directory |
| 22 | Invite users | Add teammates without manual database work | Admin teams page | Add invitation creation and accept endpoints | Invite email/token creates pending user | Create invite and accept link |
| 23 | Role assignment UI | Grant least-privilege access | Admin roles page | Add role update endpoint and audit event | Admin can change user role with confirmation | Change role and verify permissions |
| 24 | Custom role builder | Match permissions to organization policy | Admin roles page | Add role permissions persistence | New role controls visible actions | Create role and log in as assigned user |
| 25 | Connection access groups | Share hosts with selected teams | Connection detail permissions tab | Add group ACL tables/endpoints | Only allowed users see shared connection | Assign group and verify as user |
| 26 | Temporary access grants | Support time-boxed incident access | Admin access grants page | Add grant expiry enforcement | Expired grant removes access automatically | Create short grant and wait/verify |
| 27 | Role change approval | Prevent risky privilege escalation | Admin roles page | Add approval workflow for role upgrades | Upgrade stays pending until approved | Request role change and approve |
| 28 | Team activity digest | Understand team usage patterns | Teams detail page | Aggregate activity by team | Team page shows sessions and changes | Generate activity and inspect digest |
| 29 | User suspension | Block access without deleting history | Admin user detail | Add suspend/reactivate endpoint | Suspended user cannot log in | Suspend test user and verify login fails |
| 30 | Permission preview | Validate access before saving roles | Role builder side panel | Add permission simulation endpoint | Preview lists pages/actions allowed | Build role and compare preview |

## Admin Console

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 31 | Admin overview | Centralize system management | Admin home | Add summary endpoint for users, roles, sessions | Overview cards render live admin metrics | Log in as admin and inspect |
| 32 | System settings editor | Change operational settings safely | Admin settings page | Add validated settings CRUD | Settings save with validation and audit event | Edit setting and reload |
| 33 | Maintenance mode | Freeze access during service windows | Admin operations page | Add maintenance flag middleware | Non-admins see maintenance screen | Enable and test as normal user |
| 34 | Connection policy editor | Enforce secure connection standards | Admin policy page | Add policy persistence and validation hooks | Noncompliant connections are blocked or warned | Save policy and attempt violation |
| 35 | Login policy editor | Configure password and MFA requirements | Admin security page | Add auth policy settings | Weak passwords/MFA-disabled users flagged | Change policy and test sign-up/update |
| 36 | Admin bulk user actions | Speed up user lifecycle tasks | Admin users table | Add bulk suspend/role endpoints | Selected users update with confirmation | Select users and apply action |
| 37 | Global announcement center | Broadcast notices to users | Admin communications page | Add announcement CRUD | Active announcements appear in app | Create announcement and verify dashboard |
| 38 | Backup status panel | Show last backup and retention health | Admin operations page | Add backup metadata endpoint | Panel shows last backup, status, retention | Seed metadata and inspect panel |
| 39 | License limits panel | Make usage limits visible | Admin billing page | Add plan/limit summary endpoint | Admin sees seats, connections, sessions limits | Open panel and compare API data |
| 40 | Admin impersonation with audit | Troubleshoot user issues safely | Admin user detail | Add scoped impersonation token and audit logs | Admin can view as user with clear banner | Start impersonation and verify audit |

## Notifications

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 41 | Notification center | Review missed alerts | Top nav bell | Add notification list/read endpoints | Bell opens unread and historical notifications | Trigger event and mark read |
| 42 | Real-time session alerts | Know when sessions start/end | Top nav bell and toast | Extend Redis pub/sub events | Toast appears on session lifecycle event | Start/end session and watch toast |
| 43 | Security alert rules | Alert on risky actions | Admin notifications page | Add alert rule persistence | Failed login threshold sends alert | Trigger threshold and verify alert |
| 44 | Email notification channel | Reach users outside app | Settings notifications | Add mail provider integration | Enabled users receive email for selected event | Trigger event and inspect mail sink |
| 45 | Slack webhook channel | Send team alerts to Slack | Admin integrations page | Add Slack webhook config | Test message succeeds and audit records result | Configure webhook and send test |
| 46 | Notification snooze | Reduce alert fatigue | Notification center item menu | Add snooze state and expiry | Snoozed alert disappears until expiry | Snooze and verify not shown |
| 47 | Digest notifications | Bundle lower-priority updates | Settings notifications | Add digest scheduler metadata | Digest preview lists grouped events | Generate events and preview digest |
| 48 | Critical alert banner | Surface high-severity issues globally | App shell banner | Add severity field to alerts | Critical alert appears above content | Trigger critical alert and inspect |
| 49 | Notification filters | Find relevant alerts quickly | Notification center filters | Add query params for severity/source/read | Filters update list accurately | Apply filters and verify API |
| 50 | Notification delivery log | Troubleshoot missing alerts | Admin notification logs | Store delivery attempts | Log shows status and error details | Force failed delivery and inspect |

## Search

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 51 | Global search overlay | Jump to hosts, sessions, users, docs | Keyboard command palette | Add federated search endpoint | Search returns grouped results with keyboard nav | Press shortcut and select result |
| 52 | Saved search views | Reuse common filters | Search page sidebar | Persist user search filters | Saved view reloads exact query/filter set | Save filter and reopen |
| 53 | Connection search facets | Narrow hosts by protocol, owner, status | Connections search page | Add filterable connection query | Facets change result counts and list | Apply protocol facet |
| 54 | Session transcript search | Find command history and terminal output | Sessions search page | Index session transcripts if enabled | Query returns matching transcript snippets | Seed transcript and search term |
| 55 | Audit event search | Investigate exact security events | Audit logs page | Add audit query endpoint with filters | Search finds actor/action/resource events | Search known event |
| 56 | Recent searches | Repeat prior investigations quickly | Search overlay footer | Persist local/server search history | Recent list appears and can clear entries | Search, reopen overlay |
| 57 | Search result previews | Avoid opening wrong item | Search results | Add preview fields to search response | Hover/select shows relevant metadata | Inspect preview for each type |
| 58 | Advanced query syntax | Support power-user filtering | Search page | Add parser for field:value filters | Valid filters return expected results; invalid shows error | Search `protocol:ssh` |
| 59 | Empty search suggestions | Guide users when nothing matches | Search page empty state | No new API required | Empty state offers adjusted filters | Search unlikely term |
| 60 | Export search results | Share investigation evidence | Search results toolbar | Add CSV export endpoint | Current filtered results download as CSV | Export and inspect file |

## Documents

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 61 | Document library | Store runbooks and evidence near access data | Documents page | Add document metadata and upload endpoints | Users can upload, list, and open documents | Upload PDF/text and reload |
| 62 | Connection attachments | Attach credentials runbooks to hosts | Connection detail documents tab | Add connection-document relation | Attached docs appear only on that connection | Attach doc and verify detail page |
| 63 | Document version history | Track changes to runbooks | Document detail | Add version table and upload revision endpoint | Versions list with restore/download actions | Upload revision and restore |
| 64 | Secure document preview | View docs without downloading | Document preview modal | Add signed preview endpoint | Preview renders allowed file types | Open uploaded PDF/text |
| 65 | Document access controls | Protect sensitive runbooks | Document permissions tab | Add ACL enforcement | Unauthorized user cannot see private doc | Restrict doc and test as user |
| 66 | Document tags | Organize operational docs | Document list filters | Add tags field and query filters | Tags can be added and filtered | Tag document and filter |
| 67 | Expiring documents | Remove stale credentials/runbooks | Document detail lifecycle | Add expiry metadata and alerts | Expired docs show warning and filters | Set past expiry and verify warning |
| 68 | Document comments | Collaborate on runbook quality | Document detail comments | Add comments CRUD | Users can comment, edit, delete own comments | Add and edit comment |
| 69 | Bulk document import | Speed migration from file shares | Documents import wizard | Add multi-upload endpoint | Multiple files upload with per-file result | Upload batch with mixed files |
| 70 | Document checksum display | Validate evidence integrity | Document detail metadata | Store SHA-256 on upload | Checksum visible and stable after download | Upload and compare checksum |

## RAG/Chat

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 71 | Workspace assistant panel | Ask questions about hosts, sessions, docs | Right-side assistant drawer | Add chat endpoint with scoped context | Assistant answers with cited app sources | Ask about saved connection count |
| 72 | Runbook Q&A | Query uploaded operational documents | Document detail assistant | Add document chunking and retrieval | Answers cite document chunks | Upload doc and ask direct question |
| 73 | Session summary assistant | Summarize terminal activity | Session detail assistant | Add transcript summarization endpoint | Summary includes commands, outcome, risks | Seed transcript and request summary |
| 74 | Incident triage chat | Guide response from alerts and logs | Monitoring alert detail | Add alert-context assembler | Chat includes alert details and next steps | Open alert and ask triage question |
| 75 | Connection risk explainer | Explain why a host is risky | Connection detail risk panel | Add risk explanations endpoint | Explanation references actual settings | Create risky host and inspect |
| 76 | Suggested saved searches | Convert natural language to filters | Search page assistant | Add NL-to-filter endpoint with validation | Assistant proposes filter before applying | Ask for failed admin logins |
| 77 | Chat citation viewer | Build trust in AI answers | Assistant answer citations | Add citation metadata fields | Clicking citation opens source object | Ask doc question and click citation |
| 78 | AI usage meter | Control AI feature cost | Assistant header and billing page | Add per-user token/usage tracking | Usage increments after AI call | Make call and inspect meter |
| 79 | Sensitive data guardrails | Prevent secrets leaking to model | Assistant compose box | Add redaction/classification layer | Detected secrets blocked or redacted | Paste fake secret and verify block |
| 80 | Saved assistant prompts | Reuse investigation prompts | Assistant prompt library | Persist user/team prompt templates | Saved prompt inserts into composer | Save and reuse prompt |

## Workflow Builder

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 81 | Workflow canvas | Automate repeatable access operations | Workflows page | Add workflow definitions CRUD | Users can create workflow with trigger/action nodes | Create simple workflow |
| 82 | Workflow template gallery | Start from common automations | Workflows templates tab | Add seeded templates endpoint | Template can be previewed and cloned | Clone template and open canvas |
| 83 | Approval gate node | Add human review to risky actions | Workflow canvas node palette | Add approval step execution model | Workflow pauses until approved/rejected | Run workflow with approval node |
| 84 | Webhook trigger | Integrate external systems | Workflow trigger drawer | Add webhook URL and signature validation | External POST starts workflow | Curl webhook and inspect run |
| 85 | Schedule trigger | Run recurring checks | Workflow trigger drawer | Add scheduler metadata | Scheduled workflow appears in upcoming runs | Create daily schedule and inspect |
| 86 | Workflow run history | Debug automation behavior | Workflow detail runs tab | Add run records and logs | Runs show status, duration, inputs, errors | Run workflow and inspect history |
| 87 | Retry failed step | Recover transient failures | Workflow run detail | Add retry endpoint for failed step | Failed step can rerun without full restart | Force failure and retry |
| 88 | Dry-run mode | Validate workflow without side effects | Workflow toolbar | Add validation/dry-run executor | Dry-run reports planned actions only | Dry-run workflow and verify no state change |
| 89 | Workflow variables | Reuse values across nodes | Workflow side panel | Add encrypted variable storage | Variables can be referenced and masked | Save variable and run workflow |
| 90 | Workflow versioning | Safely evolve automations | Workflow detail versions tab | Add immutable version snapshots | Published version remains runnable after edits | Publish, edit, compare versions |

## OCR

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 91 | OCR upload queue | Extract text from scanned runbooks | OCR page | Add OCR job upload and status endpoints | Uploaded file creates queued job | Upload sample image/PDF |
| 92 | Extraction profile builder | Tune OCR for operational forms | OCR profiles page | Add OCR profile CRUD | Profile can be saved and selected on upload | Create profile and run job |
| 93 | OCR result review | Correct extracted text before saving | OCR job detail | Add result update endpoint | Reviewer can edit extracted fields/text | Edit result and reload |
| 94 | Confidence heatmap | Focus review on low-confidence areas | OCR review viewer | Store word/field confidence | Low confidence text is visually marked | Upload low-quality sample and inspect |
| 95 | OCR-to-document save | Turn OCR output into searchable doc | OCR job actions | Add conversion endpoint to documents | Approved OCR output creates document | Approve job and find document |
| 96 | OCR batch processing | Handle many scans efficiently | OCR batch page | Add batch job grouping | Batch status tracks per-file results | Upload multiple files |
| 97 | OCR error state details | Diagnose failed extraction | OCR job detail error panel | Store provider/error metadata | Failed job shows actionable reason | Upload unsupported file |
| 98 | Field mapping templates | Extract structured data from forms | OCR profile field mapper | Add field coordinates/mapping storage | Extracted fields appear in structured table | Map field and run sample |
| 99 | OCR audit trail | Track who approved extracted text | OCR job history tab | Add OCR activity events | History shows edits, approvals, exports | Edit and approve job |
| 100 | OCR export | Share extracted data downstream | OCR job toolbar | Add TXT/CSV/JSON export endpoints | Exports match reviewed output | Export and inspect file |

## Procurement

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 101 | Procurement dashboard | Track access-tool spend and renewals | Procurement page | Add procurement records endpoints | Dashboard lists spend, renewals, status | Seed item and inspect |
| 102 | Purchase request form | Standardize tool/license requests | Procurement requests page | Add request CRUD and validation | User submits request with required fields | Submit valid/invalid request |
| 103 | Renewal calendar | Avoid missed vendor renewals | Procurement calendar | Add renewal date fields and query | Calendar shows upcoming renewals | Add renewal and verify calendar |
| 104 | Budget tracker | Control operational spend | Procurement budgets tab | Add budgets and spend aggregation | Budget progress reflects linked items | Add budget and item |
| 105 | Procurement approval flow | Route spend requests to approvers | Request detail | Add approval states and approver assignment | Request cannot approve itself | Submit and approve as approver |
| 106 | Contract attachment | Keep contracts with vendor records | Procurement item detail | Reuse document attachments | Contract file appears on item | Attach doc and reload |
| 107 | Procurement import | Load existing subscriptions/contracts | Procurement import wizard | Add CSV import with validation | Valid rows import; invalid rows report errors | Import sample CSV |
| 108 | Savings opportunity list | Identify unused licenses or duplicate tools | Procurement insights | Add usage-to-spend comparison | Insight lists underused items | Seed low-usage spend and inspect |
| 109 | Procurement comments | Collaborate on request decisions | Request detail comments | Add comments CRUD | Comments visible with author/time | Add comment and reload |
| 110 | Purchase order export | Send approved request to finance | Request toolbar | Add PDF/CSV export endpoint | Approved request exports clean summary | Export approved request |

## Vendors

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 111 | Vendor directory | Centralize vendor information | Vendors page | Add vendor CRUD endpoints | Vendors can be created, searched, edited | Create vendor and reload |
| 112 | Vendor comparison view | Compare tools before purchase | Vendors compare page | Add comparison query endpoint | Selected vendors appear in side-by-side matrix | Select two vendors |
| 113 | Vendor risk profile | Track security and operational risk | Vendor detail risk tab | Add risk fields and score | Risk score updates from field values | Edit risk factors and verify score |
| 114 | Vendor contact list | Find support/account contacts quickly | Vendor detail contacts tab | Add vendor contact CRUD | Contacts save with role and email/phone | Add contact and reload |
| 115 | SLA tracker | Monitor vendor reliability commitments | Vendor detail SLA tab | Add SLA target and incident records | SLA status shows met/breached | Add incident and inspect |
| 116 | Vendor document vault | Store security docs and contracts | Vendor documents tab | Reuse document ACLs and relation | Vendor docs filtered by vendor | Attach doc and verify |
| 117 | Vendor renewal alerts | Warn before contracts renew | Vendor detail and notifications | Add renewal alert job | Alert fires before configured date | Set near renewal and run check |
| 118 | Vendor onboarding checklist | Standardize vendor approval | Vendor onboarding tab | Add checklist template/status | Checklist progress persists | Complete checklist items |
| 119 | Vendor status page links | Jump to vendor outages | Vendor detail operations tab | Add status URL field | Link opens configured status page | Save URL and click |
| 120 | Vendor ownership assignment | Clarify who manages each vendor | Vendor detail header | Add owner user/team field | Owner visible and filterable | Assign owner and filter |

## Approvals

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 121 | Approval inbox | Review pending access/procurement/workflow items | Approvals page | Add approval task query endpoint | Inbox lists assigned approvals | Create task and inspect inbox |
| 122 | Approval detail view | Make informed decisions | Approval detail | Add approval context payload | Detail shows requester, reason, risk, history | Open approval |
| 123 | Approve/reject actions | Complete decisions with accountability | Approval detail footer | Add approve/reject endpoints with comments | Decision requires comment when rejecting | Reject without/with comment |
| 124 | Delegated approvals | Keep work moving during absence | Settings approvals tab | Add delegation settings | Delegate receives new approval tasks | Set delegate and create request |
| 125 | Escalation rules | Avoid stuck requests | Admin approval rules | Add SLA/escalation scheduler metadata | Overdue task escalates to fallback | Create overdue task and run check |
| 126 | Approval policy builder | Route requests by type/risk/team | Admin approval policies | Add policy CRUD and evaluator | Policy chooses expected approvers | Save policy and simulate request |
| 127 | Bulk approval review | Process low-risk items faster | Approvals table | Add bulk decision endpoint | Only eligible selected tasks are bulk-approved | Select multiple low-risk tasks |
| 128 | Approval audit trail | Prove who decided what and why | Approval detail history | Add immutable approval events | History lists all state changes | Approve and inspect history |
| 129 | Approval reminders | Reduce forgotten requests | Approval inbox/reminders | Add reminder notification job | Reminder appears before/after due date | Trigger reminder job |
| 130 | My requests view | Let requesters track status | Approvals my requests tab | Add requester-filtered endpoint | User sees submitted requests and decisions | Submit and inspect as requester |

## Reports

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 131 | Reports hub | Central place for operational reports | Reports page | Add report catalog endpoint | Hub lists available reports with descriptions | Open Reports page |
| 132 | Session activity report | Review access activity by user/host | Reports session activity | Add report query/export endpoint | Report filters by date/user/protocol | Run report and inspect rows |
| 133 | User access report | Audit who can access which hosts | Reports user access | Add permissions aggregation endpoint | Report lists users, roles, connections | Run as admin |
| 134 | Credential coverage report | Find hosts missing stored credentials | Reports credentials | Reuse connection metadata query | Report lists coverage by team/protocol | Create mixed hosts and verify |
| 135 | Security exceptions report | Track policy exceptions | Reports security | Add exception records/query | Report lists active/expired exceptions | Add exception and report |
| 136 | Scheduled reports | Automate recurring reporting | Reports schedule drawer | Add report schedule metadata | Schedule appears and can be disabled | Create schedule and inspect |
| 137 | Report export formats | Share reports outside app | Report toolbar | Add CSV/PDF export endpoints | Export respects active filters | Export report and inspect |
| 138 | Report chart builder | Visualize report data | Report chart tab | Add chart config persistence | Chart updates with selected dimensions | Configure chart and reload |
| 139 | Report sharing links | Share read-only report views | Report share modal | Add signed share token endpoint | Shared link opens read-only report | Create link in private browser |
| 140 | Compliance report pack | Generate recurring audit evidence | Reports compliance pack | Add multi-report bundle export | Bundle includes access, audit, session reports | Generate pack and inspect files |

## Integrations

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 141 | Integrations marketplace | Discover supported systems | Integrations page | Add integration catalog endpoint | Cards show status, setup action, docs link | Open integrations page |
| 142 | Slack integration | Send operational alerts to channels | Integration detail Slack | Add Slack config/test endpoints | Test alert posts successfully | Configure webhook and test |
| 143 | Webhook integration | Push events to external tools | Integration detail webhooks | Add outbound webhook CRUD and signer | External receiver gets signed event | Configure local receiver |
| 144 | Jira issue creation | Turn incidents into tickets | Integration detail Jira | Add Jira credential/config endpoints | Incident action creates ticket link | Connect test and create ticket |
| 145 | GitHub issue creation | Track engineering follow-up | Integration detail GitHub | Add GitHub token/config endpoint | Alert can create GitHub issue | Create issue in test repo |
| 146 | SIEM log drain | Stream audit/security events | Integrations SIEM tab | Add log drain delivery worker | Events delivered with retries and status | Configure test HTTP sink |
| 147 | SSO integration setup | Enterprise login via identity provider | Admin SSO page | Add SAML/OIDC config endpoints | SSO config validates metadata | Save test metadata and verify |
| 148 | Secrets manager integration | Avoid storing reusable secrets locally | Integrations secrets tab | Add provider config and secret lookup | Connection can reference external secret | Configure fake provider adapter |
| 149 | Cloud inventory import | Import hosts from AWS/Azure/GCP | Integrations cloud tab | Add cloud connector jobs | Imported hosts appear as draft connections | Run import against fixture/mock account |
| 150 | Integration health checks | Know when connectors break | Integrations page status row | Add connector health endpoint | Each connected integration shows health | Break config and inspect status |

## Audit Logs

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 151 | Audit log explorer | Investigate security-sensitive actions | Audit logs page | Add paginated audit query endpoint | Logs show actor, action, target, time | Open page and search event |
| 152 | Audit log filters | Narrow investigations quickly | Audit logs filter bar | Add actor/action/resource/date filters | Filters update rows and URL params | Apply actor/action filter |
| 153 | Audit event detail drawer | Inspect event metadata safely | Audit row drawer | Add metadata response field | Drawer shows request id, IP, user agent | Open event drawer |
| 154 | Audit export | Provide evidence to auditors | Audit logs toolbar | Add CSV/JSON export endpoint | Export respects filters and permissions | Export filtered logs |
| 155 | Tamper-evident audit hash | Increase trust in logs | Audit detail | Add hash chain fields | Event shows verification status | Verify chain endpoint |
| 156 | Audit retention settings | Manage storage and compliance | Admin audit settings | Add retention policy setting | Retention policy saves and displays | Change setting and reload |
| 157 | Sensitive event alerts | Notify on privileged actions | Audit logs alert rules | Add alert rule based on audit actions | Role/admin changes trigger alert | Change role and verify notification |
| 158 | User audit profile | See one user's activity history | User detail audit tab | Add user-scoped audit endpoint | Tab lists filtered user events | Open user and inspect |
| 159 | Resource audit timeline | See all changes to one connection/document | Resource detail history tab | Add resource-scoped audit endpoint | Timeline lists changes for resource | Edit resource and inspect |
| 160 | Audit log saved views | Reuse common compliance searches | Audit logs sidebar | Persist saved audit filters | Saved view restores filters | Save and reopen view |

## Monitoring

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 161 | System status page | See app, DB, Redis, and worker health | Status page | Extend health endpoint with component details | Page shows component status and latency | Open status page and call API |
| 162 | WebSocket health monitor | Detect terminal/notification channel issues | Status page realtime tab | Add WS heartbeat status endpoint | WS health shows connected/error state | Open page and disconnect Redis |
| 163 | Session latency chart | Track terminal responsiveness | Monitoring sessions tab | Collect session latency samples | Chart updates with latency metrics | Start session and inspect samples |
| 164 | Error rate panel | Spot app instability | Monitoring overview | Add error aggregation endpoint | Panel shows recent error counts | Generate error and inspect |
| 165 | Request log viewer | Debug backend behavior without shell access | Monitoring logs tab | Add restricted request log query | Admin sees recent sanitized request logs | Make request and inspect log |
| 166 | Container status widget | Verify local deployment health | Monitoring infra tab | Add Docker/runtime status adapter optional | Widget shows running services when available | Open local deployment status |
| 167 | Uptime checks | Monitor critical endpoints | Monitoring checks page | Add check definitions and runner | Checks run and store last result | Create check and run manually |
| 168 | Incident timeline | Coordinate outages | Monitoring incidents page | Add incident CRUD and timeline events | Incident can be opened, updated, resolved | Create incident and update timeline |
| 169 | Metrics export endpoint | Integrate Prometheus/Grafana | Monitoring settings | Add `/metrics` endpoint with auth/network guard | Metrics endpoint returns app counters | Curl metrics endpoint |
| 170 | Log redaction preview | Prevent secrets in operational logs | Monitoring settings | Add redaction tester endpoint | Input returns redacted preview | Paste fake secret and verify redaction |

## Billing/Usage

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 171 | Usage overview | Understand seats, connections, sessions, AI usage | Billing page | Add usage summary endpoint | Usage cards match database counts | Open billing page |
| 172 | Plan limits display | Know current limits before errors | Billing plan tab | Add plan config endpoint | Limits show for users, connections, storage, AI | Inspect plan tab |
| 173 | Seat management | Track billable users | Billing seats tab | Add billable seat query | Seat list shows active/suspended users | Add/suspend user and verify |
| 174 | AI token usage chart | Control AI feature spend | Billing AI tab | Add token usage aggregation | Chart updates after AI calls | Make AI call and inspect |
| 175 | Invoice history | Give admins billing records | Billing invoices tab | Add invoice metadata endpoint | Invoices list with status and download link | Seed invoice and inspect |
| 176 | Customer portal link | Let customers self-serve subscription changes | Billing page action | Add portal session endpoint | Button opens secure temporary portal session | Click portal action |
| 177 | Usage threshold alerts | Warn before limits are exceeded | Billing alerts tab | Add threshold settings and notifications | Alert fires at configured percent | Set low threshold and generate usage |
| 178 | Feature entitlement gates | Hide/disable unavailable paid features | App shell and feature pages | Add entitlement check endpoint | Restricted feature shows upgrade state | Change plan and reload |
| 179 | Cost allocation by team | Attribute usage internally | Billing teams tab | Add usage grouped by team | Team usage table renders totals | Assign users/team and inspect |
| 180 | Billing audit events | Track billing-sensitive actions | Billing history tab | Emit audit events for billing changes | Billing changes appear in audit/history | Change plan setting and inspect |

## Onboarding

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 181 | First-run checklist | Guide setup to first successful session | Dashboard onboarding card | Add per-user checklist state | Checklist tracks completed setup steps | Complete step and reload |
| 182 | Guided first connection | Help users create a working SSH/RDP target | New connection wizard | Add optional validation/probe endpoint | Wizard validates required fields and saves host | Create connection through wizard |
| 183 | Sample data mode | Let evaluators explore safely | Onboarding setup page | Add demo data seed endpoint guarded for admin | Demo data can be created and removed | Enable sample data and inspect |
| 184 | Product tour | Explain main UI without docs | App shell tour overlay | Persist tour completion | Tour highlights dashboard, sessions, settings | Start/finish tour and reload |
| 185 | Role-based onboarding | Tailor setup for admin vs operator | Onboarding page | Add role-based checklist templates | Admin/user sees relevant checklist | Log in with different roles |
| 186 | Import connections wizard | Migrate from spreadsheets/tools | Onboarding import step | Add CSV import endpoint with validation | Valid connections import, errors shown | Upload sample CSV |
| 187 | SSH key setup guide | Help configure secure auth | Settings keys onboarding | Add SSH key metadata endpoints if needed | Guide creates or links key credential | Complete guide and verify key record |
| 188 | Security baseline wizard | Configure MFA, policies, audit early | Admin onboarding page | Add policy setup shortcuts | Baseline completion saves policies | Run wizard and inspect settings |
| 189 | Invite teammates step | Build team workspace quickly | Onboarding team step | Reuse invite endpoints | Invites sent and checklist updates | Send invite and verify pending user |
| 190 | Onboarding progress analytics | Let admins see adoption blockers | Admin onboarding analytics | Add progress aggregation endpoint | Admin sees completion by team/user | Complete steps as user and inspect |

## Mobile/Responsive UX

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 191 | Mobile dashboard layout | Use NexusVault on tablets/phones | Dashboard responsive layout | No new API | Cards/search/actions fit without overlap | Test 390px and 768px widths |
| 192 | Mobile bottom navigation | Improve thumb navigation | App shell mobile view | No new API | Main pages reachable from bottom nav | Resize and click nav |
| 193 | Responsive connection cards | Avoid cramped host metadata | Dashboard cards | No new API | Cards stack and text truncates cleanly | Test long host names on mobile |
| 194 | Touch-friendly session actions | Prevent mis-taps on mobile | Session list/detail | No new API | Buttons meet touch target sizing | Inspect mobile layout |
| 195 | Mobile command palette | Keep quick navigation accessible | Mobile header | No new API | Search overlay opens and usable on mobile | Open search on mobile |
| 196 | Offline status banner | Explain network/API loss | App shell | Add connectivity state hook only | Banner appears when API unavailable | Stop backend and inspect UI |
| 197 | Responsive tables | Make audit/report tables usable | Audit/reports pages | No new API | Tables collapse to readable card rows | Test at 390px |
| 198 | Mobile filter drawer | Keep filters usable on small screens | Search/audit/report pages | No new API | Filters open in full-screen drawer | Apply filter on mobile |
| 199 | Reduced-motion mode | Improve accessibility | App shell/styles | Reuse user accessibility preference | Animations disabled when enabled | Toggle reduced motion |
| 200 | Keyboard focus polish | Improve accessibility and speed | Whole app | No new API | Visible focus ring and tab order across main flows | Keyboard-only smoke test |

## Developer/Ops Tools

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 201 | Local deployment panel | Show URL, build, and container status | Ops tools page | Add deployment metadata endpoint | Panel shows current version and service status | Open Ops tools in Docker |
| 202 | API explorer | Test secured endpoints in-app | Ops tools API tab | Add OpenAPI/static endpoint metadata | Admin can execute safe GET endpoints | Run health/users GET from UI |
| 203 | Feature flag console | Roll out features gradually | Ops tools flags tab | Add feature flag CRUD and evaluator | Flag changes affect UI without rebuild | Toggle flag and reload |
| 204 | Environment readiness checks | Detect missing env/config | Ops tools readiness tab | Extend readiness diagnostics endpoint | Page lists missing/valid config without secrets | Break optional env and inspect |
| 205 | Database migration status | See schema version and pending migrations | Ops tools database tab | Add migration history endpoint | Status shows applied/pending versions | Open DB tab |
| 206 | Background job monitor | Watch OCR/workflow/scheduled jobs | Ops tools jobs tab | Add job queue status endpoint | Jobs list with status and retry action | Create job and inspect |
| 207 | Cache inspector | Debug stale Redis-backed data | Ops tools cache tab | Add restricted Redis key summary endpoint | Admin sees namespaced keys, not secrets | Inspect cache summary |
| 208 | Safe support bundle export | Package sanitized diagnostics | Ops tools support tab | Add diagnostics export with redaction | Bundle excludes secrets and includes logs/status | Generate bundle and inspect |
| 209 | Runtime configuration diff | Compare desired vs active config | Ops tools config tab | Add sanitized config endpoint | Diff highlights changed values without secrets | Change setting and inspect diff |
| 210 | Release notes panel | Show deployed changes to admins | Ops tools releases tab | Add build metadata/release notes source | Current version and recent changes visible | Open panel after build |

## AI Automation

| # | Feature | User benefit | UI location | Backend/API changes needed | Acceptance criteria | Verification method |
|---|---|---|---|---|---|---|
| 211 | AI workflow generator | Draft automations from natural language | Workflows AI drawer | Add prompt-to-workflow endpoint with validation | Generated workflow requires user review before save | Prompt for alert workflow and inspect draft |
| 212 | AI connection classifier | Suggest protocol/tags/risk from host metadata | New connection wizard | Add classification endpoint with fallback | Suggestions shown but user must confirm | Enter host metadata and inspect suggestions |
| 213 | AI runbook generator | Create first draft docs from session history | Session detail AI action | Add summary-to-document endpoint | Draft document opens for review before save | Generate from session transcript |
| 214 | AI alert deduplicator | Reduce noisy duplicate incidents | Monitoring incidents page | Add similarity grouping service | Similar alerts grouped with reason | Seed duplicate alerts and inspect group |
| 215 | AI approval risk score | Help approvers prioritize | Approval detail | Add risk scoring endpoint with explanation | Score visible with concrete factors | Open risky approval |
| 216 | AI search query builder | Convert user intent into advanced filters | Search page | Add NL query parser with preview | Proposed query is previewed before execution | Ask for stale RDP hosts |
| 217 | AI policy advisor | Recommend secure admin policies | Admin policy page | Add policy analysis endpoint | Recommendations reference current settings | Run advisor and inspect suggestions |
| 218 | AI incident postmortem draft | Speed incident documentation | Incident detail AI action | Add incident-summary generator | Draft includes timeline, impact, actions | Create incident and generate draft |
| 219 | AI cost guard | Stop expensive AI calls early | Assistant/settings | Add usage budget enforcement | Calls over budget are blocked with clear UI | Set low budget and call assistant |
| 220 | AI evaluation harness | Test prompts and retrieval quality before rollout | Ops tools AI eval tab | Add eval dataset/run endpoints | Admin can run eval and see pass/fail metrics | Run small eval fixture |


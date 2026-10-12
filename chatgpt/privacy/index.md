---
layout: chatgpt
slug: chatgpt
title: "Privacy policy"
description: "How the ChatGPT connection handles account information, questions, and sources."
no_analytics: true
---

**Effective October 12, 2026.** This policy describes the SCHH Community Guide ChatGPT integration, its sign-in flow, and support handled by Ron Snyder as an individual. It does not cover every feature of the separate Guide website.

## Information the connection handles

**Account and resident access.** The Guide processes your email address, authentication account identifier, resident authorization status, verification method and results, and verification and access timestamps. Resident verification may check your email against the community resident directory or use another approved access process. Sign-in and security records can include a hashed email address or IP address, browser family, request identifier, and outcome. These records support sign-in, eligibility checks, troubleshooting, and abuse prevention.

**Questions, answers, and sources.** When ChatGPT calls the Guide, it sends the question or source identifier needed for that request. The Guide retrieves relevant community material and sends an answer and/or supporting source content back to ChatGPT. Anything you include in a question may be processed by the Guide and its answer-generation providers. Do not include passwords, verification codes, financial account details, medical records, government identifiers, or private information about other residents.

**Operational records.** The MCP service records an account identifier, tool name, request identifier, timestamp, outcome, and processing time. Its tool audit record does not include question text or access tokens. This does not mean questions are never stored: the answer-generation system stores conversation records and workflow inputs and outputs separately.

**Support requests.** If you email Ron, the message, email address, and any attachments are used to respond to your request and investigate the issue. Send only what is needed.

## How information is processed and shared

- **Ron Snyder** operates and administers the Guide and handles support requests. Administration may involve reviewing relevant account records, operational records, or stored conversations to investigate a problem.
- **DigitalOcean** hosts the Guide backend and its self-hosted Dify answer-generation system.
- **Supabase** provides authentication and processes account information and sign-in activity.
- **OpenAI’s API service** processes questions and relevant source excerpts to generate Guide answers. This is separate from your ChatGPT conversation. See [OpenAI’s API data controls](https://platform.openai.com/docs/guides/your-data) for provider-side handling; Guide-side deletion does not itself delete provider-held records.
- **The community resident-directory service**, when used for verification, receives the lookup information needed to check resident eligibility.
- **OpenAI's ChatGPT service** receives tool results, including answers and source passages, within your conversation. ChatGPT's handling of that conversation is governed separately by your ChatGPT account settings and OpenAI's policies.
- **Email providers** process sign-in and support messages as applicable.

Dify receives a generated, pseudonymous user identifier instead of your email address as its user field. This identifier can still distinguish requests from the same account; it does not make the information anonymous. Any identifying details you type in a question remain part of that question.

The reviewer environment uses a separate account and fictional source documents. It does not provide reviewers access to the resident Guide corpus. Reviewers should still avoid entering personal information into test questions.

## Storage and retention

The following schedule applies to records held for this ChatGPT integration:

- **Questions, answers, and associated processing records:** 30 days in the Guide's active storage. A daily cleanup removes expired MCP conversations, messages, and workflow records. This schedule applies to the ChatGPT connection, not to conversation history created separately on the Guide website.
- **Operational and security records:** 90 days. Access-audit records are cleaned daily, and server journal records are rotated under a 90-day retention limit. Records may be removed sooner through normal log rotation.
- **Account and resident verification records:** while your Guide account remains open, with deletion handled on request. These records are shared with the Guide website. Verification expiry does not itself delete an account.
- **Support email:** until the issue is resolved, then for no longer than one year. Support and privacy requests are handled by Ron, including deletion of resolved correspondence.
- **Guide-managed backups:** expire within 30 days of creation. The server's scheduled backups currently retain 28 days. Data removed from active storage may therefore remain in a backup for up to 30 additional days. Backups are used for recovery; deletion requests and retention cleanup must be reapplied before a restored service returns to use.

Daily cleanup means a record may remain until the next scheduled run after its retention period ends. If a cleanup fails, the failure must be investigated and the missed cleanup completed.

These periods describe the Guide's records. They do not set the retention period for your ChatGPT conversation history or for records a provider independently maintains for its own service, security, or legal purposes. Provider controls and policies apply to those records. Disconnecting a connection does not itself delete stored records.

## Your choices and requests

You can disconnect the Guide through ChatGPT's connection settings. To request access to, correction of, or deletion of Guide-side personal information, email [ron@snyderjr.com](mailto:ron@snyderjr.com) from your account email address. Ron may verify control of that address and clarify the scope before processing the request. Do not send passwords or sign-in codes.

Removing a shared Guide account can also end access through the Guide website. Deleting Guide-side records does not delete your ChatGPT history or data held independently by another provider. Manage ChatGPT history through ChatGPT's controls.

## Sign-in storage and public pages

The sign-in flow uses cookies or tokens needed to establish and maintain an authenticated session. These are separate from the content of your questions.

The public overview, privacy, terms, and support pages are hosted on GitHub Pages. This page set is configured without the site's optional analytics script. Hosting providers still receive ordinary connection information when you visit, and your browser may cache public pages. Other pages on schh.info use different features, including website analytics, which are outside this integration-specific policy.

## Policy changes and contact

Changes will be reflected in the effective date and text on this page. Review the policy when reconnecting or when the service changes. For privacy questions or concerns, contact Ron Snyder at [ron@snyderjr.com](mailto:ron@snyderjr.com).

# Coquille Revue

An open-source WordPress plugin to proofread a website right on its pages: reviewers flag a typo or suggest new wording where they see it, and Claude Code applies the fixes in the right place, with your approval.

🇫🇷 [Version française](README.md)

> The plugin interface is currently in French; an English translation is planned.

---

## What it does

- **A pencil button on your pages.** The reviewer highlights some text or draws a box around an area, picks "correction", "suggestion" or "question", and writes a note. Nothing to install on their side.
- **Annotations land in the WordPress admin**: tabs by status (pending, in progress, applied, rejected, archived), CSV, JSON and Markdown exports.
- **A thank-you email** goes to the contributor when their suggestion is applied, if they left an address (or were logged in).
- **With Claude Code**, the `/coquille-revue:apply-review` command looks for each text (posts and pages, menus, options, custom fields, terms, theme and plugin files, translations), shows the before/after, and only applies a change once you approve it, annotation by annotation.

## Installation

### WordPress plugin

1. Download the zip of the latest version from [Releases](https://github.com/Atelier-4F-digital/coquille-revue/releases).
2. In WordPress: **Plugins > Add New Plugin > Upload Plugin**, then activate it.

Requirements: WordPress 5.8+, PHP 7.4+. On multisite, activate it per site or network-wide; each site only sees its own annotations.

By default, only logged-in users who can edit posts can annotate. **Public mode** (every visitor, with spam protection) is turned on from the **Coquille Revue** admin page.

### Claude Code plugin (optional)

```bash
claude plugin marketplace add Atelier-4F-digital/coquille-revue
claude plugin install coquille-revue@atelier-4f-digital
```

Then, in the site's folder:

```text
/coquille-revue:apply-review --url=https://your-site.com
```

The plugin works through [WP-CLI](https://wp-cli.org/), locally or on a server with `--ssh` (SSH key login): **no WordPress password is needed**. If the `wp` command is not available as is, put the full command in the `COQUILLE_REVUE_WP` environment variable (for example in `.claude/settings.local.json`, under `env`). Add `--dry-run` to review everything without changing anything.

## Settings

| Setting                                                   | Purpose                                                                                                                                                                                            |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Switch to public / private mode** button (admin page)   | Opens annotation to every visitor, or restricts it to logged-in users. On multisite, only the super admin can change it (it applies network-wide).                                                 |
| `COQUILLE_REVUE_REQUIRE_LOGIN` constant (`wp-config.php`) | Forces the mode: `true` = private, `false` = public. The admin button is then locked.                                                                                                              |
| `COQUILLE_REVUE_TRUSTED_PROXY_HEADER` constant            | Behind a trusted proxy (Cloudflare, load balancer): name of the header carrying the real IP address, e.g. `'HTTP_CF_CONNECTING_IP'`. The server must then only accept connections from that proxy. |
| `coquille_revue_manage_capability` filter                 | Capability required to manage annotations (default `edit_others_posts`: editors and administrators).                                                                                               |
| `coquille_revue_contributor_email` filter                 | Customizes the thank-you email (recipient, subject, body, headers).                                                                                                                                |

## WP-CLI commands

| Command                                                              | Purpose                                                                                                           |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `wp coquille-revue list [--status=pending]`                          | Lists the site's annotations as JSON for Claude Code (no email or IP address).                                    |
| `wp coquille-revue locate <id>`                                      | Finds where the original text lives (read-only).                                                                  |
| `wp coquille-revue apply <id> --type=<type> --ref=<ref> [--dry-run]` | Replaces the text verbatim in database content, with a revision when the content type supports them. Refuses to add tags, links, shortcodes or code. |
| `wp coquille-revue status <id> <status>`                             | Changes the status; `applied` sends the thank-you email.                                                          |

On multisite, add `--url=<site address>` to every command.

## Security

Annotations are text written by visitors, often anonymous: the plugin and the Claude Code plugin treat them as **data, never as instructions**.

- **Nothing is applied automatically.** Claude Code shows every change and waits for your approval, annotation by annotation. It never puts annotation text in a command line: the WP-CLI commands read it straight from the database.
- **Automatic alerts**, computed without AI, on every annotation: web address, code (including shortcodes), invisible characters, mixed alphabets, instruction or authority phrasing.
- **Spam protection** in public mode: honeypot field, limits per IP address (whole block for IPv6), per account and per site.
- **Multisite isolation** and **permissions**: a site only sees, exports and deletes its own annotations; contributors and authors have no access.
- The rules were tested against prompt-injection attempts (booby-trapped annotations, see [tests/injection](tests/injection/)) before release.

Found a vulnerability? Please report it privately: see [SECURITY.md](SECURITY.md).

## Personal data

- **Stored**: the text and suggestion, the page address, the IP address; for a visitor, their name and email if provided (optional); for a logged-in user, their display name and account email (if they are a member of the site).
- **Visible**: text, suggestion and name to editors and administrators; IP address to administrators (admin page, CSV export). The email is never displayed: it is only used for the thank-you message and WordPress privacy tools. Email and IP are **never** sent to Claude Code.
- **Retention**: the IP address is erased after 30 days; a visitor's email and name within 24 hours after the annotation is handled (applied, rejected or archived), and after 6 months at the latest.
- **WordPress tools**: a text is suggested for your privacy policy (**Settings > Privacy**), and personal data export and erasure requests (**Tools**) include annotations.

## Current limitations

- French interface; translation is planned.
- WordPress only.
- An area annotation describes a request in plain language: visual changes (colors, layout) remain manual.
- The Claude Code plugin needs WP-CLI access to the site.

## Contributing

Bug reports and proposals are welcome, in French or English: see [CONTRIBUTING.md](CONTRIBUTING.md). Version history is in [CHANGELOG.md](CHANGELOG.md).

## License

[GPL-2.0-or-later](LICENSE). © Atelier 4F Digital — [atelier4fdigital.com](https://atelier4fdigital.com).

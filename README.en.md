# Coquille Revue

An open-source WordPress plugin to proofread a website right on its pages: reviewers flag a typo or suggest new wording where they see it, and Claude Code applies the fixes in the right place, with your approval.

🇫🇷 [Version française](README.md)

▶ [Try it in WordPress Playground](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/Atelier-4F-digital/coquille-revue/main/wporg-assets/blueprints/blueprint.json): a disposable WordPress in your browser, with the latest release of the plugin, public mode on and a sample page to review. Nothing is installed on your computer.

---

## What it does

- **A pencil button on your pages.** The reviewer highlights some text or draws a box around an area, picks "correction", "suggestion" or "question", and writes a note. Nothing to install on their side.
- **Annotations land in the WordPress admin**: tabs by status (pending, in progress, applied, rejected, archived), CSV, JSON and Markdown exports.
- **A thank-you email** goes to the contributor when their suggestion is applied, if they left an address (or were logged in).
- **With Claude Code**, the `/coquille-revue:apply-review` command looks for each text (posts and pages, menus, options, custom fields, terms, theme and plugin files, translations), shows the before/after, and only applies a change once you approve it, annotation by annotation.
- **Translation-ready**: interface in English and French (the site language, and in the admin each user's language), with the `languages/coquille-revue.pot` template. Emails are sent in the site language.

## Installation

### WordPress plugin

1. Download the zip of the latest version from [Releases](https://github.com/Atelier-4F-digital/coquille-revue/releases).
2. In WordPress: **Plugins > Add New Plugin > Upload Plugin**, then activate it.

Requirements: WordPress 6.2+, PHP 7.4+. On multisite, activate it per site or network-wide; each site only sees its own annotations.

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

The plugin works through [WP-CLI](https://wp-cli.org/), locally or on a server with `--ssh` (SSH key login): **no WordPress password is needed**. It needs the WordPress plugin 2.6.0 or later on the site and stops otherwise: update the WordPress plugin and the Claude Code plugin together. If the `wp` command is not available as is, put the full command in the `COQUILLE_REVUE_WP` environment variable (for example in `.claude/settings.local.json`, under `env`). Add `--dry-run` to review everything without changing anything.

## Settings

| Setting                                                   | Purpose                                                                                                                                                                                                    |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Switch to public / private mode** button (admin page)   | Opens annotation to every visitor, or restricts it to logged-in users. On multisite, only the super admin can change it (it applies network-wide).                                                         |
| `COQUILLE_REVUE_REQUIRE_LOGIN` constant (`wp-config.php`) | Forces the mode: `true` = private, `false` = public. The admin button is then locked.                                                                                                                      |
| `COQUILLE_REVUE_TRUSTED_PROXY_HEADER` constant            | Behind a trusted proxy (Cloudflare, load balancer): name of the header carrying the real IP address, e.g. `'HTTP_CF_CONNECTING_IP'`. The server must then only accept connections from that proxy.         |
| **Thank-you email** box (admin page, on by default)       | Asks visitors for their email (optional) and tells the contributor when their suggestion is applied. When off, the email is neither asked for nor stored. Per-site setting, for the site's administrators. |
| **Credit** box (admin page, off by default)               | Shows “Coquille Revue plugin · by Atelier 4F Digital” and a link in the information popover of the pencil button. Per-site setting, for the site's administrators.                                                 |
| `coquille_revue_manage_capability` filter                 | Capability required to manage annotations (default `edit_others_posts`: editors and administrators).                                                                                                       |
| `coquille_revue_contributor_email` filter                 | Customizes the thank-you email (recipient, subject, body, headers).                                                                                                                                        |
| `coquille_revue_notify_contributor` filter                | Sends the thank-you email or not, annotation by annotation (`$enabled`, `$row`).                                                                                                                           |
| `coquille_revue_load_overlay` filter                      | Return `false` to keep the review interface off a page.                                                                                                                                                    |
| `coquille_revue_cli_writable_options` filter              | Options that `wp coquille-revue apply` may change (default `blogname`, `blogdescription`, `widget_*`, `theme_mods_*`, `options_*`).                                                                        |

## WP-CLI commands

| Command                                                              | Purpose                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wp coquille-revue list [--status=pending]`                          | Lists the site's annotations as JSON for Claude Code (no email or IP address), with the plugin version (`_meta.plugin_version`).                                                                                                                                                                                           |
| `wp coquille-revue locate <id>`                                      | Finds where the original text lives (read-only).                                                                                                                                                                                                                                                                           |
| `wp coquille-revue apply <id> --type=<type> --ref=<ref> [--dry-run]` | Replaces the text verbatim in database content, with a revision when the content type supports them. Refuses to add tags, links, shortcodes, code, hidden characters, and the characters `` \ < > & { } ` `` that are not in the original text. Options: `--field=<field>`, `--text-file=<file>` (approved text that differs from the suggestion, in a `.txt` file of the `.coquille-revue` folder), `--all` (every occurrence), `--alerts-reviewed` (alerts reviewed). |
| `wp coquille-revue status <id> <status>`                             | Changes the status; `applied` sends the thank-you email.                                                                                                                                                                                                                                                                   |

On multisite, add `--url=<site address>` to every command. Help texts, messages and JSON keys of the commands are in English, whatever the site language.

## Security

Annotations are text written by visitors, often anonymous: the plugin and the Claude Code plugin treat them as **data, never as instructions**.

- **Nothing is applied automatically.** Claude Code shows every change and waits for your approval, annotation by annotation. It never puts annotation text in a command line: the WP-CLI commands read it straight from the database.
- **Automatic alerts**, computed without AI, on every annotation: web address, code (including shortcodes), invisible characters, mixed alphabets, instruction or authority phrasing in French and English, a whole added sentence (at least 6 words that are not in the original text), added structure characters (`` \ < > & { } ` " % = ``). In the exports they are fixed codes (`web_address`, `code_or_command`, `invisible_characters`, `mixed_scripts`, `instruction_or_authority`, `long_addition`, `added_symbols`, and `unreadable_text` for a text the checks cannot read).
- **Instructions for Claude Code in fixed English**: they never go through translations, which therefore cannot weaken them.
- **Spam protection** in public mode: honeypot field; per IP address (whole /64 block for IPv6), at most 5 submissions in 5 minutes and 10 per hour; per account, 60 in 5 minutes; for the site, 30 anonymous submissions per hour.
- **Thank-you email**: a generic message (site name, date, link to the home page), with none of the text typed by the visitor; at most 1 per address per day, and 20 per site per day.
- **Multisite isolation** and **permissions**: a site only sees, exports and deletes its own annotations; contributors and authors have no access.
- The rules are tested with a prompt-injection kit (booby-trapped annotations, see [tests/injection](tests/injection/)), to be replayed before each release.

Found a vulnerability? Please report it privately: see [SECURITY.md](SECURITY.md).

## Personal data

- **Stored**: the text and suggestion, the page address, the IP address; for a visitor, their name and email if provided (optional); for a logged-in user, their display name and account email (if they are a member of the site and the thank-you email is on).
- **Visible**: text, suggestion and name to editors and administrators; IP address to administrators (admin page, CSV export). The email is never displayed: it is only used for the thank-you message and WordPress privacy tools. Email and IP are **never** sent to Claude Code.
- **Retention**: the IP address is erased after 30 days; a visitor's email and name within 24 hours after the annotation is handled (applied, rejected or archived), and after 6 months at the latest.
- **WordPress tools**: a text is suggested for your privacy policy (**Settings > Privacy**), and personal data export and erasure requests (**Tools**) include annotations.

## Good to know

- **Keyboard shortcut**: <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> (<kbd>Option</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> on Mac) turns review mode on and off, for logged-in users. With the keyboard alone: in review mode, select the text (caret browsing, <kbd>F7</kbd>), then press <kbd>Enter</kbd>.
- **Caching and optimization**: purge the page cache after an update. If a tool delays or combines scripts, exclude `coquille-revue`. With a strict Content Security Policy (CSP), only the small configuration script written in the page needs a nonce (`wp_inline_script_attributes` filter); without it, the pencil button is not shown.
- **REST API** (`coquille-revue/v1`): `POST /annotation` to submit; `GET /annotations` (paginated: `per_page`, 100 at most, and `page`; totals in the `X-WP-Total` and `X-WP-TotalPages` headers; `created_at` and `applied_at` in the site time zone, and in UTC in `created_at_gmt` and `applied_at_gmt`) and `PATCH /annotation/{id}/status`, for the users who manage annotations.
- **Uninstall**: deactivating the plugin keeps everything; deleting it from the **Plugins** screen removes the annotations table, the settings and the scheduled tasks, on every site of the network.

## Current limitations

- WordPress only.
- An area annotation describes a request in plain language: visual changes (colors, layout) remain manual.
- The Claude Code plugin needs WP-CLI access to the site.

## Contributing

Bug reports and proposals are welcome, in French or English: see [CONTRIBUTING.md](CONTRIBUTING.md). Version history is in [CHANGELOG.md](CHANGELOG.md).

## License

[GPL-2.0-or-later](LICENSE). © Atelier 4F Digital — [atelier4fdigital.com](https://atelier4fdigital.com).

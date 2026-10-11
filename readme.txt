=== Coquille Revue ===
Contributors: atelier4fdigital
Tags: proofreading, review, annotations, feedback, editorial
Requires at least: 6.2
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 2.6.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Reviewers highlight text or frame an area on your pages and leave a correction, suggestion or question, stored in WordPress.

== Description ==

"Coquille" is French for a typo. Coquille Revue lets people proofread your site right on its public pages.

A pencil button floats on every page. A reviewer turns on review mode, selects some text or drags a box around an area, picks the kind of remark (correction, suggestion or question), types it and presses Enter. The annotation is stored in your WordPress database with the page address and the position of the text, and your team processes it from the admin page.

= Who can annotate =

* **Private mode (default):** only logged-in users who can edit posts (contributors and above).
* **Public mode:** any visitor. An administrator (the network administrator on multisite) switches it on from the admin page, or locks the mode in `wp-config.php` with `COQUILLE_REVUE_REQUIRE_LOGIN`. Anonymous submissions go through anti-spam protection: a honeypot field, at most 5 submissions per IP address in 5 minutes and 10 per hour (per /64 block for IPv6), and at most 30 anonymous submissions per hour for the site.

= Processing annotations =

* Admin page with one tab per status (pending, in progress, applied, rejected, archived), 50 annotations per page, and one-click status changes.
* **Alerts**, shown under each suggestion, flag annotations that need a careful look before anything is applied: web addresses, code or commands, invisible characters, mixed alphabets inside a word, wording that gives instructions or claims authority, a whole sentence added to the original text, and added structure characters such as quotes or braces. Alerts are computed by simple rules inside WordPress, without any AI.
* Exports of the current tab as CSV (spreadsheet), JSON or Markdown.
* Optional thank-you email (per site, on by default): when an annotation is marked as applied, its author receives a short generic message with the site name, the date and a link to the home page, never the text they typed. At most one email per address per day and 20 per site per day.
* A digest email tells the site administrator about new annotations, at most once every 15 minutes.
* WP-CLI commands `wp coquille-revue list|locate|apply|status`: `locate` finds where the original text is stored (posts, menus, options, custom fields, terms, theme and plugin files, translations); `apply` replaces it word for word in the database and refuses to add code, tags, links, shortcodes or hidden characters. Help texts, messages and JSON keys are in English.

= Apply corrections with Claude Code (optional) =

This plugin does not call any AI service or run any AI model. If you use Claude Code, Anthropic's coding assistant, on your computer, a separate companion plugin for Claude Code, distributed on GitHub and not included in this plugin, reads the annotations through WP-CLI, shows you each change before and after, and applies only what you approve, one annotation at a time. See https://github.com/Atelier-4F-digital/coquille-revue

= Multisite =

Activate the plugin per site or network-wide. Each site only sees, exports and deletes its own annotations.

= Languages =

The interface is in English and French (a complete French translation is included), and ready for other translations: visitors see the site language, administrators their own language, and emails are sent in the site language. The rules given to Claude Code, the alert codes and the WP-CLI texts stay in English and are never translated, so that no translation can change what Claude Code reads.

= For developers =

* Filters: `coquille_revue_manage_capability` (who manages annotations, `edit_others_posts` by default), `coquille_revue_load_overlay` (return `false` to hide the review button on a page), `coquille_revue_notify_contributor` (send the thank-you email or not, per annotation), `coquille_revue_contributor_email` (customize that email), `coquille_revue_cli_writable_options` (options that `wp coquille-revue apply` may change).
* Constants for `wp-config.php`: `COQUILLE_REVUE_REQUIRE_LOGIN` (lock private or public mode), `COQUILLE_REVUE_TRUSTED_PROXY_HEADER` (header that holds the visitor IP address behind a trusted proxy, for example `HTTP_CF_CONNECTING_IP`).
* REST API under `coquille-revue/v1`: `POST /annotation` (submit), `GET /annotations` and `PATCH /annotation/{id}/status` (for users who manage annotations).

== Privacy ==

Coquille Revue stores annotations in your own WordPress database. It sends nothing to any external service and makes no request to another site. The only outgoing request, from the WP-CLI `locate` command, loads the annotated page from your own site.

What is stored with each annotation:

* the selected text, the remark, the page address (without query string or anchor), the position of the text in the page and the IP address of the submitter;
* for a visitor: the name and the email address, if they choose to give them (the email field is only shown when the thank-you email is on);
* for a logged-in user: their display name, and the email address of their account if they are a member of the site and the thank-you email is on.

Who can see it: the text, the remark and the name are visible to the users who manage annotations (editors and above by default). The IP address is visible to administrators only (admin page and CSV export). The email address is shown nowhere: it is only used for the thank-you email and by the WordPress personal data tools. Neither the email nor the IP address is included in the REST API, the JSON and Markdown exports or the WP-CLI output.

How long: IP addresses are deleted after 30 days. A visitor's name and email address are deleted within a day of the annotation being processed (applied, rejected or archived), and after 6 months at the latest. Annotations of a deleted site are deleted.

The plugin suggests a privacy policy text (Settings > Privacy) and supports the WordPress personal data export and erasure tools.

If you use the optional Claude Code companion, Claude Code reads the text, the remark and the author name of the annotations through WP-CLI on your computer and sends them to Anthropic as part of your conversation. Email and IP addresses are never part of what it reads.

== Installation ==

1. In your WordPress admin, go to Plugins > Add New Plugin, search for "Coquille Revue", then install and activate it (on multisite: activate it per site or network-wide).
2. Open the Coquille Revue page in the admin menu. The plugin starts in private mode: logged-in users who can edit posts already see the pencil button on your pages.
3. To let any visitor annotate, switch to public mode on the same page. Behind a proxy or a CDN such as Cloudflare, define `COQUILLE_REVUE_TRUSTED_PROXY_HEADER` in `wp-config.php` so that anti-spam limits use the real visitor IP address.
4. Still on that page, an administrator can turn the thank-you email off and the public credit on.

== Frequently Asked Questions ==

= Does the plugin send data to a third party? =

No. Annotations stay in your WordPress database, and the plugin makes no request to an external service.

= Does it use AI? =

No. The alerts are simple text rules computed in WordPress. Applying corrections with Claude Code is optional and happens outside WordPress, with a companion plugin for Claude Code distributed separately on GitHub.

= Can a correction be applied automatically? =

No. Statuses are changed by hand, and the WP-CLI `apply` command refuses annotations with alerts unless you have reviewed them.

= Does it work with page caching? =

Yes. Pages served to visitors who are not logged in contain no security token, so a cached page keeps working. Purge the page cache after updating the plugin, and exclude `coquille-revue` from script delaying or combining.

= Does it work with a strict Content Security Policy? =

Yes. On public pages, styles and scripts are files loaded by WordPress; only the small inline configuration script needs a nonce (`wp_inline_script_attributes` filter). Without that nonce, the pencil button is simply not shown. The admin page adds one small inline script (the confirmation before "Applied"), covered by the same filter.

= Can I use a keyboard? =

Yes. Logged-in users can toggle review mode with Alt+Shift+C. In review mode, select text with the keyboard (caret browsing, F7 in most browsers) and press Enter to open the remark bubble.

= What happens when I delete the plugin? =

Deactivating keeps everything. Deleting the plugin from the Plugins screen removes the annotations table, the plugin settings and its scheduled tasks, on every site of a network.

== Screenshots ==

1. Review mode on a public page: selected text and the remark bubble.
2. An area framed on the page, with its remark.
3. The information popover of the pencil button.
4. The admin page: annotations by status, alerts, status buttons and exports.
5. On a phone: the remark bubble stays above the virtual keyboard.
6. The thank-you email received by a contributor.

== Changelog ==

= 2.6.0 =

Breaking changes:

* WP-CLI and exports use English names, with no alias for the 2.5.0 ones: `apply` options `--all`, `--alerts-reviewed`, `--text-file` and `--field`; JSON keys `_warning`, `alerts`, `found_on_page`; alert codes such as `web_address` or `instruction_or_authority`; source codes `logged_in_user` and `anonymous_unverified`. Update the Claude Code companion plugin to 2.6.0 at the same time: it stops on an older export.
* The public credit is off by default.
* Requires WordPress 6.2 or later.
* The keyboard shortcut is now Alt+Shift+C (Option+Shift+C on Mac), for logged-in users only. Ctrl+Shift+R is no longer taken over.
* REST API: every field is validated (type, length, allowed values); a wrong type now returns a 400 error. `PATCH /annotation/{id}/status` requires `status`, and `GET /annotations` is paginated (`per_page`, `page`).
* WP-CLI: `apply --type=option` only changes text options of the site (`blogname`, `blogdescription`, `widget_*`, `theme_mods_*`, ACF `options_*`, extendable with a filter).
* The thank-you email is a generic message, sent with the WordPress default sender.

Other changes:

* Translation-ready, with a complete French translation. The thank-you and digest emails are sent in the site language.
* Per-site settings for the thank-you email (on by default) and the public credit (off by default).
* Admin page: pagination, alerts under each suggestion, confirmation before a status change that sends a thank-you email.
* Public styles and scripts are files loaded by WordPress, only where review mode is available.
* Accessible review interface and full touch-screen support.
* Security: hourly limit per IP address, safer exports, wider detection of links and instructions (French and English).
* Uninstalling removes the plugin data.

= 2.5.0 =

* First public release, on GitHub.

== Upgrade Notice ==

= 2.6.0 =

Requires WordPress 6.2. WP-CLI options and export keys are now in English: update the Claude Code companion plugin to 2.6.0 too. The keyboard shortcut becomes Alt+Shift+C and the REST API validates every field. Purge your page cache after updating.

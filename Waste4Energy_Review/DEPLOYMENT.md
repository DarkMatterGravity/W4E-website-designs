# Manual GoDaddy deployment

This is a review build. No live hosting changes have been made.

1. Confirm the GoDaddy plan supports PHP 8+ and outbound `mail()` delivery. Static-only hosting cannot execute the supplied contact handler. Other plans require an appropriate backend before the form can deliver email.
2. Enter the confirmed receiving and sending email addresses in a copy of `server-config.example.php`, named `server-config.php`. Use a sender on the website's own domain accepted by the host. These values have intentionally not been guessed. Environment variables `W4E_CONTACT_TO` and `W4E_CONTACT_FROM` are an alternative.
3. Back up the existing live site. Upload the contents of the exported ZIP to the website's document root (`public_html` on cPanel), preserving `assets/` and `.htaccess`. Do not upload the source directory, local editor, `node_modules`, tests, or configuration backups. Remove `DEPLOYMENT.md` from the public root after following it.
4. Place the configured `server-config.php` next to `contact.php`. `.htaccess` denies direct web access to configuration files and disables directory listing. If the host rejects an Apache directive, resolve that with the host rather than exposing configuration files.
5. Use HTTPS. Test both request types from the actual website, confirm mail arrives in the correct inbox and reply goes to the submitter. A success response means the hosting mail service accepted the message; inbox arrival must be verified separately. Static local preview intentionally reports failure rather than claiming email was sent.
6. Check all four pages and the form on a phone. Remove `robots.txt` when the approved public website should be indexable; it disallows crawling during review. A robots directive does not make a review private—protect the review location with hosting access controls if necessary.

The contact handler validates fields and email addresses, rejects header injection, checks same-origin submissions, includes a honeypot and minimum completion time, and limits successful submissions to one per IP per minute. It returns a visible failure when configuration or mail service is unavailable. No visitor messages are stored in this repository. Do not commit `server-config.php` or credentials.

The content manager remains on your computer. Future edits: run `npm run dev`, save in `/admin/`, export again, and manually replace the generated public files. Preserve the server's configured `server-config.php` when uploading future exports.

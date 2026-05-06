# Upload-Hardening

> Stand: Mai 2026. 7-Schichten-Validierung gegen polyglotte Datei-Uploads (RCE, Stored-XSS via SVG, MIME-Sniffing-Bypass).

## Bedrohungsmodell

Ein Angreifer mit gültigem Account versucht:
1. PHP-Datei mit gefälschtem `Content-Type: image/jpeg` hochzuladen → RCE
2. SVG mit `<script>` → Stored-XSS, Cookie-Diebstahl
3. Polyglot: GIF89a-Header + PHP-Payload → führt PHP aus, sieht für `getimagesize()` aber wie Bild aus
4. Doppel-Extension `evil.php.jpg` → Apache-Misconfig würde es als PHP rendern
5. Riesige Datei → DoS

## Validierungs-Pipeline (`functions.php` → `eb_handle_upload`)

```
1. Upload-Error-Code            ($_FILES['error'] === 0?)
2. Größe ≤ 5 MB                 (vor Lesen)
3. Magic-Bytes via finfo        (NICHT $_FILES['type'] – client-supplied)
4. Allowlist                    (image/jpeg|png|webp|gif)
5. Doppel-Extension-Block       (.php, .phtml, .phar, .pl, .py, .cgi, .sh,
                                 .htaccess, .exe, .bat, .cmd, .dll, .svg,
                                 .html, .htm, .js)
6. wp_check_filetype_and_ext    (zweite Schicht via WP-Core)
7. wp_handle_upload mit
   explizitem mimes-Override    (überschreibt WP-Default-Allowlist)
8. getimagesize() Re-Check      (blockt Polyglots; failed → unlink)
```

## Apache-Layer (`.htaccess`)

Selbst wenn jede PHP-Schicht versagt, darf Apache nichts ausführen:

```apache
<IfModule mod_rewrite.c>
  RewriteRule ^wp-content/uploads/.*\.(php|phtml|phar|pl|py|cgi|sh|asp|aspx|jsp|exe|bat|cmd|svg|html?|js)$ - [F,L,NC]
  RewriteRule ^uploads/.*\.(php|phtml|phar|pl|py|cgi|sh|asp|aspx|jsp|exe|bat|cmd|svg|html?|js)$ - [F,L,NC]
</IfModule>

<Directory "wp-content/uploads">
  <FilesMatch "\.(php|phtml|phar|pl|py|cgi|sh|asp|aspx|jsp|exe|bat|cmd)$">
    Require all denied
  </FilesMatch>
  <FilesMatch "\.svg$">
    Header set Content-Disposition "attachment"
    Header set Content-Security-Policy "default-src 'none'; style-src 'unsafe-inline'; sandbox"
  </FilesMatch>
  Header set X-Content-Type-Options "nosniff"
</Directory>
```

## Größen-/Format-Limits

| Format | Max-Größe | Max-Auflösung |
|---|---|---|
| JPEG | 5 MB | (kein Limit serverseitig, GD parst) |
| PNG | 5 MB | dito |
| WebP | 5 MB | dito |
| GIF | 5 MB | dito |
| SVG | **abgelehnt** | — |

## Zukünftig (optional)

- ClamAV-Scan via `clamscan` aufrufen, falls Hosting es erlaubt
- Bild-Re-Encode via Imagick (löscht Metadaten + EXIF inkl. GPS)
- Server-side Resize auf max 2400×2400 px (spart Storage/Bandbreite)

Siehe [[Backend/Upload-Handler]], [[Security/CSP-Headers]].

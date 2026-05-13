# Deployment Environment

This project uses two environment layouts:

## Local Development

- `.env`
  - Local runtime basics.
  - Keep `DATABASE_URL` and `SESSION_SECRET` here.
- `.env.local`
  - Local-only integration secrets.
  - Keep Feishu credentials and table identifiers here.
  - This file is ignored by Git and must not be committed.

The Feishu sync code loads `.env` and then `.env.local`. Existing process
environment values win, so duplicate keys should be avoided.

## Production

Production uses one combined file:

- `/www/wwwroot/qygh.vickyching.com/.env`

This production `.env` should contain the union of local `.env` and `.env.local`:

- `DATABASE_URL`
- `SESSION_SECRET`
- `REGISTRATION_INVITE_CODE`
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `FEISHU_BITABLE_APP_TOKEN`
- `FEISHU_BITABLE_TABLE_ID`
- `FEISHU_BITABLE_VIEW_ID`

Optional Feishu field overrides may also live in production `.env` when the
Bitable field names differ from the code defaults:

- `FEISHU_FIELD_SERIAL_NUMBER`
- `FEISHU_FIELD_SCHOOL`
- `FEISHU_FIELD_SCHOOL_OTHER`
- `FEISHU_FIELD_QUOTE`
- `FEISHU_FIELD_CONSENT`
- `FEISHU_FIELD_SUBMITTED_AT`
- `FEISHU_FIELD_IMAGES`
- `FEISHU_MAX_IMAGE_DOWNLOADS`

`REGISTRATION_INVITE_CODE` accepts one invite code, or multiple comma-separated
codes. Production registration fails closed when this value is missing.

## Sync Procedure

For one-off production syncs, merge local `.env` and `.env.local` locally and
upload the merged result directly to the server over SSH/SCP. Do not commit
real env files, and do not send secrets through GitHub or any third-party
paste/storage service.

Before replacing production `.env`, back it up under `/www/backup/`. After
replacement, set file permissions to `600` and restart `qygh-next`.

## Runtime Uploads

Feishu sync writes downloaded assets into:

- `/www/wwwroot/qygh.vickyching.com/public/uploads/`

Production must serve `/uploads/` directly from Nginx instead of relying on
Next.js static handling. Next.js can return cached 404 responses for files that
are created after the server process has already started.

The `qygh.vickyching.com` Nginx server block should include this rule before the
catch-all proxy location:

```nginx
location ^~ /uploads/ {
    alias /www/wwwroot/qygh.vickyching.com/public/uploads/;
    expires 30d;
    add_header Cache-Control "public, max-age=2592000";
    access_log off;
}
```

After changing this rule, run `nginx -t` and reload Nginx.

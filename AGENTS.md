# Project safety rules

## Secrets and environment files

- Never stage, commit, push, paste, print, or log secrets, passwords, tokens, private keys, cookies, or service-account credentials.
- Never commit any `.env*` file. The only permitted exception is `.env.example`, and it must contain empty values or unmistakable placeholders only—never working credentials.
- Keep real local credentials in `.env.local` and production credentials in the hosting provider's encrypted environment settings.
- Do not add `NEXT_PUBLIC_` to any value that must remain secret; values with that prefix are exposed to browsers.
- Before every commit, inspect the staged file list and diff for environment files and secret-like values. If any secret may have been committed or exposed, stop, remove it safely, and rotate the credential before continuing.
- Do not weaken or remove the `.gitignore` rules covering `.env*`, private keys, or other credential files.

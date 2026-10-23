# Security Remediation Report

## Hardcoded Session Cookie Secret

**Date raised:** 9 October 2026 (CNSME security review)
**Date remediated:** 19 October 2026
**Component:** `src/config/config.js`
**Severity:** High (credible, conditionally exploitable)
**Status:** Resolved

---

## 1. Summary

A security review identified a hardcoded fallback secret in the application's
configuration file, used to encrypt and sign user session cookies. Because the
value was committed to source control, it was visible to anyone with access to
the repository, undermining the confidentiality and integrity guarantees the
secret is meant to provide.

---

## 2. Issue Detail

### What was found

In `src/config/config.js`, a constant was defined and reused as the **default
value** for the session cookie encryption/signing password:

```js
const longpass = 'the-password-must-be-at-least-32-characters-long'
```

This value was assigned as the `default` for the `session.cookie.password`
configuration key, which is consumed by the `@hapi/yar` session plugin
(`src/server/common/helpers/session-cache/session-cache.js`) to encrypt and
sign every user's session cookie using the `iron` algorithm.

The same hardcoded value was also duplicated across two additional, unused
configuration keys (`cookiePassword`, `sessionCookiePassword`), which were
never referenced anywhere else in the codebase.

### Why this matters

The session cookie password is the cryptographic key that:

- **Encrypts** session cookie contents so they cannot be read by the end user
  or an attacker intercepting traffic.
- **Signs** the cookie so the server can detect any tampering.

If an environment did not supply a real secret via the
`SESSION_COOKIE_PASSWORD` environment variable, the application would silently
fall back to the hardcoded value above. Because this value was committed to
version control, anyone with repository access (including past contributors)
effectively already possessed the key.

### Potential impact if exploited

An attacker in possession of this key could:

- **Decrypt** session cookie contents for any user of the application.
- **Forge** a validly encrypted and signed session cookie from scratch,
  potentially bypassing session-based logic that trusts cookie contents.

Severity was assessed as **credible** because this is a legitimate
CWE-798 (_Use of Hard-coded Credentials_) finding. Full exploitability
depended on whether each deployed environment (dev/test/production) already
overrode the fallback via a properly configured
`SESSION_COOKIE_PASSWORD` environment variable/secret.

---

## 3. Remediation Actions Taken

### 3.1 Removed the hardcoded fallback

The `session.cookie.password` configuration entry was changed so that it:

- No longer has a hardcoded default value.
- Is required to be supplied via the `SESSION_COOKIE_PASSWORD` environment
  variable.
- Must be at least 32 characters in length (enforced implicitly by the
  underlying encryption library's requirements).

```js
password: {
  doc: 'session cookie password - must be supplied via SESSION_COOKIE_PASSWORD env var (min 32 chars), no default is provided for security reasons',
  format: String,
  default: null,
  nullable: true,
  env: 'SESSION_COOKIE_PASSWORD',
  sensitive: true
}
```

### 3.2 Added a fail-fast startup check

The application now refuses to start if the secret is missing, rather than
silently running with an insecure default:

```js
if (!config.get('session.cookie.password')) {
  throw new Error(
    'SESSION_COOKIE_PASSWORD environment variable must be set (min 32 characters). ' +
      'No default is provided because a hardcoded session secret is a security risk.'
  )
}
```

This ensures misconfiguration is caught immediately and loudly (at deployment
or local startup time) rather than resulting in a silent, exploitable
vulnerability in a running service.

### 3.3 Removed dead/duplicate configuration

The following unused configuration entries, which referenced the same
hardcoded value but were never consumed anywhere in the application, were
removed entirely:

- `cookiePassword`
- `sessionCookiePassword`

A broader audit of the configuration schema was also carried out, cross
referencing every configuration key against actual usage in the codebase.
Several additional unused/dead configuration entries unrelated to this
specific finding were identified and removed as part of the same cleanup
(e.g. `isTest`, `isMetricsEnabled`, `redis.enabled`, `localstackEndpoint`,
`aws.s3BucketName`, `cdpUploaderUrl`, `backendApiUrl`, `analysisTypeMapping`,
`aqiePassword`), reducing overall configuration surface area and the risk of
similar issues recurring.

### 3.4 Secret generation and environment configuration

A new, cryptographically random secret (32+ bytes) was generated for local
development use, stored only in a local, git-ignored `.env` file (already
excluded via `.gitignore`), and never committed to source control.

Each deployed environment (development, test, production) must have its own,
independently generated `SESSION_COOKIE_PASSWORD` value configured via the
CDP platform's secret management service. Values must not be reused across
environments.

### 3.5 Test suite updated

The automated test suite previously relied on the application's full
configuration loading successfully. A test-only, randomly generated secret
(regenerated on every test run, never fixed or committed) was added to the
Jest setup file so that test runs do not require developers to manually
configure a local secret, while still avoiding any hardcoded value:

```js
process.env.SESSION_COOKIE_PASSWORD ??= crypto.randomBytes(32).toString('hex')
```

---

## 4. Verification

- Confirmed via full-codebase search that the removed configuration keys
  (`cookiePassword`, `sessionCookiePassword`, and the nine additional dead
  keys) were not referenced anywhere outside of their own declarations.
- Confirmed the application fails to start when `SESSION_COOKIE_PASSWORD` is
  absent, and starts successfully once a compliant value is supplied.
- Confirmed no lint or type errors were introduced by the change.
- Confirmed `.env` remains excluded from version control via `.gitignore`.

---

## 5. Outstanding Actions / Recommendations

1. **Confirm and rotate secrets in all live environments.** Platform/ops team
   to confirm `SESSION_COOKIE_PASSWORD` is set via the CDP secret manager in
   every environment, and rotate the value given the previous hardcoded
   fallback may have been in use.
2. **Consider git history review.** If this repository has been accessible
   outside the immediate team, consider whether historical exposure of the
   old hardcoded value warrants a git history rewrite, in line with
   organisational security policy.
3. **Add automated secret-scanning to CI** to detect similar hardcoded
   credential patterns before they reach the main branch in future.

---

## 6. Sign-off

| Role              | Name | Date |
| ----------------- | ---- | ---- |
| Developer         |      |      |
| Reviewer          |      |      |
| Security sign-off |      |      |

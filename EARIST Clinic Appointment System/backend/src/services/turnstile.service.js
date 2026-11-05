/**
 * Canonical Cloudflare Turnstile Verification Service
 * Conforms to Cloudflare Turnstile specification & canonical siteverify implementation:
 * https://developers.cloudflare.com/turnstile/spin/prompt.md
 */

const CLOUDFLARE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Official Cloudflare Turnstile Testing Secret Keys:
 * Always passes: 1x0000000000000000000000000000000AA
 * Always blocks: 2x0000000000000000000000000000000AA
 */
const ALWAYS_PASS_TEST_SECRET = '1x0000000000000000000000000000000AA';

/**
 * Verify a Turnstile token submitted by the client
 * @param {string} token - The cf-turnstile-response token from client
 * @param {string} remoteIp - Optional client IP (X-Forwarded-For or req.ip)
 * @param {string} expectedAction - Optional expected action name (e.g., 'booking', 'otp')
 * @returns {Promise<{ success: boolean, message?: string, hostname?: string, action?: string }>}
 */
async function verifyTurnstileToken(token, remoteIp = null, expectedAction = null) {
  const secretKey = process.env.TURNSTILE_SECRET || process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

  // Local development fallback if secret key is not set
  if (!secretKey) {
    return { success: true, mode: 'bypassed_no_secret' };
  }

  // Official Cloudflare testing secret handler
  if (secretKey === ALWAYS_PASS_TEST_SECRET) {
    return { success: true, mode: 'test_pass_key' };
  }

  // Canonical token constraints: string, non-empty, max 2048 chars
  if (typeof token !== 'string' || token.trim() === '' || token.length > 2048) {
    return {
      success: false,
      message: 'Cloudflare security challenge verification failed. Please complete the security check.'
    };
  }

  // Configured allowed hostnames from environment
  const expectedHostnames = new Set(
    (process.env.TURNSTILE_HOSTNAMES || 'e-clinic.ragetech.dev,localhost,127.0.0.1')
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean)
  );

  try {
    const formData = new URLSearchParams({
      secret: secretKey,
      response: token.trim()
    });

    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch(CLOUDFLARE_SITEVERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      signal: AbortSignal.timeout(10_000),
      body: formData
    });

    if (!response.ok) {
      throw new Error(`siteverify HTTP ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      console.warn('[Cloudflare Turnstile] Challenge rejected:', result['error-codes']);
      return {
        success: false,
        message: 'Bot verification check was not confirmed by Cloudflare. Please complete the security check and try again.',
        errorCodes: result['error-codes']
      };
    }

    // Action validation if expected action was specified
    if (expectedAction && result.action && result.action !== expectedAction) {
      console.warn(`[Cloudflare Turnstile] Action mismatch: expected "${expectedAction}", received "${result.action}"`);
      return {
        success: false,
        message: 'Security action verification mismatch. Please reload and retry.'
      };
    }

    // Hostname validation against allowed hostnames
    if (expectedHostnames.size > 0 && result.hostname && !expectedHostnames.has(result.hostname)) {
      console.warn(`[Cloudflare Turnstile] Hostname mismatch: "${result.hostname}" not in allowed list [${Array.from(expectedHostnames).join(', ')}]`);
      return {
        success: false,
        message: 'Security verification origin invalid.'
      };
    }

    return {
      success: true,
      hostname: result.hostname,
      action: result.action
    };
  } catch (err) {
    console.error('[Cloudflare Turnstile Error]:', err.message);
    return {
      success: false,
      message: 'Security verification service temporarily unreachable. Please retry.'
    };
  }
}

module.exports = {
  verifyTurnstileToken
};

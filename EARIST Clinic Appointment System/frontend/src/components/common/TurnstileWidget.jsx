import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';

// Cloudflare Turnstile Site Key for EARIST Clinic
const DEFAULT_SITEKEY = '0x4AAAAAAF0VXzBfBnj-Zx4D';

let turnstileScriptLoading = false;
let turnstileScriptLoaded = false;

function loadTurnstileScript() {
  if (turnstileScriptLoaded || (typeof window !== 'undefined' && window.turnstile)) {
    turnstileScriptLoaded = true;
    return Promise.resolve();
  }

  if (turnstileScriptLoading) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (typeof window !== 'undefined' && window.turnstile) {
          clearInterval(check);
          turnstileScriptLoaded = true;
          resolve();
        }
      }, 50);
    });
  }

  turnstileScriptLoading = true;
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="turnstile/v0/api.js"]')) {
      const check = setInterval(() => {
        if (typeof window !== 'undefined' && window.turnstile) {
          clearInterval(check);
          turnstileScriptLoaded = true;
          resolve();
        }
      }, 50);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      turnstileScriptLoaded = true;
      resolve();
    };
    script.onerror = (err) => {
      turnstileScriptLoading = false;
      reject(err);
    };
    document.head.appendChild(script);
  });
}

/**
 * Cloudflare Turnstile Widget (React 19 Native Component)
 * Conforms to Cloudflare Turnstile existing-widget specification:
 * - Single-use token handling
 * - Action tagging support (data-action)
 * - Imperative reset handle via ref
 */
export const TurnstileWidget = forwardRef(({
  siteKey = null,
  action = 'booking',
  onVerify,
  onExpire,
  onError,
  theme = 'light',
  size = 'normal',
  className = ''
}, ref) => {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const activeSiteKey =
    siteKey ||
    import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY ||
    DEFAULT_SITEKEY;

  // Expose reset imperative method to parent components
  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current && typeof window !== 'undefined' && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch (e) {
          console.warn('[Turnstile Widget] Error resetting widget:', e);
        }
      }
    },
    getWidgetId: () => widgetIdRef.current
  }));

  useEffect(() => {
    let isMounted = true;

    loadTurnstileScript()
      .then(() => {
        if (!isMounted || !containerRef.current || !window.turnstile) return;

        // Clean up previously rendered widget if any
        if (widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch (e) {}
          widgetIdRef.current = null;
        }

        try {
          const id = window.turnstile.render(containerRef.current, {
            sitekey: activeSiteKey,
            action: action || 'booking',
            theme,
            size,
            callback: (token) => {
              if (onVerify) onVerify(token);
            },
            'expired-callback': () => {
              if (onExpire) onExpire();
            },
            'error-callback': (code) => {
              console.warn('[Turnstile Widget Error Callback]', code);
              if (onError) onError(code);
            }
          });
          widgetIdRef.current = id;
          setLoading(false);
        } catch (renderErr) {
          console.error('[Turnstile Render Error]:', renderErr);
          setLoadError(true);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('[Turnstile Script Load Error]:', err);
        if (isMounted) {
          setLoadError(true);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (widgetIdRef.current && typeof window !== 'undefined' && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {}
        widgetIdRef.current = null;
      }
    };
  }, [activeSiteKey, action, theme, size]);

  return (
    <div className={`relative min-h-[65px] flex items-center justify-start ${className}`}>
      {/* Cloudflare Render Target */}
      <div ref={containerRef} className="z-10" />

      {/* Loading Placeholder */}
      {loading && !loadError && (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 py-3 px-4 rounded-xl bg-slate-50 border border-slate-200">
          <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
          <span>Verifying secure connection with Cloudflare Turnstile...</span>
        </div>
      )}

      {/* Offline / Script Load Fallback */}
      {loadError && (
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 py-3 px-4 rounded-xl bg-amber-50 border border-amber-200">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span>Turnstile check unavailable. Backup challenge active below.</span>
        </div>
      )}
    </div>
  );
});

TurnstileWidget.displayName = 'TurnstileWidget';

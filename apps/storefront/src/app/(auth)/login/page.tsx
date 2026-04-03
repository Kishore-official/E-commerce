'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Eye, EyeOff, ArrowRight,
  User, Building2, ShieldCheck,
  Truck, Lock, RotateCcw,
} from 'lucide-react';
import {
  apiClient, setTokens,
  AUTH_URLS, buildCallbackUrl,
  getTargetOriginForRole, getDefaultLandingPath,
} from '@ecommerce/ui-kit';
import { UserRole } from '@ecommerce/shared-types';
import styles from './login.module.css';

/* ─── Types ──────────────────────────────────────────────────── */
type TabType = 'customer' | 'vendor' | 'admin';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: UserRole; vendorId?: string };
}

/* ─── Role tab definitions ───────────────────────────────────── */
const TABS: { key: TabType; label: string; icon: React.ReactNode; placeholder: string }[] = [
  { key: 'customer', label: 'Customer',  icon: <User size={11} strokeWidth={1.8} />,        placeholder: 'you@example.com'   },
  { key: 'vendor',   label: 'Vendor',    icon: <Building2 size={11} strokeWidth={1.8} />,   placeholder: 'store@example.com' },
  { key: 'admin',    label: 'Admin',     icon: <ShieldCheck size={11} strokeWidth={1.8} />, placeholder: 'admin@meridian.com'},
];

/* ─── Palette tokens ─────────────────────────────────────────── */
const gold    = '#c4933f';
const nearBlk = '#0c0c0c';
const warmOff = '#faf9f6';
const muted   = 'rgba(12,12,12,0.42)';

/* ─── Main Form Component ────────────────────────────────────── */
function SignInForm({ returnUrl }: { returnUrl?: string }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [errorKey, setErrorKey] = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('customer');

  const currentTab = TABS.find(t => t.key === activeTab)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.post<{ data: LoginResponse }>('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = res.data.data;
      const role = user.role;

      let targetOrigin: string | null = null;
      let returnPath: string | undefined;

      if (returnUrl) {
        try {
          const parsed = new URL(returnUrl);
          targetOrigin = parsed.origin;
          returnPath   = parsed.pathname + parsed.search;
          if (targetOrigin === window.location.origin) targetOrigin = null;
        } catch {
          returnPath = returnUrl;
        }
      }

      if (targetOrigin) {
        const allowed = [AUTH_URLS.storefront(), AUTH_URLS.vendor(), AUTH_URLS.admin()];
        if (!allowed.includes(targetOrigin)) {
          targetOrigin = getTargetOriginForRole(role);
          returnPath   = undefined;
        }
      }
      if (!targetOrigin) targetOrigin = getTargetOriginForRole(role);

      if (targetOrigin) {
        window.location.href = buildCallbackUrl(
          targetOrigin, accessToken, refreshToken,
          returnPath || getDefaultLandingPath(role),
        );
      } else {
        setTokens(accessToken, refreshToken);
        window.location.href = returnPath || getDefaultLandingPath(role);
      }
    } catch (err: unknown) {
      let msg = 'Invalid credentials';
      if (err && typeof err === 'object' && 'response' in err) {
        const resp = (err as { response?: { status?: number; data?: { message?: string } } }).response;
        if (resp?.status === 429) {
          msg = 'Too many login attempts. Please wait a moment and try again.';
        } else {
          msg = resp?.data?.message ?? 'Invalid credentials';
        }
      }
      setError(msg);
      setErrorKey(k => k + 1);
      setLoading(false);
    }
  };

  return (
    <div
      className={styles.root}
      style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)' }}
    >

      {/* ══════════════════════════════════════════════════════════
          LEFT — DARK BRAND PANEL
      ══════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:flex-col"
        style={{
          width: '57%',
          background: nearBlk,
          padding: '52px 60px',
          position: 'relative',
          overflow: 'hidden',
          justifyContent: 'space-between',
        }}
      >
        {/* Grain texture */}
        <div className={styles.grainOverlay} />

        {/* Corner geometric decoration */}
        <svg className={styles.cornerDeco} viewBox="0 0 160 160" fill="none">
          <line x1="160" y1="0"  x2="160" y2="110" stroke="white" strokeWidth="1" />
          <line x1="50"  y1="0"  x2="160" y2="0"   stroke="white" strokeWidth="1" />
          <line x1="160" y1="0"  x2="90"  y2="70"  stroke="white" strokeWidth="0.5" />
          <line x1="160" y1="36" x2="124" y2="0"   stroke="white" strokeWidth="0.5" />
          <line x1="160" y1="72" x2="90"  y2="0"   stroke="white" strokeWidth="0.3" />
        </svg>

        {/* Ambient glow blobs */}
        <div className={styles.glowBottom} />
        <div className={styles.glowTop} />

        {/* ── LOGO ─────────────────────────────────────────────── */}
        <div
          className={`${styles.fadeUp} ${styles.d0}`}
          style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: 14 }}
        >
          <div style={{ position: 'relative', width: 46, height: 46, flexShrink: 0 }}>
            <svg
              className={styles.hexSpin}
              viewBox="0 0 46 46"
              fill="none"
              style={{ position: 'absolute', inset: 0 }}
            >
              <polygon
                points="23,2 41,12 41,34 23,44 5,34 5,12"
                stroke={gold} strokeWidth="1" fill="none" opacity="0.55"
              />
            </svg>
            <svg viewBox="0 0 46 46" fill="none" style={{ position: 'absolute', inset: 0 }}>
              <polygon
                points="23,9 37,17 37,29 23,37 9,29 9,17"
                stroke={gold} strokeWidth="1.5" fill="rgba(196,147,63,0.09)"
              />
            </svg>
          </div>

          <div>
            <div style={{
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              fontSize: '1.45rem',
              fontWeight: 400,
              letterSpacing: '0.32em',
              color: warmOff,
              textTransform: 'uppercase',
              lineHeight: 1,
            }}>
              MERIDIAN
            </div>
            <div style={{
              fontSize: '0.58rem',
              letterSpacing: '0.26em',
              color: gold,
              textTransform: 'uppercase',
              marginTop: 4,
              fontWeight: 500,
            }}>
              Commerce
            </div>
          </div>
        </div>

        {/* ── HERO TEXT ────────────────────────────────────────── */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div
            className={`${styles.fadeUp} ${styles.d100}`}
            style={{
              fontSize: '0.58rem',
              letterSpacing: '0.32em',
              color: gold,
              textTransform: 'uppercase',
              marginBottom: 18,
              fontWeight: 500,
            }}
          >
            Curated Excellence
          </div>

          <h1
            className={`${styles.fadeUp} ${styles.d200}`}
            style={{
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              fontSize: 'clamp(2.6rem, 3.8vw, 4.2rem)',
              fontWeight: 300,
              lineHeight: 1.08,
              color: warmOff,
              marginBottom: 24,
              letterSpacing: '-0.01em',
            }}
          >
            Discover the art<br />
            <em style={{ fontStyle: 'italic', fontWeight: 300 }}>of fine shopping</em>
          </h1>

          <p
            className={`${styles.fadeUp} ${styles.d300}`}
            style={{
              fontSize: '0.875rem',
              lineHeight: 1.85,
              color: 'rgba(250,249,246,0.5)',
              maxWidth: '330px',
              marginBottom: 40,
            }}
          >
            Thousands of verified products from the world&rsquo;s premier brands,
            delivered to your door with uncompromising care.
          </p>

          {/* Feature lines */}
          <div className={`${styles.fadeUp} ${styles.d400}`}>
            {[
              { num: '01', icon: <Truck size={13} strokeWidth={1.5} />,     text: 'Free shipping on orders above ₹11,100' },
              { num: '02', icon: <Lock size={13} strokeWidth={1.5} />,      text: 'Secure, encrypted payment processing'   },
              { num: '03', icon: <RotateCcw size={13} strokeWidth={1.5} />, text: 'Effortless 30-day returns & exchanges'   },
            ].map(item => (
              <div key={item.num} className={styles.featureLine}>
                <span style={{
                  fontSize: '0.58rem', letterSpacing: '0.15em',
                  color: gold, fontWeight: 600, minWidth: 22, flexShrink: 0,
                }}>
                  {item.num}
                </span>
                <span style={{ color: gold, opacity: 0.75, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontSize: '0.8rem', color: 'rgba(250,249,246,0.6)', lineHeight: 1.4 }}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── STATS ────────────────────────────────────────────── */}
        <div
          className={`${styles.fadeUp} ${styles.d500} ${styles.statGrid}`}
          style={{ position: 'relative', zIndex: 10 }}
        >
          {[
            { value: '50K+', label: 'Products'  },
            { value: '10K+', label: 'Customers' },
            { value: '500+', label: 'Brands'    },
          ].map((s, i) => (
            <div key={i} className={styles.statItem}>
              <div style={{
                fontFamily: 'var(--font-cormorant, Georgia, serif)',
                fontSize: '1.9rem',
                fontWeight: 300,
                color: warmOff,
                lineHeight: 1.05,
              }}>
                {s.value}
              </div>
              <div style={{
                fontSize: '0.57rem',
                letterSpacing: '0.22em',
                color: 'rgba(250,249,246,0.38)',
                textTransform: 'uppercase',
                marginTop: 5,
              }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          RIGHT — FORM PANEL
      ══════════════════════════════════════════════════════════ */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        padding: 'clamp(24px, 5vw, 48px) clamp(16px, 4vw, 32px)',
        position: 'relative',
      }}>
        {/* Gold top accent bar */}
        <div className={styles.goldTopBar} />

        {/* Mobile logo (hidden on lg) */}
        <div
          className="lg:hidden"
          style={{ marginBottom: 36, display: 'flex', alignItems: 'center', gap: 12 }}
        >
          <div style={{ position: 'relative', width: 34, height: 34, flexShrink: 0 }}>
            <svg viewBox="0 0 46 46" fill="none" style={{ position: 'absolute', inset: 0 }}>
              <polygon points="23,3 41,13 41,33 23,43 5,33 5,13" stroke={gold} strokeWidth="1.5" fill="none" />
            </svg>
            <svg viewBox="0 0 46 46" fill="none" style={{ position: 'absolute', inset: 0 }}>
              <polygon points="23,10 37,18 37,28 23,36 9,28 9,18" stroke={gold} strokeWidth="1.5" fill="rgba(196,147,63,0.08)" />
            </svg>
          </div>
          <span style={{
            fontFamily: 'var(--font-cormorant, Georgia, serif)',
            fontSize: '1.35rem',
            fontWeight: 400,
            letterSpacing: '0.28em',
            color: nearBlk,
            textTransform: 'uppercase',
          }}>
            MERIDIAN
          </span>
        </div>

        <div style={{ width: '100%', maxWidth: 364 }}>

          {/* ── FORM HEADER ──────────────────────────────────── */}
          <div className={`${styles.fadeUp} ${styles.d0}`} style={{ marginBottom: 30 }}>
            <div style={{
              fontSize: '0.58rem',
              letterSpacing: '0.3em',
              color: gold,
              textTransform: 'uppercase',
              marginBottom: 10,
              fontWeight: 500,
            }}>
              Welcome back
            </div>
            <h2 style={{
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              fontSize: '2.6rem',
              fontWeight: 300,
              color: nearBlk,
              lineHeight: 1.05,
              letterSpacing: '-0.015em',
              margin: 0,
            }}>
              Sign in to<br />
              <em style={{ fontStyle: 'italic' }}>your account</em>
            </h2>
          </div>

          {/* ── ROLE TABS ────────────────────────────────────── */}
          <div
            className={`${styles.fadeUp} ${styles.d100}`}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 32 }}
          >
            {TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`${styles.roleTab} ${activeTab === tab.key ? styles.roleTabActive : ''}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── FORM FIELDS ──────────────────────────────────── */}
          <form onSubmit={handleSubmit}>

            {/* Error alert */}
            {error && (
              <div key={errorKey} className={styles.errorBanner}>
                <span style={{
                  width: 5, height: 5,
                  borderRadius: '50%', background: '#d44',
                  flexShrink: 0, display: 'inline-block',
                }} />
                {error}
              </div>
            )}

            {/* Email */}
            <div className={`${styles.fadeUp} ${styles.d200}`} style={{ marginBottom: 26 }}>
              <label htmlFor="email" style={{
                display: 'block',
                fontSize: '0.6rem',
                letterSpacing: '0.2em',
                color: muted,
                textTransform: 'uppercase',
                marginBottom: 8,
                fontWeight: 500,
              }}>
                Email Address
              </label>
              <div className={styles.inputWrap}>
                <svg
                  style={{
                    position: 'absolute', left: 0, top: '50%',
                    transform: 'translateY(-50%)', pointerEvents: 'none',
                  }}
                  width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c0bdb7" strokeWidth="1.5"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={currentTab.placeholder}
                  required
                  autoComplete="email"
                  className={styles.inputField}
                />
              </div>
            </div>

            {/* Password */}
            <div className={`${styles.fadeUp} ${styles.d300}`} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label htmlFor="password" style={{
                  fontSize: '0.6rem',
                  letterSpacing: '0.2em',
                  color: muted,
                  textTransform: 'uppercase',
                  fontWeight: 500,
                }}>
                  Password
                </label>
                <Link href="/forgot-password" style={{
                  fontSize: '0.68rem',
                  color: gold,
                  textDecoration: 'none',
                  letterSpacing: '0.05em',
                }}>
                  Forgot?
                </Link>
              </div>
              <div className={styles.inputWrap}>
                <svg
                  style={{
                    position: 'absolute', left: 0, top: '50%',
                    transform: 'translateY(-50%)', pointerEvents: 'none',
                  }}
                  width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c0bdb7" strokeWidth="1.5"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className={styles.inputField}
                  style={{ paddingRight: 34 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: 0, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#c0bdb7', padding: 0,
                    display: 'flex', alignItems: 'center',
                    transition: 'color 0.2s',
                  }}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw
                    ? <EyeOff size={13} strokeWidth={1.8} />
                    : <Eye    size={13} strokeWidth={1.8} />
                  }
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className={`${styles.fadeUp} ${styles.d400}`} style={{ marginTop: 28 }}>
              <button type="submit" disabled={loading} className={styles.submitBtn}>
                {loading
                  ? <div className={styles.spinner} />
                  : <><span>Sign In</span><ArrowRight size={13} strokeWidth={2} /></>
                }
              </button>
            </div>
          </form>

          {/* ── DIVIDER ──────────────────────────────────────── */}
          <div
            className={`${styles.fadeUp} ${styles.d500}`}
            style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '26px 0' }}
          >
            <div style={{ flex: 1, height: 1, background: '#ede9e2' }} />
            <span style={{
              fontSize: '0.6rem', letterSpacing: '0.18em',
              color: '#c0bdb7', textTransform: 'uppercase',
            }}>
              or
            </span>
            <div style={{ flex: 1, height: 1, background: '#ede9e2' }} />
          </div>

          {/* ── REGISTER LINK ────────────────────────────────── */}
          <div className={`${styles.fadeUp} ${styles.d600}`} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.82rem', color: muted, margin: 0 }}>
              New to Meridian?{' '}
              <Link
                href="/register"
                style={{
                  color: nearBlk,
                  fontWeight: 600,
                  textDecoration: 'none',
                  borderBottom: `1px solid ${nearBlk}`,
                  paddingBottom: 1,
                }}
              >
                Create an account
              </Link>
            </p>
          </div>

          {/* ── FOOTER LEGAL NOTE ────────────────────────────── */}
          <div className={`${styles.fadeUp} ${styles.d700}`} style={{ textAlign: 'center', marginTop: 32 }}>
            <p style={{ fontSize: '0.67rem', color: '#ccc9c3', margin: 0, lineHeight: 1.65 }}>
              By signing in you agree to our{' '}
              <Link href="/terms"   style={{ color: '#aaa7a0', textDecoration: 'none' }}>Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" style={{ color: '#aaa7a0', textDecoration: 'none' }}>Privacy Policy</Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─── Suspense wrapper ───────────────────────────────────────── */
function LoginFormWrapper() {
  const searchParams = useSearchParams();
  const returnUrl    = searchParams.get('returnUrl') || undefined;
  return <SignInForm returnUrl={returnUrl} />;
}

/* ─── Page export ────────────────────────────────────────────── */
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex', minHeight: '100vh',
        alignItems: 'center', justifyContent: 'center',
        background: '#fff',
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          border: '2px solid rgba(196,147,63,0.25)',
          borderTopColor: '#c4933f',
          animation: 'spin 0.65s linear infinite',
        }} />
      </div>
    }>
      <LoginFormWrapper />
    </Suspense>
  );
}

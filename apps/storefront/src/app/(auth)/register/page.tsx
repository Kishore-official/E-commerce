'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eye, EyeOff, ArrowRight,
  Truck, Lock, RotateCcw,
} from 'lucide-react';
import { apiClient, setTokens } from '@ecommerce/ui-kit';
import styles from './register.module.css';

/* ─── Palette tokens ─────────────────────────────────────────── */
const gold    = '#c4933f';
const nearBlk = '#0c0c0c';
const warmOff = '#faf9f6';
const muted   = 'rgba(12,12,12,0.42)';

/* ─── Password strength helper ───────────────────────────────── */
function getPasswordStrength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  return score;
}
const strengthColors = ['#ede9e2', '#e57373', '#ffb74d', '#aed581', '#66bb6a'];

interface RegisterResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: string };
}

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [error,     setError]     = useState('');
  const [errorKey,  setErrorKey]  = useState(0);
  const [loading,   setLoading]   = useState(false);

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.post<{ data: RegisterResponse }>('/auth/register', {
        firstName, lastName, email, password,
      });
      const data = res.data.data || (res.data as unknown as RegisterResponse);
      setTokens(data.accessToken, data.refreshToken);
      router.push('/');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(
        typeof msg === 'string'
          ? msg
          : Array.isArray(msg)
          ? msg[0]
          : 'Registration failed. Please try again.',
      );
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
            Join the Experience
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
            Begin your<br />
            <em style={{ fontStyle: 'italic', fontWeight: 300 }}>journey with us</em>
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
            Create your account to access curated collections, exclusive offers,
            and a seamless shopping experience crafted for discerning tastes.
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
          ].map((stat, i) => (
            <div key={i} className={styles.statItem}>
              <div style={{
                fontFamily: 'var(--font-cormorant, Georgia, serif)',
                fontSize: '1.9rem',
                fontWeight: 300,
                color: warmOff,
                lineHeight: 1.05,
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: '0.57rem',
                letterSpacing: '0.22em',
                color: 'rgba(250,249,246,0.38)',
                textTransform: 'uppercase',
                marginTop: 5,
              }}>
                {stat.label}
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
        padding: '48px 32px',
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
              Get started
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
              Create your<br />
              <em style={{ fontStyle: 'italic' }}>account</em>
            </h2>
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

            {/* Name fields */}
            <div className={`${styles.fadeUp} ${styles.d100} ${styles.nameRow}`} style={{ marginBottom: 26 }}>
              <div>
                <label htmlFor="firstName" style={{
                  display: 'block',
                  fontSize: '0.6rem',
                  letterSpacing: '0.2em',
                  color: muted,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  fontWeight: 500,
                }}>
                  First Name
                </label>
                <div className={styles.inputWrap}>
                  <svg
                    style={{
                      position: 'absolute', left: 0, top: '50%',
                      transform: 'translateY(-50%)', pointerEvents: 'none',
                    }}
                    width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c0bdb7" strokeWidth="1.5"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="John"
                    required
                    autoFocus
                    className={styles.inputField}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="lastName" style={{
                  display: 'block',
                  fontSize: '0.6rem',
                  letterSpacing: '0.2em',
                  color: muted,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  fontWeight: 500,
                }}>
                  Last Name
                </label>
                <div className={styles.inputWrap}>
                  <svg
                    style={{
                      position: 'absolute', left: 0, top: '50%',
                      transform: 'translateY(-50%)', pointerEvents: 'none',
                    }}
                    width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c0bdb7" strokeWidth="1.5"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Doe"
                    required
                    className={styles.inputField}
                  />
                </div>
              </div>
            </div>

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
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className={styles.inputField}
                />
              </div>
            </div>

            {/* Password */}
            <div className={`${styles.fadeUp} ${styles.d300}`} style={{ marginBottom: 8 }}>
              <label htmlFor="password" style={{
                display: 'block',
                fontSize: '0.6rem',
                letterSpacing: '0.2em',
                color: muted,
                textTransform: 'uppercase',
                marginBottom: 8,
                fontWeight: 500,
              }}>
                Password
              </label>
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
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
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
              {/* Password strength bar */}
              {password.length > 0 && (
                <div className={styles.strengthBar}>
                  {[1, 2, 3, 4].map(level => (
                    <div
                      key={level}
                      className={styles.strengthSegment}
                      style={{
                        background: strength >= level ? strengthColors[strength] : undefined,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className={`${styles.fadeUp} ${styles.d400}`} style={{ marginTop: 28 }}>
              <button type="submit" disabled={loading} className={styles.submitBtn}>
                {loading
                  ? <div className={styles.spinner} />
                  : <><span>Create Account</span><ArrowRight size={13} strokeWidth={2} /></>
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

          {/* ── LOGIN LINK ────────────────────────────────────── */}
          <div className={`${styles.fadeUp} ${styles.d600}`} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.82rem', color: muted, margin: 0 }}>
              Already have an account?{' '}
              <Link
                href="/login"
                style={{
                  color: nearBlk,
                  fontWeight: 600,
                  textDecoration: 'none',
                  borderBottom: `1px solid ${nearBlk}`,
                  paddingBottom: 1,
                }}
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* ── FOOTER LEGAL NOTE ────────────────────────────── */}
          <div className={`${styles.fadeUp} ${styles.d700}`} style={{ textAlign: 'center', marginTop: 32 }}>
            <p style={{ fontSize: '0.67rem', color: '#ccc9c3', margin: 0, lineHeight: 1.65 }}>
              By creating an account you agree to our{' '}
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

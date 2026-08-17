import { Link } from 'react-router-dom';

/**
 * Landing — public marketing page, converted 1:1 from the mock template
 * (index.html). All CTAs route to the real auth flow.
 */
export default function Landing() {
  return (
    <>
      <nav className="topnav">
        <div className="container topnav-inner">
          <Link to="/" className="topnav-logo">
            CVGen
          </Link>
          <div className="topnav-links">
            <a href="#features" className="topnav-link">
              Features
            </a>
            <a href="#how" className="topnav-link">
              How it works
            </a>
            <Link to="/login" className="btn btn-primary btn-sm">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <section className="landing-hero">
        <h1>
          Build ATS-friendly CVs
          <br />
          in under 10 minutes
        </h1>
        <p>
          No subscriptions. No formatting headaches. Just a clean builder, a
          live preview, and a PDF that looks exactly the same — while scoring
          against the job you actually want.
        </p>
        <div className="landing-cta">
          <Link to="/login" className="btn btn-primary btn-lg">
            Start Building — Free
          </Link>
          <a href="#features" className="btn btn-outline btn-lg">
            See how it works
          </a>
        </div>
        <div
          style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '680px',
            marginLeft: 'auto',
            marginRight: 'auto',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', textAlign: 'left' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-subtle)', marginBottom: '0.5rem' }}>
                Live Preview
              </div>
              <div style={{ height: '6px', background: 'var(--fg)', borderRadius: '2px', width: '55%', marginBottom: '6px' }} />
              <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', width: '90%', marginBottom: '4px' }} />
              <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', width: '75%' }} />
            </div>
            <div style={{ width: '1px', background: 'var(--border)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-subtle)', marginBottom: '0.5rem' }}>
                ATS Analysis
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ flex: 1, height: '5px', background: 'var(--border)', borderRadius: 'var(--radius-pill)' }}>
                  <div style={{ width: '84%', height: '100%', background: 'var(--success)', borderRadius: 'var(--radius-pill)' }} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>84%</span>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius-pill)', fontWeight: 500 }}>Java</span>
                <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius-pill)', fontWeight: 500 }}>React</span>
                <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-pill)', fontWeight: 500 }}>Docker</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="landing-features">
        <div className="text-center mb-8">
          <h2>Built for the job search</h2>
          <p className="text-muted text-sm mt-1">
            Every feature exists because job seekers actually need it.
          </p>
        </div>
        <div className="feature-grid">
          <div className="card feature-card card-hover">
            <div className="feature-icon">📄</div>
            <div className="feature-title">Pixel-Perfect PDF Export</div>
            <div className="feature-desc">
              What you see in the live preview is exactly what gets exported.
              Server-rendered HTML via Playwright guarantees zero drift.
            </div>
          </div>
          <div className="card feature-card card-hover">
            <div className="feature-icon">📥</div>
            <div className="feature-title">Import &amp; Parse</div>
            <div className="feature-desc">
              Upload an existing PDF or DOCX and get editable, pre-filled
              sections. Or pull your GitHub repos directly into project entries.
            </div>
          </div>
          <div className="card feature-card card-hover">
            <div className="feature-icon">🎯</div>
            <div className="feature-title">CV Match Analysis</div>
            <div className="feature-desc">
              Paste a job description and see keyword coverage, missing skills,
              and structural warnings — not a meaningless score.
            </div>
          </div>
          <div className="card feature-card card-hover">
            <div className="feature-icon">💳</div>
            <div className="feature-title">Pay Local, Pay Once</div>
            <div className="feature-desc">
              No subscriptions. Buy credits with eSewa, Khalti, or ConnectIPS.
              Unlock premium templates permanently with a single credit.
            </div>
          </div>
        </div>
      </section>

      <section id="how" style={{ padding: '3rem 1rem', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold">How it works</h2>
            <p className="text-muted text-sm mt-1">Three steps. No friction.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              ['1', 'Build your CV', 'Fill structured sections or import an existing CV. Switch templates without retyping anything.'],
              ['2', 'Analyze the match', "Paste any job description. See what keywords you hit, what's missing, and whether your layout is ATS-safe."],
              ['3', 'Export with confidence', 'Download a PDF that is pixel-identical to your preview. Machine-readable, professionally formatted, ready to submit.'],
            ].map(([num, title, desc]) => (
              <div key={num} className="flex items-center gap-4 p-4" style={{ background: 'var(--bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                <div style={{ width: '36px', height: '36px', background: 'var(--primary)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                  {num}
                </div>
                <div>
                  <div className="font-semibold text-sm">{title}</div>
                  <div className="text-muted text-xs mt-1">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '2rem 1rem', textAlign: 'center', color: 'var(--fg-subtle)', fontSize: '0.75rem' }}>
        © 2026 CVGen. Built for the Nepali job market.
      </footer>
    </>
  );
}

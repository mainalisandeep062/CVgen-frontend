import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Eye,
  FileDown,
  FileInput,
  Target,
  Wallet,
} from 'lucide-react';

import Brand from '@/components/mockui/Brand';

/**
 * Landing — public marketing page. No state or data; all CTAs route to the
 * real auth flow.
 */

const FEATURES = [
  {
    Icon: FileDown,
    title: 'Pixel-perfect PDF export',
    desc: 'What you see in the live preview is exactly what gets exported. Server-rendered HTML guarantees zero drift.',
  },
  {
    Icon: FileInput,
    title: 'Import & parse',
    desc: 'Upload an existing PDF or DOCX and get editable, pre-filled sections — or pull GitHub repos into projects.',
  },
  {
    Icon: Target,
    title: 'CV match analysis',
    desc: 'Paste a job description and see keyword coverage, missing skills and structural warnings — not a vanity score.',
  },
  {
    Icon: Wallet,
    title: 'Pay local, pay once',
    desc: 'No subscriptions. Buy credits with eSewa, Khalti or ConnectIPS and unlock premium templates for good.',
  },
];

const STEPS = [
  ['1', 'Build your CV', 'Fill structured sections or import an existing CV. Switch templates without retyping anything.'],
  ['2', 'Analyze the match', "Paste any job description. See what keywords you hit, what's missing, and whether your layout is ATS-safe."],
  ['3', 'Export with confidence', 'Download a PDF identical to your preview — machine-readable, professionally formatted, ready to submit.'],
];

export default function Landing() {
  return (
    <>
      <nav className="topnav landing-nav">
        <div className="container topnav-inner">
          <Brand />
          <div className="topnav-links">
            <a href="#features" className="topnav-link">
              <span className="topnav-link-label">Features</span>
            </a>
            <a href="#how" className="topnav-link">
              <span className="topnav-link-label">How it works</span>
            </a>
            <Link to="/login" className="btn btn-primary btn-sm btn-pill">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="landing-hero">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-tag">New</span>
            ATS-friendly CVs, built for the Nepali job market
          </div>
          <h1>
            Build a CV that gets <span className="gradient-text">read by humans</span>, not dropped by parsers
          </h1>
          <p>
            No subscriptions. No formatting headaches. A calm builder, a live preview, and a PDF that
            looks exactly the same — scored against the job you actually want.
          </p>
          <div className="landing-cta">
            <Link to="/login" className="btn btn-primary btn-lg btn-pill">
              Start building — free
              <ArrowRight />
            </Link>
            <a href="#how" className="btn btn-outline btn-lg btn-pill">
              See how it works
            </a>
          </div>

          <div className="hero-preview" aria-hidden="true">
            <div className="hero-preview-grid">
              <div className="hero-preview-pane">
                <div className="hero-preview-label">
                  <Eye /> Live preview
                </div>
                <div className="thumb-line heading" />
                <div className="thumb-line" style={{ width: '90%' }} />
                <div className="thumb-line" style={{ width: '75%' }} />
                <div className="thumb-line accent" />
                <div className="thumb-line" style={{ width: '85%' }} />
                <div className="thumb-line" style={{ width: '60%' }} />
              </div>
              <div className="hero-preview-pane">
                <div className="hero-preview-label">
                  <BarChart3 /> ATS analysis
                </div>
                <div className="meter">
                  <div className="meter-track">
                    <div className="meter-fill" style={{ width: '84%' }} />
                  </div>
                  <span className="meter-value">84%</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="keyword-pill pill-match">Java</span>
                  <span className="keyword-pill pill-match">React</span>
                  <span className="keyword-pill pill-miss">Docker</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="landing-features">
          <div className="section-heading">
            <div className="page-eyebrow">Features</div>
            <h2>Built for the job search</h2>
            <p>Every feature exists because job seekers actually need it.</p>
          </div>
          <div className="feature-grid">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div className="card feature-card card-hover" key={title}>
                <div className="feature-icon">
                  <Icon aria-hidden="true" />
                </div>
                <h3 className="feature-title">{title}</h3>
                <p className="feature-desc">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="landing-steps">
          <div className="section-heading">
            <div className="page-eyebrow">How it works</div>
            <h2>Three steps. No friction.</h2>
          </div>
          <div className="steps-grid">
            {STEPS.map(([num, title, desc]) => (
              <div key={num} className="card step-card">
                <div className="step-num">{num}</div>
                <h3 className="feature-title">{title}</h3>
                <p className="feature-desc">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container">
          <div className="cta-band">
            <h2>Your next interview starts with a better CV</h2>
            <p>Create an account in seconds — sign in with Google, GitHub or LinkedIn.</p>
            <Link to="/signup" className="btn btn-lg btn-pill btn-on-gradient">
              Create your free account
              <ArrowRight />
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">© 2026 CVGen. Built for the Nepali job market.</footer>
    </>
  );
}

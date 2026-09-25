import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Download,
  FileInput,
  FileText,
  Github,
  PenLine,
  PlayCircle,
  ShieldCheck,
  Target,
  Wallet,
  X,
} from 'lucide-react';

import Brand from '@/components/mockui/Brand';
import '@/styles/landing.css';

/**
 * Landing - public marketing page, laid out after the Stitch design. No state
 * or data; every CTA routes into the real auth flow. The hero mockup is
 * decorative sample UI (aria-hidden). Every claim on this page describes
 * something the product actually does: no invented statistics or logos.
 */

const HERO_FACTS = [
  ['1 column', 'ATS-safe layout'],
  ['PDF + DOCX', 'Import formats'],
  ['NPR 0', 'To start building'],
];

const WORKS_WITH = [
  { Icon: FileText, label: 'PDF import' },
  { Icon: FileInput, label: 'DOCX import' },
  { Icon: Github, label: 'GitHub projects' },
  { Icon: Wallet, label: 'eSewa' },
  { Icon: Wallet, label: 'Khalti' },
  { Icon: ShieldCheck, label: 'Google, GitHub, LinkedIn sign-in' },
];

const FEATURES = [
  {
    Icon: Download,
    tone: 'indigo',
    title: 'Pixel-perfect ATS PDF export',
    desc: 'What you see in the editor is what the recruiter downloads. Clean single-column typography, embedded fonts, and no hidden layout tables that confuse applicant tracking systems.',
    tags: ['True vector output'],
    note: 'Zero layout shift',
  },
  {
    Icon: FileInput,
    tone: 'blue',
    title: 'Import & parse in seconds',
    desc: 'Drop your existing PDF or DOCX and get editable sections for roles, dates, education and skills. Pull your GitHub repositories straight into projects.',
    tags: ['PDF', 'DOCX', 'GitHub'],
    note: 'Review before saving',
  },
  {
    Icon: Target,
    tone: 'green',
    title: 'Real job match diagnostics',
    desc: 'Keyword coverage, not an arbitrary vanity score. Paste any job description to see matched and missing skills, nice-to-haves, and structural checks.',
    tags: ['Keyword gap analysis'],
    note: 'Against the actual posting',
  },
  {
    Icon: Wallet,
    tone: 'amber',
    title: 'Pay local, pay once',
    desc: 'No USD subscriptions or surprise renewals. Top up credits for premium templates with eSewa or Khalti, and keep what you unlock.',
    tags: ['eSewa', 'Khalti'],
    note: 'No foreign card needed',
  },
];

const STEPS = [
  {
    num: '01',
    Icon: PenLine,
    title: 'Build with guidance',
    desc: 'Use a calm, distraction-free editor with structured sections for experience, education, skills and projects, and a live preview beside it.',
    check: 'Structured sections',
  },
  {
    num: '02',
    Icon: BarChart3,
    title: 'Analyze the match',
    desc: 'Paste the job description you are targeting. CVGen finds the keywords you cover, the ones you miss, and whether your layout is ATS-safe.',
    check: 'Keyword coverage report',
  },
  {
    num: '03',
    Icon: Download,
    title: 'Export with confidence',
    desc: 'Download a machine-readable PDF identical to your preview, professionally formatted and ready to submit to any portal.',
    check: 'PDF identical to preview',
  },
];

const COMPARE = [
  {
    feature: 'ATS compatibility',
    cvgen: 'Single-column, UTF-8 clean',
    generic: 'Varies by template',
    design: 'Multi-column designs can confuse parsers',
    tone: 'warn',
  },
  {
    feature: 'Pricing model',
    cvgen: 'Free to start, one-time credits',
    generic: 'Monthly subscription common',
    design: 'Subscription or manual formatting',
  },
  {
    feature: 'Local payments',
    cvgen: 'eSewa and Khalti',
    generic: 'International cards only',
    design: 'International card required',
    tone: 'warn',
  },
  {
    feature: 'Job description match',
    cvgen: 'Included, with keyword gap tips',
    generic: 'Often a paid add-on',
    design: 'None (manual reading)',
    tone: 'warn',
  },
];

function HeroMockup() {
  return (
    <div className="lp-mock" aria-hidden="true">
      <div className="lp-sheet">
        <div className="lp-sheet-top">
          <span className="lp-sheet-label">
            <span className="lp-dot" /> A4 vector sheet · Live preview
          </span>
          <span className="lp-safe">
            <ShieldCheck /> ATS safe
          </span>
        </div>
        <div className="lp-sheet-name">Aayush Shrestha</div>
        <div className="lp-sheet-role">Senior Full-Stack Engineer</div>
        <div className="lp-sheet-contact">Kathmandu, Nepal · +977 9801234567 · github.com/aayush</div>
        <div className="lp-sheet-h">Professional summary</div>
        <p className="lp-sheet-p">
          Full-stack engineer with 5+ years building distributed fintech APIs and resilient microservices.
        </p>
        <div className="lp-sheet-h">Experience</div>
        <div className="lp-sheet-row">
          <b>Senior Software Engineer, Leapfrog Technology</b>
          <span>2022 - Present</span>
        </div>
        <ul className="lp-sheet-list">
          <li>Architected multi-tenant Postgres schema, reducing query latency by 38%.</li>
          <li>Mentored four engineers across React and Spring teams.</li>
        </ul>
        <div className="lp-sheet-row">
          <b>Software Engineer, F1Soft International</b>
          <span>2020 - 2022</span>
        </div>
        <div className="lp-sheet-foot">
          <span>Stack: React, Node.js, Go, Postgres</span>
          <span>Single-column · UTF-8</span>
        </div>
      </div>

      <div className="lp-diag">
        <div className="lp-diag-head">
          <div>
            <div className="lp-diag-kicker">Live ATS diagnostics</div>
            <div className="lp-diag-title">FinTech Lead · Kathmandu</div>
          </div>
          <div className="lp-ring">
            <svg viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="18" className="lp-ring-track" />
              <circle cx="22" cy="22" r="18" className="lp-ring-fill" strokeDasharray="113.1" strokeDashoffset="18.1" transform="rotate(-90 22 22)" />
            </svg>
            <span>84%</span>
          </div>
        </div>
        <div className="lp-diag-meta">
          <span>Target keywords match</span>
          <b>9 of 11 matched</b>
        </div>
        <div className="lp-pills">
          <span className="lp-pill ok"><Check /> React</span>
          <span className="lp-pill ok"><Check /> Node.js</span>
          <span className="lp-pill ok"><Check /> Postgres</span>
          <span className="lp-pill miss"><X /> Docker</span>
          <span className="lp-pill ok"><Check /> Next.js</span>
        </div>
        <div className="lp-tip">
          <span>Tip: add &ldquo;Docker&rdquo; where truthful</span>
          <b>Fix gap <ArrowRight /></b>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-inner">
          <div className="lp-brand">
            <Brand />
            <span className="lp-market">Nepal</span>
          </div>
          <nav className="lp-nav-links" aria-label="Sections">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#compare">Pricing</a>
          </nav>
          <div className="lp-nav-actions">
            <Link to="/login" className="lp-signin">Sign in</Link>
            <Link to="/signup" className="btn btn-primary btn-sm btn-pill">Get started</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="lp-wrap lp-hero">
          <div className="lp-hero-copy">
            <span className="lp-eyebrow">
              <b>New</b> · ATS-friendly CVs, built for the Nepali job market
            </span>
            <h1 className="lp-h1">
              Build a CV that gets <span className="lp-grad">read by humans</span>, not dropped by parsers.
            </h1>
            <p className="lp-lead">
              No subscriptions. No formatting headaches. A calm builder, a live preview, and a vector PDF that
              looks exactly the same, scored against the job you actually want.
            </p>
            <div className="lp-cta-row">
              <Link to="/signup" className="btn btn-primary btn-lg">
                Start building for free <ArrowRight aria-hidden="true" />
              </Link>
              <a href="#how" className="btn btn-outline btn-lg">
                <PlayCircle aria-hidden="true" /> See how it works
              </a>
            </div>
            <p className="lp-optimized">
              <CheckCircle2 aria-hidden="true" /> Built for applications in Nepal and remote roles abroad
            </p>
            <dl className="lp-facts">
              {HERO_FACTS.map(([value, label]) => (
                <div key={label}>
                  <dt>{value}</dt>
                  <dd>{label}</dd>
                </div>
              ))}
            </dl>
          </div>
          <HeroMockup />
        </section>

        <section className="lp-strip" aria-label="Works with">
          <div className="lp-wrap">
            <p className="lp-strip-title">Works with the tools and payments you already use</p>
            <ul className="lp-strip-list">
              {WORKS_WITH.map(({ Icon, label }) => (
                <li key={label}>
                  <Icon aria-hidden="true" /> {label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="features" className="lp-wrap lp-section">
          <div className="lp-section-head lp-center">
            <span className="lp-kicker">Why CVGen</span>
            <h2 className="lp-h2">Built for the job search, not the subscription trap</h2>
            <p className="lp-sub">
              Traditional builders quietly lock your resume behind recurring charges. CVGen gives you clean
              parsing, ATS diagnostics, and local Nepali payment options.
            </p>
          </div>
          <div className="lp-features">
            {FEATURES.map(({ Icon, tone, title, desc, tags, note }) => (
              <article key={title} className="lp-feature">
                <span className={`lp-icon tone-${tone}`} aria-hidden="true"><Icon /></span>
                <h3>{title}</h3>
                <p>{desc}</p>
                <div className="lp-feature-foot">
                  <span className="lp-tags">
                    {tags.map((tag) => (
                      <span key={tag} className={`lp-tag tone-${tone}`}>{tag}</span>
                    ))}
                  </span>
                  <span className="lp-feature-note">{note}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="lp-wrap lp-section">
          <div className="lp-flow">
            <span className="lp-kicker">Workflow</span>
            <h2 className="lp-h2">Three steps. No friction.</h2>
            <p className="lp-sub lp-sub-left">
              From a blank canvas or an outdated resume to an interview-ready application in minutes.
            </p>
            <div className="lp-steps">
              {STEPS.map(({ num, Icon, title, desc, check }) => (
                <article key={num} className="lp-step">
                  <div className="lp-step-top">
                    <span className="lp-step-num">{num}</span>
                    <Icon className="lp-step-icon" aria-hidden="true" />
                  </div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                  <span className="lp-step-check">
                    <CheckCircle2 aria-hidden="true" /> {check}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="compare" className="lp-wrap lp-section">
          <div className="lp-compare">
            <div className="lp-compare-head">
              <div>
                <span className="lp-kicker lp-kicker-plain">Clear advantage</span>
                <h2 className="lp-h2">CVGen vs. generic builders</h2>
              </div>
              <p>Why engineers and professionals in Nepal choose a builder made for local hiring and local payments.</p>
            </div>
            <div className="lp-table-scroll">
              <table className="lp-table">
                <thead>
                  <tr>
                    <th scope="col">Feature</th>
                    <th scope="col" className="lp-col-us">CVGen (built for Nepal)</th>
                    <th scope="col">Generic international builders</th>
                    <th scope="col">Design tools and Word templates</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((row) => (
                    <tr key={row.feature}>
                      <th scope="row">{row.feature}</th>
                      <td className="lp-col-us">
                        <span className="lp-yes">
                          <CheckCircle2 aria-hidden="true" /> {row.cvgen}
                        </span>
                      </td>
                      <td className={row.feature === 'Local payments' ? 'lp-bad' : ''}>{row.generic}</td>
                      <td className={row.tone === 'warn' ? 'lp-bad' : ''}>{row.design}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="lp-wrap lp-section lp-section-last">
          <div className="lp-band">
            <span className="lp-band-chip">Ready to upgrade your job hunt?</span>
            <h2>Your next interview starts with a better CV.</h2>
            <p>
              Built for Nepali developers, designers, and professionals applying at top companies at home and
              abroad. Sign up with email, Google, GitHub or LinkedIn.
            </p>
            <div className="lp-band-row">
              <Link to="/signup" className="btn btn-lg lp-band-btn">
                Create your free CV now <ArrowRight aria-hidden="true" />
              </Link>
              <span className="lp-band-check"><Check aria-hidden="true" /> Free to start</span>
              <span className="lp-band-check"><Check aria-hidden="true" /> No card required</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-inner">
          <div>
            <p>© 2026 CVGen. Built for the Nepali job market.</p>
            <p className="lp-footer-sub">Made for IT and corporate jobs in Nepal, with support for eSewa and Khalti.</p>
          </div>
          <nav className="lp-footer-links" aria-label="Footer">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <Link to="/login">Sign in</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

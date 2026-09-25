import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Lightbulb,
  X,
  XCircle,
} from 'lucide-react';

import TopNav from '@/components/mockui/TopNav';
import { analyzeCv, listCvs } from '@/api/cv';
import { apiMessage } from '@/api/response';
import '@/styles/scoring.css';

/**
 * Scoring - CV Match Analysis.
 *
 * The analysis is server-side: POST /api/cvs/{id}/analysis with the pasted job
 * description (and optional title) returns coverage, matched / missing /
 * optional keywords, category scores, structural checks and suggestions. The
 * CV picker lists GET /api/cvs; `?cv=<id>` (from the builder / dashboard)
 * preselects one.
 */

const clampPct = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

function formatYears(n) {
  const value = Number(n);
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value * 10) / 10;
  return `${rounded} yr${rounded === 1 ? '' : 's'}`;
}

function Gauge({ value }) {
  const pct = clampPct(value);
  const r = 52;
  const c = 2 * Math.PI * r;
  const tone = pct >= 70 ? 'good' : pct >= 40 ? 'fair' : 'low';
  return (
    <div className={`score-gauge ${tone}`} role="img" aria-label={`Keyword coverage ${pct}%`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="score-gauge-track" cx="60" cy="60" r={r} />
        <circle
          className="score-gauge-fill"
          cx="60"
          cy="60"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
        />
      </svg>
      <div className="score-gauge-label">
        {pct}
        <small>%</small>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, tone, note }) {
  const pct = clampPct(value);
  return (
    <div className="score-row">
      <div className="score-row-head">
        <span className="score-row-label">{label}</span>
        <span className={`score-row-value tone-${tone}`}>{pct}%</span>
      </div>
      <div
        className="score-row-track"
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`score-row-fill tone-${tone}`} style={{ width: `${pct}%` }} />
      </div>
      {note && <div className="score-row-note">{note}</div>}
    </div>
  );
}

export default function Scoring() {
  const [searchParams] = useSearchParams();
  const requestedId = searchParams.get('cv') || '';

  const [cvs, setCvs] = useState([]);
  const [cvsLoading, setCvsLoading] = useState(true);
  const [cvsError, setCvsError] = useState('');
  const [selectedId, setSelectedId] = useState(requestedId);
  const [jobTitle, setJobTitle] = useState('');
  const [jd, setJd] = useState('');
  const [result, setResult] = useState(null);
  const [analyzedId, setAnalyzedId] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listCvs()
      .then((page) => {
        if (cancelled) return;
        const items = page?.items ?? [];
        setCvs(items);
        setSelectedId((current) =>
          items.some((cv) => String(cv.id) === String(current)) ? current : items[0]?.id ?? ''
        );
      })
      .catch((err) => {
        if (!cancelled) setCvsError(apiMessage(err, 'Could not load your CVs.'));
      })
      .finally(() => {
        if (!cancelled) setCvsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const analyze = async (event) => {
    event?.preventDefault();
    if (!selectedId) {
      setError('Select a CV first.');
      return;
    }
    if (!jd.trim()) {
      setError('Paste a job description first.');
      return;
    }
    setAnalyzing(true);
    setError('');
    try {
      const analysis = await analyzeCv(selectedId, { jobTitle, jobDescription: jd });
      setResult(analysis);
      setAnalyzedId(selectedId);
    } catch (err) {
      setError(apiMessage(err, 'Could not analyze this CV. Please try again.'));
    } finally {
      setAnalyzing(false);
    }
  };

  const clear = () => {
    setJd('');
    setJobTitle('');
    setResult(null);
    setError('');
  };

  const matched = result?.matched ?? [];
  const missing = result?.missing ?? [];
  const optional = result?.optional ?? [];
  const suggestions = result?.suggestions ?? [];
  const warnings = result?.warnings ?? [];
  const counts = result?.counts ?? {
    matched: matched.length,
    missing: missing.length,
    warnings: warnings.filter((w) => !w.passed).length,
  };
  const categories = result?.categories ?? {};
  const experienceNote =
    result?.requiredYears != null
      ? `${formatYears(result.requiredYears)} required · ${formatYears(result.cvYears ?? 0)} on your CV`
      : null;

  return (
    <>
      <TopNav />
      <main className="container scoring-v2">
        <header className="page-header">
          <div>
            <div className="page-eyebrow">Analysis</div>
            <h1>CV Match Analysis</h1>
            <p className="text-muted text-sm mt-1">
              Paste a job description to see how well your CV lines up with it: matched and
              missing keywords, experience fit and structural checks.
            </p>
          </div>
        </header>

        <form className="card scoring-input" onSubmit={analyze}>
          <div className="scoring-fields">
            <div className="form-group">
              <label className="label" htmlFor="score-cv">Select CV</label>
              <select
                id="score-cv"
                className="input"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={cvsLoading || cvs.length === 0}
              >
                {cvsLoading && <option value="">Loading your CVs…</option>}
                {!cvsLoading && cvs.length === 0 && <option value="">No CVs yet</option>}
                {cvs.map((cv) => (
                  <option key={cv.id} value={cv.id}>{cv.title}</option>
                ))}
              </select>
              {cvsError && <div className="field-error">{cvsError}</div>}
              {!cvsLoading && !cvsError && cvs.length === 0 && (
                <div className="field-hint">
                  <Link to="/dashboard">Create a CV</Link> first, then come back to analyze it.
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="label" htmlFor="score-title">Job Title (optional)</label>
              <input
                id="score-title"
                type="text"
                className="input"
                placeholder="e.g. Senior React Developer"
                value={jobTitle}
                maxLength={200}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="score-jd">Job Description</label>
            <textarea
              id="score-jd"
              className="textarea scoring-jd"
              rows={10}
              placeholder="Paste the full job description here…"
              value={jd}
              onChange={(e) => setJd(e.target.value)}
            />
          </div>

          {error && (
            <div className="alert alert-danger mb-4" role="alert">
              <XCircle aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="scoring-actions">
            <button type="submit" className="btn btn-primary" disabled={analyzing || !selectedId}>
              <BarChart3 aria-hidden="true" />
              {analyzing ? 'Analyzing…' : 'Analyze Match'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={clear} disabled={analyzing}>
              Clear
            </button>
          </div>
        </form>

        {result && (
          <section className="scoring-results" aria-label="Analysis results">
            <div className="scoring-top">
              <div className="card scoring-hero">
                <Gauge value={result.coverage} />
                <div className="scoring-hero-body">
                  <div className="scoring-hero-title">Overall keyword coverage</div>
                  <p className="text-sm text-muted">
                    Share of the job description&apos;s keywords that appear in your CV.
                  </p>
                  <div className="scoring-counts">
                    <span className="count-chip success">
                      <CheckCircle2 aria-hidden="true" />Matched {counts.matched ?? 0}
                    </span>
                    <span className="count-chip danger">
                      <XCircle aria-hidden="true" />Missing {counts.missing ?? 0}
                    </span>
                    <span className="count-chip warning">
                      <AlertTriangle aria-hidden="true" />Warnings {counts.warnings ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="card scoring-card">
                <h2 className="scoring-card-title">Category breakdown</h2>
                <ScoreBar label="Skills Match" value={categories.skills} tone="success" />
                <ScoreBar label="Keyword Coverage" value={categories.keywords} tone="primary" />
                <ScoreBar
                  label="Experience Relevance"
                  value={categories.experience}
                  tone="warning"
                  note={experienceNote}
                />
              </div>
            </div>

            <div className="scoring-grid">
              <div className="card scoring-card">
                <h2 className="scoring-card-title">
                  Matched keywords <span className="scoring-count">{matched.length}</span>
                </h2>
                <div className="scoring-pills">
                  {matched.length === 0 && (
                    <span className="text-sm text-muted">No matching keywords yet.</span>
                  )}
                  {matched.map((k) => (
                    <span className="keyword-pill pill-match" key={k}>
                      <Check aria-hidden="true" />
                      {k}
                    </span>
                  ))}
                </div>
              </div>

              <div className="card scoring-card">
                <h2 className="scoring-card-title">
                  Missing keywords <span className="scoring-count">{missing.length}</span>
                </h2>
                <div className="scoring-pills">
                  {missing.map((k) => (
                    <span className="keyword-pill pill-miss" key={k}>
                      <X aria-hidden="true" />
                      {k}
                    </span>
                  ))}
                  {missing.length === 0 && (
                    <span className="text-sm text-muted">Nothing required is missing.</span>
                  )}
                </div>

                {optional.length > 0 && (
                  <>
                    <div className="scoring-sublabel">Nice to have</div>
                    <div className="scoring-pills">
                      {optional.map((k) => (
                        <span className="keyword-pill pill-nice" key={k}>{k}</span>
                      ))}
                    </div>
                  </>
                )}

                {suggestions.length > 0 && (
                  <div className="scoring-suggestions">
                    <div className="scoring-sublabel">Quick fix suggestions</div>
                    <ul>
                      {suggestions.map((s) => (
                        <li key={s}>
                          <Lightbulb aria-hidden="true" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {warnings.length > 0 && (
              <div className="card scoring-card">
                <h2 className="scoring-card-title">Structural checks</h2>
                <ul className="scoring-checks">
                  {warnings.map((w, i) => (
                    <li className={`scoring-check ${w.passed ? 'ok' : 'warn'}`} key={w.code ?? i}>
                      <span className="scoring-check-icon" aria-hidden="true">
                        {w.passed ? <CheckCircle2 /> : <AlertTriangle />}
                      </span>
                      <span>{w.message}</span>
                      <span className="sr-only">{w.passed ? '(passed)' : '(needs attention)'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="scoring-cta">
              <Link to={`/builder/${analyzedId}`} className="btn btn-primary btn-lg">
                Go to Builder &amp; fix gaps
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </section>
        )}
      </main>
    </>
  );
}

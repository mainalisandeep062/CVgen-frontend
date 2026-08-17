import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import TopNav from '@/components/mockui/TopNav';
import { showToast } from '@/components/mockui/toast';
import { listCVs } from '@/mock/cvStore';
import { analyzeMatch } from '@/mock/analyze';

/**
 * Scoring — CV Match Analysis from the mock template.
 *
 * Unlike the static mock, the analysis is REAL client-side logic
 * (src/mock/analyze.js): keywords are extracted from the pasted job
 * description and matched against the selected CV from the mock store, so the
 * coverage, matched/missing pills, and suggestions all reflect the actual
 * inputs. It stands in for the planned POST /api/analysis/match endpoint.
 */

const SAMPLE_JD =
  'We are looking for a Senior Full Stack Developer with 3+ years of experience in Java, Spring Boot, React, and PostgreSQL. The ideal candidate should have experience with microservices architecture, Docker, AWS, and CI/CD pipelines. Strong understanding of REST APIs, Git, and Agile methodologies is required. Experience with Redis, TypeScript, and cloud deployment is a plus.';

function ScoreBar({ label, value, color }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.width = '0%';
    const t = setTimeout(() => {
      el.style.width = `${value}%`;
    }, 100);
    return () => clearTimeout(t);
  }, [value]);
  return (
    <div className="score-bar-container">
      <div className="score-bar-header">
        <span className="score-bar-label">{label}</span>
        <span
          className="score-bar-value"
          style={{ color: color === 'green' ? 'var(--success)' : color === 'blue' ? 'var(--info)' : 'var(--warning)' }}
        >
          {value}%
        </span>
      </div>
      <div className="score-bar-bg">
        <div ref={ref} className={`score-bar-fill ${color}`} style={{ width: '0%' }} />
      </div>
    </div>
  );
}

export default function Scoring() {
  const [cvs] = useState(listCVs);
  const [selectedId, setSelectedId] = useState(() => listCVs()[0]?.id || '');
  const [jobTitle, setJobTitle] = useState('');
  const [jd, setJd] = useState(SAMPLE_JD);
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const analyze = () => {
    const cv = cvs.find((c) => c.id === selectedId);
    if (!cv) {
      showToast('Select a CV first');
      return;
    }
    if (!jd.trim()) {
      showToast('Paste a job description first');
      return;
    }
    setAnalyzing(true);
    showToast('Analyzing job description...');
    // Small delay keeps the mocked "job" feel of the original template.
    setTimeout(() => {
      setResult(analyzeMatch(cv, jd));
      setAnalyzing(false);
    }, 800);
  };

  const clear = () => {
    setJd('');
    setJobTitle('');
    setResult(null);
  };

  return (
    <>
      <TopNav />
      <div className="container" style={{ maxWidth: '800px', padding: '2rem 1.5rem' }}>
        <div className="page-header">
          <h1>CV Match Analysis</h1>
          <p className="text-muted text-sm mt-1">
            Paste a job description to see how well your CV aligns with it.
          </p>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label className="label">Select CV</label>
            <select className="input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {cvs.map((cv) => (
                <option key={cv.id} value={cv.id}>{cv.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Job Title (optional)</label>
            <input type="text" className="input" placeholder="e.g. Senior React Developer" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="label">Job Description</label>
          <textarea className="textarea" rows="10" placeholder="Paste the full job description here..." value={jd} onChange={(e) => setJd(e.target.value)} />
        </div>

        <div className="flex gap-3 mt-4 mb-8">
          <button className="btn btn-primary" onClick={analyze} disabled={analyzing}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>
            {analyzing ? 'Analyzing…' : 'Analyze Match'}
          </button>
          <button className="btn btn-secondary" onClick={clear}>Clear</button>
        </div>

        {result && (
          <div>
            <div className="divider" />
            <div style={{ marginTop: '2rem' }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-sm text-muted">Overall keyword coverage</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {result.coverage}
                    <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--fg-subtle)' }}>%</span>
                  </div>
                </div>
                <div className="text-sm text-muted" style={{ textAlign: 'right' }}>
                  <div>Matched: <b style={{ color: 'var(--success)' }}>{result.counts.matched}</b></div>
                  <div className="mt-1">Missing: <b style={{ color: 'var(--danger)' }}>{result.counts.missing}</b></div>
                  <div className="mt-1">Warnings: <b style={{ color: 'var(--warning)' }}>{result.counts.warnings}</b></div>
                </div>
              </div>

              <div className="card p-5 mb-4">
                <div className="text-sm font-semibold mb-4">Category Breakdown</div>
                <ScoreBar label="Skills Match" value={result.categories.skills} color="green" />
                <ScoreBar label="Keyword Coverage" value={result.categories.keywords} color="blue" />
                <div style={{ marginBottom: 0 }}>
                  <ScoreBar label="Experience Relevance" value={result.categories.experience} color="amber" />
                </div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="card p-5">
                  <div className="text-sm font-semibold mb-3">Matched Keywords</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {result.matched.length === 0 && <span className="text-sm text-muted">No matches yet</span>}
                    {result.matched.map((k) => (
                      <span className="keyword-pill pill-match" key={k}>{k}</span>
                    ))}
                  </div>
                </div>

                <div className="card p-5">
                  <div className="text-sm font-semibold mb-3">Missing Keywords</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                    {result.missing.map((k) => (
                      <span className="keyword-pill pill-miss" key={k}>{k}</span>
                    ))}
                    {result.optional.map((k) => (
                      <span className="keyword-pill pill-optional" key={k}>{k}</span>
                    ))}
                    {!result.missing.length && !result.optional.length && (
                      <span className="text-sm text-muted">Nothing missing 🎉</span>
                    )}
                  </div>
                  {result.suggestions.length > 0 && (
                    <div className="p-3 bg-muted rounded-md">
                      <div className="text-xs text-muted mb-2 font-medium">Quick Fix Suggestions</div>
                      <ul className="text-xs" style={{ paddingLeft: '1rem', color: 'var(--fg-muted)', lineHeight: 1.7 }}>
                        {result.suggestions.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="card p-5 mt-4">
                <div className="text-sm font-semibold mb-3">Structural Warnings</div>
                {result.warnings.map((w) => (
                  <div className="flex items-start gap-2 text-sm" key={w} style={{ color: w.startsWith('Your CV uses') ? 'var(--success)' : 'var(--warning)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span>{w}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-6">
                <Link to={`/builder/${selectedId}`} className="btn btn-primary">
                  Go to Builder &amp; Fix Gaps
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

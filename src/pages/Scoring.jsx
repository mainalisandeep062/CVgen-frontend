import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, XCircle } from 'lucide-react';

import TopNav from '@/components/mockui/TopNav';
import { showToast } from '@/components/mockui/toast';
import { getCv, listCvs } from '@/api/cv';
import { apiMessage } from '@/api/response';
import { toEditorModel } from '@/cv/content';
import { analyzeMatch } from '@/mock/analyze';

/**
 * Scoring — CV Match Analysis from the mock template.
 *
 * Unlike the static mock, the analysis is REAL client-side logic
 * (src/mock/analyze.js): keywords are extracted from the pasted job
 * description and matched against the selected CV from the mock store, so the
 * coverage, matched/missing pills, and suggestions all reflect the actual
 * inputs. It stands in for the planned POST /api/analysis/match endpoint.
 *
 * The CV itself is real: the picker lists GET /api/cvs and the selected CV's
 * content is fetched when the analysis runs.
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
  const [cvs, setCvs] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jd, setJd] = useState(SAMPLE_JD);
  const [result, setResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    listCvs()
      .then((page) => {
        const items = page?.items ?? [];
        setCvs(items);
        setSelectedId((current) => current || items[0]?.id || '');
      })
      .catch((error) => showToast(apiMessage(error, 'Could not load your CVs.')));
  }, []);

  const analyze = async () => {
    if (!selectedId) {
      showToast('Select a CV first');
      return;
    }
    if (!jd.trim()) {
      showToast('Paste a job description first');
      return;
    }
    setAnalyzing(true);
    showToast('Analyzing job description...');
    try {
      const record = await getCv(selectedId);
      setResult(analyzeMatch(toEditorModel(record.content), jd));
    } catch (error) {
      showToast(apiMessage(error, 'Could not load that CV.'));
    } finally {
      setAnalyzing(false);
    }
  };

  const clear = () => {
    setJd('');
    setJobTitle('');
    setResult(null);
  };

  return (
    <>
      <TopNav />
      <main className="container scoring-page">
        <div className="page-header">
          <div>
            <div className="page-eyebrow">Analysis</div>
            <h1>CV Match Analysis</h1>
            <p className="text-muted text-sm mt-1">
              Paste a job description to see how well your CV aligns with it.
            </p>
          </div>
        </div>

        <div className="card p-6 mb-6">
          <div className="scoring-grid-2">
            <div className="form-group">
              <label className="label" htmlFor="score-cv">Select CV</label>
              <select id="score-cv" className="input" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {cvs.length === 0 && <option value="">No CVs yet</option>}
                {cvs.map((cv) => (
                  <option key={cv.id} value={cv.id}>{cv.title}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label" htmlFor="score-title">Job Title (optional)</label>
              <input id="score-title" type="text" className="input" placeholder="e.g. Senior React Developer" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="score-jd">Job Description</label>
            <textarea id="score-jd" className="textarea" rows="10" placeholder="Paste the full job description here..." value={jd} onChange={(e) => setJd(e.target.value)} />
          </div>

          <div className="flex gap-3 flex-wrap">
            <button type="button" className="btn btn-primary" onClick={analyze} disabled={analyzing}>
              <BarChart3 aria-hidden="true" />
              {analyzing ? 'Analyzing…' : 'Analyze Match'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={clear}>Clear</button>
          </div>
        </div>

        {result && (
          <div>
            <div className="card coverage-hero">
              <div>
                <div className="text-sm text-muted">Overall keyword coverage</div>
                <div className="coverage-value">
                  {result.coverage}
                  <small>%</small>
                </div>
              </div>
              <div className="coverage-counts">
                <span className="count-chip success"><CheckCircle2 aria-hidden="true" />Matched {result.counts.matched}</span>
                <span className="count-chip danger"><XCircle aria-hidden="true" />Missing {result.counts.missing}</span>
                <span className="count-chip warning"><AlertTriangle aria-hidden="true" />Warnings {result.counts.warnings}</span>
              </div>
            </div>

            <div className="card p-6 mb-4">
              <div className="card-title mb-4">Category Breakdown</div>
              <ScoreBar label="Skills Match" value={result.categories.skills} color="green" />
              <ScoreBar label="Keyword Coverage" value={result.categories.keywords} color="blue" />
              <ScoreBar label="Experience Relevance" value={result.categories.experience} color="amber" />
            </div>

            <div className="scoring-grid-2">
              <div className="card p-6">
                <div className="card-title mb-3">Matched Keywords</div>
                <div className="flex flex-wrap gap-2">
                  {result.matched.length === 0 && <span className="text-sm text-muted">No matches yet</span>}
                  {result.matched.map((k) => (
                    <span className="keyword-pill pill-match" key={k}>{k}</span>
                  ))}
                </div>
              </div>

              <div className="card p-6">
                <div className="card-title mb-3">Missing Keywords</div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {result.missing.map((k) => (
                    <span className="keyword-pill pill-miss" key={k}>{k}</span>
                  ))}
                  {result.optional.map((k) => (
                    <span className="keyword-pill pill-optional" key={k}>{k}</span>
                  ))}
                  {!result.missing.length && !result.optional.length && (
                    <span className="text-sm text-muted">Nothing missing</span>
                  )}
                </div>
                {result.suggestions.length > 0 && (
                  <div className="suggestions">
                    <div className="text-xs text-muted mb-2 font-semibold">Quick Fix Suggestions</div>
                    <ul>
                      {result.suggestions.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="card p-6 mt-4">
              <div className="card-title mb-2">Structural Warnings</div>
              {result.warnings.map((w) => {
                const ok = w.startsWith('Your CV uses');
                return (
                  <div className={`warning-row ${ok ? 'ok' : 'warn'}`} key={w}>
                    {ok ? <CheckCircle2 aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
                    <span>{w}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end mt-6">
              <Link to={`/builder/${selectedId}`} className="btn btn-primary">
                Go to Builder &amp; Fix Gaps
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

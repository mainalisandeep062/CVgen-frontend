import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Check, Circle, FilePlus2, GitBranch, Loader2, Star, Upload } from 'lucide-react';

import Modal from '@/components/mockui/Modal';
import { showToast } from '@/components/mockui/toast';
import { createCv, importCvFile, listGithubRepos } from '@/api/cv';
import { apiMessage, unwrap } from '@/api/response';
import { appendRepoProjects, emptyModel, toContent } from '@/cv/content';

import '@/components/cv/cv.css';

/**
 * ImportCvModal - read an existing CV (POST /api/cvs/import) or GitHub repos
 * (GET /api/cvs/import/github/{username}) into a CV.
 *
 * Nothing is saved by the import itself. What happens next depends on where the
 * modal is opened:
 *
 *   dashboard  file   -> "Import & edit" creates a new CV with the parsed content
 *              github -> creates a new CV whose Projects are the chosen repos
 *   builder    file   -> "Replace this CV's content" (onReplaceContent) or a new CV
 *              github -> appends the chosen repos to this CV (onAddProjects)
 */

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const STEPS = ['Upload received', 'Reading document', 'Extracting sections', 'Building editable CV'];

function fileProblem(file) {
  const name = file.name.toLowerCase();
  if (!name.endsWith('.pdf') && !name.endsWith('.docx')) return 'Upload a PDF or a Word (.docx) document.';
  if (file.size > MAX_BYTES) return 'The file is larger than 5 MB.';
  if (file.size === 0) return 'The file is empty.';
  return '';
}

/** "github.com/octocat", "https://github.com/octocat/", "@octocat" -> "octocat" */
function parseGithubUser(value) {
  const trimmed = value.trim().replace(/^@/, '');
  const match = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#\s]+)/i.exec(trimmed);
  return (match ? match[1] : trimmed).replace(/\/+$/, '');
}

function baseName(fileName) {
  return fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
}

export default function ImportCvModal({ open, onClose, context = 'dashboard', onReplaceContent, onAddProjects }) {
  const navigate = useNavigate();
  const inBuilder = context === 'builder';

  /* --- File import --- */
  const fileInput = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [step, setStep] = useState(-1); // -1 idle, 0..3 active step, 4 all done
  const [result, setResult] = useState(null);
  const [fileError, setFileError] = useState('');
  const [creating, setCreating] = useState(false);
  const timers = useRef([]);

  /* --- GitHub --- */
  const [ghUser, setGhUser] = useState('');
  const [ghState, setGhState] = useState('idle'); // idle | loading | ready | error
  const [ghError, setGhError] = useState('');
  const [repos, setRepos] = useState([]);
  const [picked, setPicked] = useState(() => new Set());
  const [adding, setAdding] = useState(false);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const resetFile = () => {
    clearTimers();
    setFile(null);
    setStep(-1);
    setResult(null);
    setFileError('');
  };

  const resetAll = () => {
    resetFile();
    setGhUser('');
    setGhState('idle');
    setGhError('');
    setRepos([]);
    setPicked(new Set());
  };

  const busy = (step >= 0 && step < STEPS.length) || creating || adding;

  const close = () => {
    if (busy) return;
    resetAll();
    onClose();
  };

  const startImport = async (chosen) => {
    if (!chosen) return;
    const problem = fileProblem(chosen);
    setResult(null);
    if (problem) {
      setFile(null);
      setFileError(problem);
      return;
    }
    clearTimers();
    setFile(chosen);
    setFileError('');
    // The request is a single round trip; the steps advance on a timer while
    // it runs and the last one only completes when the server answers.
    setStep(0);
    timers.current.push(setTimeout(() => setStep((s) => (s < 1 ? 1 : s)), 500));
    timers.current.push(setTimeout(() => setStep((s) => (s < 2 ? 2 : s)), 1500));
    timers.current.push(setTimeout(() => setStep((s) => (s < 3 ? 3 : s)), 2800));
    try {
      const data = await importCvFile(chosen);
      clearTimers();
      setStep(STEPS.length);
      setResult(data);
    } catch (error) {
      clearTimers();
      setStep(-1);
      setFileError(apiMessage(error, 'The file could not be imported.'));
    }
  };

  const createFromContent = async (title, content) => {
    setCreating(true);
    try {
      const response = await createCv({ title: title.slice(0, 255) || 'Imported CV', content });
      const created = unwrap(response);
      showToast(apiMessage(response, 'CV created'));
      resetAll();
      onClose();
      navigate(`/builder/${created.id}`);
    } catch (error) {
      showToast(apiMessage(error, 'Could not create the CV.'));
    } finally {
      setCreating(false);
    }
  };

  const importAsNew = () => {
    const name = result?.detected?.fullName?.trim();
    const title = name ? `${name} CV` : baseName(file?.name || '') || 'Imported CV';
    createFromContent(title, result.content);
  };

  const replaceCurrent = () => {
    onReplaceContent?.(result.content);
    resetAll();
    onClose();
  };

  /* --- GitHub --- */
  const fetchRepos = async (event) => {
    event.preventDefault();
    const username = parseGithubUser(ghUser);
    if (!username) {
      setGhError('Enter a GitHub username.');
      setGhState('error');
      return;
    }
    setGhState('loading');
    setGhError('');
    setPicked(new Set());
    try {
      const list = await listGithubRepos(username);
      setRepos(list);
      setGhState('ready');
    } catch (error) {
      setRepos([]);
      setGhError(apiMessage(error, 'Could not fetch repositories for that user.'));
      setGhState('error');
    }
  };

  const togglePick = (name) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const addProjects = async () => {
    const chosen = repos.filter((repo) => picked.has(repo.name));
    if (!chosen.length) return;
    if (inBuilder) {
      onAddProjects?.(chosen);
      resetAll();
      onClose();
      return;
    }
    setAdding(true);
    const username = parseGithubUser(ghUser);
    const model = appendRepoProjects(emptyModel(), chosen);
    await createFromContent(`${username} GitHub projects`, toContent(model, null));
    setAdding(false);
  };

  const detected = result?.detected;
  const stepState = (index) => (index < step ? 'done' : index === step ? 'active' : 'pending');

  return (
    <Modal open={open} onClose={close} title="Import existing CV" large>
      {step === -1 && (
        <>
          <button
            type="button"
            className={`upload-drop${dragging ? ' is-dragging' : ''}`}
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              startImport(e.dataTransfer.files?.[0]);
            }}
          >
            <span className="icon-chip" aria-hidden="true"><Upload /></span>
            <div className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>Click to upload or drag and drop</div>
            <div className="text-xs text-muted mt-1">PDF or DOCX, max 5 MB</div>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            hidden
            onChange={(e) => {
              startImport(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          {fileError && (
            <div className="alert alert-danger mt-3" role="alert">
              <AlertCircle aria-hidden="true" />
              <span>{fileError}</span>
            </div>
          )}
        </>
      )}

      {step >= 0 && (
        <>
          {file && (
            <div className="import-file">
              <FilePlus2 aria-hidden="true" />
              <span className="import-file-name">{file.name}</span>
              <span className="text-xs text-muted">{(file.size / 1024).toFixed(0)} KB</span>
            </div>
          )}
          <ol className="import-steps import-stepper" aria-live="polite">
            {STEPS.map((label, index) => {
              const state = stepState(index);
              return (
                <li className={`import-step ${state}`} key={label}>
                  <span className="import-step-icon">
                    {state === 'done' ? (
                      <Check aria-hidden="true" />
                    ) : state === 'active' ? (
                      <Loader2 className="spin" aria-hidden="true" />
                    ) : (
                      <Circle aria-hidden="true" />
                    )}
                  </span>
                  <span>{label}</span>
                </li>
              );
            })}
          </ol>
        </>
      )}

      {result && (
        <div className="import-review">
          <div className="font-semibold text-sm mb-2">Review extracted data</div>
          <div className="kv-panel">
            <div className="kv-row"><span className="font-semibold">Name</span><span>{detected?.fullName || 'Not found'}</span></div>
            <div className="kv-row"><span className="font-semibold">Email</span><span>{detected?.email || 'Not found'}</span></div>
            <div className="import-counts">
              <span><b>{detected?.experience ?? 0}</b> experience</span>
              <span><b>{detected?.education ?? 0}</b> education</span>
              <span><b>{detected?.skills ?? 0}</b> skills</span>
              <span><b>{detected?.projects ?? 0}</b> projects</span>
            </div>
          </div>
          {inBuilder && (
            <p className="text-xs text-muted mb-3">
              Replacing overwrites the content of the CV you are editing. Creating a new CV leaves this one untouched.
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            {inBuilder ? (
              <>
                <button type="button" className="btn btn-primary btn-sm" onClick={replaceCurrent} disabled={creating}>
                  Replace this CV&apos;s content
                </button>
                <button type="button" className="btn btn-outline btn-sm" onClick={importAsNew} disabled={creating}>
                  {creating && <Loader2 className="spin" aria-hidden="true" />}
                  Create as new CV
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" onClick={importAsNew} disabled={creating}>
                {creating && <Loader2 className="spin" aria-hidden="true" />}
                Import &amp; edit
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetFile} disabled={creating}>
              Start over
            </button>
          </div>
        </div>
      )}

      <div className="auth-divider">Or import from GitHub</div>

      <form className="gh-form" onSubmit={fetchRepos}>
        <label className="sr-only" htmlFor="gh-user">GitHub username</label>
        <input
          id="gh-user"
          type="text"
          className="input"
          placeholder="github.com/username"
          autoComplete="off"
          value={ghUser}
          onChange={(e) => setGhUser(e.target.value)}
        />
        <button type="submit" className="btn btn-secondary" disabled={ghState === 'loading'}>
          {ghState === 'loading' ? <Loader2 className="spin" aria-hidden="true" /> : <GitBranch aria-hidden="true" />}
          Fetch repos
        </button>
      </form>

      {ghState === 'error' && (
        <div className="alert alert-danger mt-3" role="alert">
          <AlertCircle aria-hidden="true" />
          <span>{ghError}</span>
        </div>
      )}

      {ghState === 'ready' && repos.length === 0 && (
        <p className="text-sm text-muted mt-3">No public repositories found for that user.</p>
      )}

      {ghState === 'ready' && repos.length > 0 && (
        <>
          <ul className="repo-list">
            {repos.map((repo) => (
              <li key={repo.name}>
                <label className={`repo-item${picked.has(repo.name) ? ' selected' : ''}`}>
                  <input type="checkbox" checked={picked.has(repo.name)} onChange={() => togglePick(repo.name)} />
                  <span className="repo-body">
                    <span className="repo-head">
                      <span className="repo-name">{repo.name}</span>
                      {repo.language && <span className="repo-lang">{repo.language}</span>}
                      <span className="repo-stars"><Star aria-hidden="true" />{repo.stars ?? 0}</span>
                    </span>
                    {repo.description && <span className="repo-desc">{repo.description}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex justify-between items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-muted">
              {inBuilder ? 'Added to the Projects section of this CV.' : 'Creates a new CV with these projects.'}
            </span>
            <button type="button" className="btn btn-primary btn-sm" disabled={!picked.size || adding} onClick={addProjects}>
              {adding && <Loader2 className="spin" aria-hidden="true" />}
              Add {picked.size || ''} project{picked.size === 1 ? '' : 's'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

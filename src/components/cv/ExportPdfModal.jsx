import { useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileText, Loader2 } from 'lucide-react';

import Modal from '@/components/mockui/Modal';
import { exportCvPdf, saveBlob } from '@/api/cv';
import { apiMessage } from '@/api/response';

import '@/components/cv/cv.css';

/**
 * ExportPdfModal - server-rendered PDF download (GET /api/cvs/{id}/export.pdf).
 *
 * The server renders what it has SAVED, so the caller passes `beforeExport`
 * (the builder flushes its pending autosave there) and the request waits on it.
 * The file name is the server's (Content-Disposition); before the first render
 * the panel shows a guess from the title.
 */
export default function ExportPdfModal({ open, onClose, cvId, title, templateLabel, beforeExport }) {
  const [phase, setPhase] = useState('idle'); // idle | rendering | done | error
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const guessedName = `${(title || 'CV').trim().replace(/[^\w\- ]+/g, '').replace(/\s+/g, '_') || 'CV'}.pdf`;

  const close = () => {
    if (phase === 'rendering') return;
    setPhase('idle');
    setError('');
    setFileName('');
    onClose();
  };

  const download = async () => {
    setPhase('rendering');
    setError('');
    try {
      await beforeExport?.();
      const { blob, fileName: serverName } = await exportCvPdf(cvId);
      saveBlob(blob, serverName);
      setFileName(serverName);
      setPhase('done');
    } catch (err) {
      setError(apiMessage(err, 'The PDF could not be created. Try again in a moment.'));
      setPhase('error');
    }
  };

  const banner = {
    idle: {
      cls: 'pending',
      icon: <FileText aria-hidden="true" />,
      title: 'Ready to export',
      text: 'Your CV is rendered on the server as a PDF with selectable text.',
    },
    error: {
      cls: 'pending',
      icon: <FileText aria-hidden="true" />,
      title: 'Ready to export',
      text: 'Your CV is rendered on the server as a PDF with selectable text.',
    },
    rendering: {
      cls: 'processing',
      icon: <Loader2 className="spin" aria-hidden="true" />,
      title: 'Rendering your PDF…',
      text: 'This usually takes a few seconds.',
    },
    done: {
      cls: 'complete',
      icon: <CheckCircle2 aria-hidden="true" />,
      title: 'Export complete, your file is ready',
      text: 'Your download should have started. Use the button to download it again.',
    },
  }[phase];

  return (
    <Modal
      open={open}
      onClose={close}
      title="Export CV to PDF"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={close} disabled={phase === 'rendering'}>
            {phase === 'done' ? 'Close' : 'Cancel'}
          </button>
          <button type="button" className="btn btn-primary" onClick={download} disabled={phase === 'rendering' || !cvId}>
            {phase === 'rendering' ? <Loader2 className="spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
            {phase === 'done' ? 'Download again' : 'Download PDF'}
          </button>
        </>
      }
    >
      <div className={`job-state ${banner.cls}`} role="status" aria-live="polite">
        <div className="job-state-icon">{banner.icon}</div>
        <div>
          <div className="font-semibold text-sm">{banner.title}</div>
          <div className="text-xs" style={{ opacity: 0.85 }}>{banner.text}</div>
        </div>
      </div>

      <div className="kv-panel">
        <div className="kv-row">
          <span className="font-semibold">Template</span>
          <span>{templateLabel || '-'}</span>
        </div>
        <div className="kv-row">
          <span className="font-semibold">File name</span>
          <span>{fileName || guessedName}</span>
        </div>
      </div>

      {phase === 'error' && (
        <div className="alert alert-danger" role="alert">
          <AlertCircle aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </Modal>
  );
}

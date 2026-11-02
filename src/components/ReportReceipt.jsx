import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, Copy, Download, Plus } from 'lucide-react';

export default function ReportReceipt({ receipt, onAnother }) {
  const [copyState, setCopyState] = useState('');
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, []);
  async function copy() {
    try { await navigator.clipboard.writeText(receipt.id); setCopyState('copied'); }
    catch { setCopyState('failed'); }
  }
  function save() {
    const content = `SANARIS — Report receipt\n\nReference: ${receipt.id}\nSubmitted: ${new Date(receipt.createdAt).toLocaleString()}\nStatus at submission: ${receipt.status}\n\nKeep this reference to check your report on the SANARIS resident portal.\n`;
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${receipt.id}-receipt.txt`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="resident-card report-receipt" aria-labelledby="receipt-title">
    <span className="receipt-check"><CheckCircle2 size={34} aria-hidden="true" /></span>
    <p className="resident-kicker">SUCCESSFULLY SUBMITTED</p>
    <h2 id="receipt-title" tabIndex={-1} ref={heading}>Your concern has been received.</h2>
    <p>The barangay admin can now review your report. Save your reference number to follow its progress.</p>
    <div className="receipt-reference"><span>Your reference number</span><strong>{receipt.id}</strong><span>Keep this number for your records.</span></div>
    <div className="receipt-save-actions">
      <button className="secondary" onClick={copy}>{copyState === 'copied' ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}{copyState === 'copied' ? 'Reference copied' : 'Copy reference'}</button>
      <button className="secondary" onClick={save}><Download size={17} aria-hidden="true" />Save receipt</button>
    </div>
    <p className="receipt-copy-status" role="status">{copyState === 'copied' ? 'Reference copied. Paste it somewhere you can find it later.' : copyState === 'failed' ? 'Copy is unavailable. Select the reference above, or save your receipt.' : ''}</p>
    <a className="primary receipt-track" href={`#/track?ref=${encodeURIComponent(receipt.id)}`}>Track my report<ArrowRight size={18} aria-hidden="true" /></a>
    <button className="resident-text-button receipt-another" onClick={onAnother}><Plus size={16} aria-hidden="true" />Report another concern</button>
  </section>;
}

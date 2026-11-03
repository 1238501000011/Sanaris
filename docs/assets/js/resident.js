import { requestApi, watchResource } from './api.js?v=camia-clover-1';
import { localDateTime, noiseCategories, referencePattern, validateResidentReport } from './residentForm.js?v=camia-clover-1';
import { escapeHTML as e, icon, brand, badge, field, notice, downloadText, dateTime } from './ui.js?v=camia-clover-1';

const root = document.querySelector('#app');
const blankDraft = () => ({ location: '', category: '', incidentAt: '', description: '', consent: false });
const categoryIcons = ['music', 'construction', 'car', 'people', 'more'];
const descriptions = {
  Submitted: 'Your report has been received and is waiting for admin review.',
  'Under review': 'The barangay admin is reviewing your concern.',
  'In progress': 'The admin has marked your concern as being addressed.',
  Resolved: 'The admin has marked your report as resolved.',
};
let draft = blankDraft(), errors = {}, receipt, submission, submitting = false, submitError = '';
let page = 'report', tracker, trackQuery = '', trackResult, trackError = '', trackLoading = false;

function help(tracking) {
  return `<aside class="resident-help" aria-label="Reporting help">
    <section class="resident-next"><span class="resident-next-icon">${icon('shield', 23)}</span><h2>${tracking ? 'Stay informed, simply.' : 'What happens next?'}</h2><p>Your report helps the barangay understand and respond to local noise concerns.</p>
      <ol>${[['check', 'Report received', 'Your concern goes to the admin inbox.'], ['search', 'Reviewed by the admin', 'The barangay assesses your concern.'], ['list', 'Follow its progress', 'Use your reference to see status updates.']].map(([image, title, text]) => `<li><span>${icon(image, 17)}</span><div><h3>${title}</h3><p>${text}</p></div></li>`).join('')}</ol></section>
    <section class="resident-faq" aria-label="Common questions"><h2>${icon('help', 18)} A little help</h2>
      <details><summary>Do I need an account?${icon('chevron', 17)}</summary><p>No. You can submit a report without signing in. No name or phone number is required.</p></details>
      <details><summary>${tracking ? 'Where is my reference number?' : 'What details should I include?'}${icon('chevron', 17)}</summary><p>${tracking ? 'It appears on the confirmation screen after you submit. Look in your saved receipt, or paste the number you copied.' : 'Add a recognizable location, the time, and a short description of the noise and how long it lasted. Avoid sharing personal or sensitive details.'}</p></details>
      <a href="${tracking ? '#/report' : '#/track'}">${tracking ? 'Report another concern' : 'Already sent a report? Track it'}${icon('arrow', 16)}</a></section>
    <p class="resident-urgent">Need urgent help? Contact your local emergency services directly. This portal is for non-emergency noise concerns.</p>
  </aside>`;
}
const described = name => `aria-describedby="${name}-hint ${name}-error" ${errors[name] ? 'aria-invalid="true"' : ''}`;
function reportForm() {
  return `<section class="resident-card resident-report-card" aria-labelledby="report-title">
    <div class="resident-card-heading"><span class="resident-section-icon">${icon('message', 21)}</span><div><h2 id="report-title">Tell us what happened</h2><p>A few details will help the barangay review your concern.</p></div></div>
    <form id="report-form" class="resident-report-form" novalidate aria-busy="${submitting}">
      <p class="resident-required">All fields are required.</p>
      <fieldset class="resident-form-section" ${submitting ? 'disabled' : ''}><legend><span>01</span>Location &amp; noise</legend>
        ${field({ id: 'location', label: 'Where is the noise coming from?', hint: 'Include a street, purok, or familiar landmark in Barangay San Pablo, Catbalogan City.', error: errors.location,
          control: `<div class="resident-input-icon">${icon('pin', 18)}<input id="location" name="location" required maxlength="160" value="${e(draft.location)}" placeholder="e.g. Camia Street, near a familiar landmark" ${described('location')}></div>` })}
        <fieldset class="noise-options-field" aria-describedby="category-error"><legend>What type of noise is it?</legend>
          <div class="noise-options">${noiseCategories.map((category, i) => `<label class="noise-option ${draft.category === category ? 'is-selected' : ''}"><input type="radio" name="category" value="${e(category)}" required ${draft.category === category ? 'checked' : ''} ${errors.category ? 'aria-invalid="true"' : ''}><span class="noise-option-content">${icon(categoryIcons[i], 21)}<span>${e(category)}</span>${icon('check', 13, 'noise-choice-check')}</span></label>`).join('')}</div>
          <p id="category-error" class="field-error" ${errors.category ? '' : 'hidden'}>${e(errors.category)}</p></fieldset>
      </fieldset>
      <fieldset class="resident-form-section" ${submitting ? 'disabled' : ''}><legend><span>02</span>Time &amp; details</legend>
        ${field({ id: 'incidentAt', label: 'When did it happen?', hint: 'Choose the local date and time the noise occurred.', error: errors.incidentAt,
          control: `<div class="resident-time-row"><input id="incidentAt" name="incidentAt" type="datetime-local" required value="${e(draft.incidentAt)}" max="${localDateTime()}" ${described('incidentAt')}><button type="button" class="secondary" data-action="now">${icon('clock', 16)}Use current time</button></div>` })}
        ${field({ id: 'description', label: 'Tell us a little more', hint: 'Describe the sound, how long it lasted, and how it affected the area. Avoid personal or sensitive information.', error: errors.description,
          control: `<textarea id="description" name="description" required minlength="10" maxlength="1500" rows="4" placeholder="e.g. Loud music has been playing for about an hour and can be heard inside nearby homes." ${described('description')}>${e(draft.description)}</textarea><span class="resident-character-count">${draft.description.length.toLocaleString()} / 1,500</span>` })}
      </fieldset>
      <div class="resident-form-bottom"><label class="resident-consent" for="consent"><input id="consent" name="consent" type="checkbox" required ${draft.consent ? 'checked' : ''} ${submitting ? 'disabled' : ''} aria-describedby="consent-error" ${errors.consent ? 'aria-invalid="true"' : ''}><span>I confirm these details are accurate and agree to share this report with the barangay admin.</span></label>
        <p id="consent-error" class="field-error" ${errors.consent ? '' : 'hidden'}>${e(errors.consent)}</p>
        <div id="submit-error">${submitError ? notice(submitError + ' Your details are still here; you can retry.') : ''}</div>
        <div class="resident-submit-row"><p>${icon('shield', 17)}<span>No account needed.<br>For the barangay admin.</span></p><button class="primary" type="submit" ${submitting ? 'disabled' : ''}>${icon(submitting ? 'clock' : 'send', 18)}${submitting ? 'Sending report…' : 'Send report'}</button></div>
      </div>
    </form></section>`;
}
function receiptView() {
  return `<section class="resident-card report-receipt" aria-labelledby="receipt-title"><span class="receipt-check">${icon('check', 34)}</span><p class="resident-kicker">SUCCESSFULLY SUBMITTED</p><h2 id="receipt-title" tabindex="-1">Your concern has been received.</h2><p>The barangay admin can now review your report. Save your reference number to follow its progress.</p>
    <div class="receipt-reference"><span>Your reference number</span><strong>${e(receipt.id)}</strong><span>Keep this number for your records.</span></div>
    <div class="receipt-save-actions"><button class="secondary" data-action="copy">${icon('copy', 17)}Copy reference</button><button class="secondary" data-action="save">${icon('download', 17)}Save receipt</button></div><p class="receipt-copy-status" role="status"></p>
    <a class="primary receipt-track" href="#/track?ref=${encodeURIComponent(receipt.id)}">Track my report${icon('arrow', 18)}</a><button class="resident-text-button receipt-another" data-action="another">${icon('plus', 16)}Report another concern</button></section>`;
}
function trackingForm() {
  return `<section class="resident-card tracking-card" aria-labelledby="tracking-title"><div class="resident-card-heading"><span class="resident-section-icon">${icon('search', 21)}</span><div><h2 id="tracking-title">Track your report</h2><p>A reference number is all you need.</p></div></div>
    <form id="track-form" class="resident-track-form" novalidate aria-busy="false">${field({ id: 'reference', label: 'Reference number', hint: 'Find this on the confirmation screen or your saved receipt.', control: `<input id="reference" name="reference" required maxlength="64" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="Paste your SAN- reference number" value="${e(trackQuery)}" aria-describedby="reference-hint reference-error">` })}<button class="primary" type="submit">${icon('search', 18)}Check report status</button></form><div id="tracking-output" aria-live="polite"></div></section>`;
}
function renderTrackResult() {
  if (page !== 'track') return;
  const output = document.querySelector('#tracking-output');
  document.querySelector('#track-form').setAttribute('aria-busy', String(trackLoading));
  const button = document.querySelector('#track-form button'); button.disabled = trackLoading;
  button.innerHTML = icon(trackLoading ? 'clock' : 'search', 18) + (trackLoading ? 'Checking report…' : 'Check report status');
  output.innerHTML = (trackError ? notice(trackError) : '') + (trackLoading ? '<p class="tracking-loading" role="status">Looking up your report…</p>' : '') + (trackResult ? `
    <div class="resident-tracking-result"><div class="tracking-status"><div><span>Current status</span><h3>${e(trackResult.status)}</h3></div>${badge(trackResult.status)}</div><p class="tracking-status-description">${e(descriptions[trackResult.status])}</p><div class="tracking-reference"><span>Reference</span><strong>${e(trackResult.id)}</strong></div><h3 class="tracking-history-title">Report history</h3><ol class="resident-timeline">${trackResult.updates.map(update => `<li><span>${icon('check', 18)}</span><div><strong>${e(update.status)}</strong><time datetime="${e(update.at)}">${e(dateTime(update.at))}</time></div></li>`).join('')}</ol><p class="tracking-auto-note">This page checks for status updates automatically.</p></div>` : !trackLoading && !trackError ? `<div class="tracking-placeholder"><span>${icon('list', 29)}</span><h3>Your report, at a glance.</h3><p>Enter your reference above to see its current status and review history.</p></div>` : '');
}
function startTracking(value) {
  tracker?.stop(); trackResult = null; trackError = ''; trackLoading = false;
  const input = document.querySelector('#reference'), error = document.querySelector('#reference-error');
  input.value = trackQuery = value.trim().toUpperCase();
  if (!referencePattern.test(trackQuery)) {
    error.textContent = 'Enter the complete reference number from your receipt.'; error.hidden = false;
    input.setAttribute('aria-invalid', 'true'); renderTrackResult(); input.focus(); return;
  }
  error.hidden = true; input.removeAttribute('aria-invalid'); trackLoading = true; renderTrackResult();
  // Keep the reference in the link so it can be bookmarked. No report details are put in the URL.
  history.replaceState(null, '', '#/track?ref=' + encodeURIComponent(trackQuery));
  tracker = watchResource('/api/complaints/' + encodeURIComponent(trackQuery), result => {
    const changed = trackLoading || trackError || JSON.stringify(result) !== JSON.stringify(trackResult);
    trackResult = result; trackError = ''; trackLoading = false; if (changed) renderTrackResult();
  }, failure => { trackLoading = false; trackError = failure.message; renderTrackResult(); });
}
function render() {
  tracker?.stop(); tracker = null;
  const [pathname, search] = (location.hash || '#/report').split('?');
  page = pathname === '#/report' ? 'report' : pathname === '#/track' ? 'track' : 'missing';
  const reference = new URLSearchParams(search).get('ref')?.trim().toUpperCase() || '';
  if (reference) trackQuery = reference;
  const tracking = page === 'track';
  document.title = `${tracking ? 'Track your report' : 'Resident reporting'} · SANARIS`;
  root.innerHTML = `<div class="resident-app"><a class="resident-skip" href="#resident-main" data-action="skip">Skip to content</a>
    <header class="resident-header"><div class="resident-container resident-header-inner"><div class="resident-brand">${brand('#/report')}<span>RESIDENT SERVICES</span></div><div class="resident-location">${icon('pin', 17)}<span>Barangay San Pablo, Catbalogan City<small>Community noise reporting</small></span></div></div></header>
    <main id="resident-main" tabindex="-1" class="resident-main resident-container"><div class="resident-intro"><p class="resident-kicker">${icon('shield', 15)} YOUR COMMUNITY. YOUR VOICE.</p><h1>${tracking ? 'Stay updated on your concern.' : 'Let’s make our community quieter.'}</h1><p>${tracking ? 'Follow your report from submission to resolution. No sign-in needed.' : 'Report a noise concern in a few simple steps. We’ll help you get it to the barangay.'}</p></div>
      <nav class="resident-navigation" aria-label="Resident services"><a href="#/report" ${page === 'report' ? 'aria-current="page"' : ''}>${icon('message', 19)}Report a concern</a><a href="#/track" ${tracking ? 'aria-current="page"' : ''}>${icon('list', 19)}Track a report</a></nav>
      ${page === 'missing' ? '<section class="resident-card resident-not-found"><h2>Page not found</h2><p>Return to the reporting form to send a concern.</p><a class="primary" href="#/report">Report a concern</a></section>' : `<div class="resident-layout">${tracking ? trackingForm() : receipt ? receiptView() : reportForm()}${help(tracking)}</div>`}
    </main><footer class="resident-footer resident-container"><p><strong>SANARIS</strong><span>A quieter community, together.</span></p><span>Barangay San Pablo, Catbalogan City · Resident services</span></footer></div>`;
  if (tracking) { trackResult = null; trackLoading = false; trackError = ''; renderTrackResult(); if (reference) startTracking(reference); }
}
function change(name, value) {
  draft[name] = value; delete errors[name]; submitError = '';
  const error = document.getElementById(name + '-error'); if (error) error.hidden = true;
  root.querySelectorAll(`[name="${name}"]`).forEach(input => input.removeAttribute('aria-invalid'));
  const submitNotice = document.querySelector('#submit-error'); if (submitNotice) submitNotice.innerHTML = '';
  if (name === 'description') document.querySelector('.resident-character-count').textContent = draft.description.length.toLocaleString() + ' / 1,500';
  if (name === 'category') document.querySelectorAll('.noise-option').forEach(label => label.classList.toggle('is-selected', label.querySelector('input').checked));
}
root.addEventListener('input', event => {
  const { name, value, type, checked } = event.target;
  if (Object.hasOwn(draft, name)) change(name, type === 'checkbox' ? checked : value);
  if (name === 'reference') trackQuery = value;
});
root.addEventListener('submit', async event => {
  event.preventDefault();
  if (event.target.id === 'track-form') { startTracking(event.target.elements.reference.value); return; }
  if (event.target.id !== 'report-form' || submitting) return;
  errors = validateResidentReport(draft);
  if (Object.keys(errors).length) { render(); root.querySelector(`[name="${Object.keys(errors)[0]}"]`)?.focus(); return; }
  const report = { location: draft.location.trim(), category: draft.category, description: draft.description.trim(), incidentAt: new Date(draft.incidentAt).toISOString() };
  const fingerprint = JSON.stringify(report);
  if (submission?.fingerprint !== fingerprint) submission = { fingerprint, key: crypto.randomUUID() };
  submitting = true; submitError = ''; render();
  try {
    receipt = await requestApi('/api/complaints', { method: 'POST', body: report, key: submission.key });
    submission = null; draft = blankDraft();
  } catch (failure) { submitError = failure.message; }
  finally { submitting = false; if (page === 'report') { render(); document.querySelector(receipt ? '#receipt-title' : '#submit-error')?.focus(); } }
});
root.addEventListener('click', async event => {
  const target = event.target.closest('[data-action]'); if (!target) return;
  const action = target.dataset.action;
  if (action === 'skip') { event.preventDefault(); document.querySelector('#resident-main').focus(); }
  if (action === 'now') { const value = localDateTime(); const input = document.querySelector('#incidentAt'); input.value = value; input.max = value; change('incidentAt', value); }
  if (action === 'another') { receipt = null; errors = {}; submitError = ''; render(); document.querySelector('#location').focus(); }
  if (action === 'copy' && receipt) {
    try { await navigator.clipboard.writeText(receipt.id); target.innerHTML = icon('check', 17) + 'Reference copied'; document.querySelector('.receipt-copy-status').textContent = 'Reference copied. Paste it somewhere you can find it later.'; }
    catch { document.querySelector('.receipt-copy-status').textContent = 'Copy is unavailable. Select the reference above, or save your receipt.'; }
  }
  if (action === 'save' && receipt) downloadText(`SANARIS — Report receipt\n\nReference: ${receipt.id}\nSubmitted: ${dateTime(receipt.createdAt)}\nStatus at submission: ${receipt.status}\n\nKeep this reference to check your report on the SANARIS resident portal.\n`, receipt.id + '-receipt.txt');
});
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
window.addEventListener('pagehide', () => tracker?.stop());
render();

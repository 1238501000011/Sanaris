import { Panel } from './UI';

export function AssessmentSummary({ settings }) {
 return <div className="assessment-summary"><div><strong>Demo sample classification</strong><p>Low: below {settings.moderate} · Moderate: {settings.moderate} to below {settings.high} · High: {settings.high}+ dB(A).</p></div><div><strong>Nighttime assessment: not available</strong><p>WHO references use an 8-hour energy average. These simulated samples cannot establish compliance.</p></div><a href="#/admin/settings">View guidance & settings →</a></div>;
}

export default function NoiseGuidance() {
 return <Panel title="Nighttime noise guidance" subtitle="Health guidance and local legal limits are separate assessments.">
  <div className="guideline-grid">
   <article><span className="eyebrow">OUTSIDE BEDROOMS</span><h2>45 <small>dBA</small></h2><p>WHO 1999 · LAeq,8h</p><p className="muted small">Eight-hour energy average outside bedrooms, with windows open.</p></article>
   <article><span className="eyebrow">INSIDE BEDROOMS</span><h2>30 <small>dBA</small></h2><p>WHO 1999 · LAeq,8h</p><p className="muted small">Eight-hour energy average indoors. An outdoor node cannot assess bedroom exposure.</p></article>
  </div>
  <p className="note">These are average-exposure guidelines, not instantaneous maximums or universal legal limits. The 1999 guidance separately lists maximum event levels of 60 dBA outside bedrooms and 45 dBA inside bedrooms (LAmax, fast).</p>
  <div className="assessment-details"><p><b>WHO assessment: not evaluated.</b> The demo has neither a complete eight-hour measurement record nor calibrated, duration-defined sound measurements. Low / Moderate / High describe configurable demo samples only.</p><p><b>Hinabangan ordinance: unverified.</b> No local ordinance, legal threshold, or official nighttime schedule has been configured. Alerts request human review and do not establish violations.</p><p>WHO’s 2009 European guidance uses a different metric: 40 dB Lnight,outside, an annual-average nighttime exposure target. It is not a threshold for a single reading.</p></div>
  <div className="guideline-links"><a href="https://iris.who.int/bitstream/handle/10665/326582/9789289013567-eng.pdf?isAllowed=y&sequence=4" target="_blank" rel="noreferrer">WHO community noise guidance ↗</a><a href="https://www.who.int/europe/publications/i/item/9789289041737" target="_blank" rel="noreferrer">WHO night noise guidelines (2009) ↗</a></div>
 </Panel>;
}

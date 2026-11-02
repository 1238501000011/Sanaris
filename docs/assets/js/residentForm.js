export const noiseCategories = ['Amplified music', 'Construction', 'Vehicle noise', 'Gathering', 'Other'];
export const referencePattern = /^SAN-\d{4}-[A-F0-9]{12,24}$/;

export function localDateTime(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function validateResidentReport(draft, now = Date.now()) {
  const errors = {};
  if (!draft.location.trim()) errors.location = 'Add a street, purok, or nearby landmark.';
  else if (draft.location.trim().length > 160) errors.location = 'Keep the location within 160 characters.';
  if (!noiseCategories.includes(draft.category)) errors.category = 'Choose the type of noise that best fits.';
  const incident = Date.parse(draft.incidentAt);
  if (!Number.isFinite(incident)) errors.incidentAt = 'Choose when the noise happened, or tap “Use current time”.';
  else if (incident > now + 60_000) errors.incidentAt = 'The time cannot be in the future.';
  if (draft.description.trim().length < 10) errors.description = 'Add a little more detail (at least 10 characters).';
  else if (draft.description.trim().length > 1500) errors.description = 'Keep the description within 1,500 characters.';
  if (!draft.consent) errors.consent = 'Please confirm the details before sending your report.';
  return errors;
}

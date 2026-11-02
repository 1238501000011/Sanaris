import { useState } from 'react';
import { AlertCircle, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import '../styles/forms.css';

export function Field({ id, label, hint, error, children, className = '' }) {
  return <div className={`form-field ${className}`}>
    <label htmlFor={id}>{label}</label>
    {children}
    {hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
    {error && <p id={`${id}-error`} className="field-error">{error}</p>}
  </div>;
}

export function FormNotice({ children, id }) {
  return <div className="form-notice" id={id} role="alert"><AlertCircle size={19} aria-hidden="true" /><p>{children}</p></div>;
}

export function PasswordField({ id, label, setup, disabled, hint, invalid }) {
  const [visible, setVisible] = useState(false);
  return <Field id={id} label={label} hint={hint}>
    <div className="password-control">
      <LockKeyhole size={18} aria-hidden="true" />
      <input id={id} name={id} type={visible ? 'text' : 'password'} required
        minLength={setup ? 12 : 1} maxLength={128} disabled={disabled}
        autoComplete={setup ? 'new-password' : 'current-password'}
        aria-invalid={invalid || undefined} aria-describedby={hint ? `${id}-hint` : undefined}
        placeholder={setup ? 'Choose a password' : 'Enter password'} />
      <button type="button" className="password-toggle" onClick={() => setVisible(!visible)}
        aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} disabled={disabled}>
        {visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
      </button>
    </div>
  </Field>;
}

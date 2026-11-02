export default function Brand({ href = '#/admin/overview' }) {
  return <a href={href} className="brand">
    <span className="brand-tile"><img className="brand-logo" src="/sanaris-logo.png" alt="" width="160" height="160" /></span>
    <strong className="brand-name">SANARIS</strong>
  </a>;
}

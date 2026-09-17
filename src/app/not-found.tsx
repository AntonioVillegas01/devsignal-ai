import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="shell inner-page">
      <span className="eyebrow">404 / NO SIGNAL</span>
      <h1>
        This page
        <br />
        <span>is off the map.</span>
      </h1>
      <p className="page-lead">
        The dispatch may not exist, or its address has changed.
      </p>
      <Link href="/" className="button">
        Return to the publication ↗
      </Link>
    </div>
  );
}

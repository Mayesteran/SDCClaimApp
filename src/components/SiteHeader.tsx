export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a className="brand" href="#/">
          <svg className="brand__mark" viewBox="0 0 64 44" aria-hidden="true">
            <ellipse cx="32" cy="22" rx="31" ry="21" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <g fill="currentColor">
              <circle cx="20" cy="18" r="5.2" />
              <circle cx="34" cy="12.5" r="2.7" />
              <circle cx="43.5" cy="18.5" r="2.7" />
              <circle cx="38.5" cy="27.5" r="2.7" />
              <circle cx="27" cy="31" r="2.7" />
              <circle cx="48" cy="29.5" r="2.7" />
            </g>
          </svg>
          <span className="brand__text">
            <span className="brand__name">Subaru Distributors Corp.</span>
            <span className="brand__app">Transportation Damage Claims</span>
          </span>
        </a>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>
        Questions about a claim? Contact the SDC Distribution department. © {new Date().getFullYear()} Subaru Distributors Corp.
      </p>
    </footer>
  );
}

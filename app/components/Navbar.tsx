import { useState, useEffect } from "react";
import { NavLink, Link, useLocation } from "@remix-run/react";
import { HamburgerIcon, CloseIcon, SocialIcon } from "./Icons";

export interface NavItem {
  label: string;
  url: string;
  openInNewTab?: boolean;
}

export interface NavbarProps {
  logoUrl?: string;
  logoAlt?: string;
  nav: NavItem[];
  social?: { platform: string; url: string }[];
  children?: React.ReactNode;
}

export default function Navbar({ logoUrl, logoAlt, nav, social, children }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  /* Close on route change */
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  /* Add body class for push + overflow lock */
  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add("menu-open");
    } else {
      document.body.classList.remove("menu-open");
    }
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  function toggleMenu() {
    setMenuOpen((prev) => !prev);
  }

  const logoNode = logoUrl ? (
    <img src={logoUrl} alt={logoAlt ?? "103 Tactical"} className="nav-logo" />
  ) : (
    <span className="nav-logo-text">103 Tactical</span>
  );

  return (
    <>
      {/* ── Mobile Sidenav (outside app-content so it stays fixed) ── */}
      <aside
        className={menuOpen ? "sidenav sidenav--open" : "sidenav"}
        aria-hidden={!menuOpen}
      >
        <nav className="sidenav__nav" aria-label="Mobile navigation">
          {nav.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              className={({ isActive }) =>
                isActive ? "sidenav__link sidenav__link--active" : "sidenav__link"
              }
              target={item.openInNewTab ? "_blank" : undefined}
              rel={item.openInNewTab ? "noopener noreferrer" : undefined}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {social && social.length > 0 && (
          <div className="sidenav__social">
            {social.map((s) => (
              <a
                key={s.platform}
                href={s.url}
                className="sidenav__social-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.platform}
              >
                <SocialIcon platform={s.platform} className="icon" />
              </a>
            ))}
          </div>
        )}
      </aside>

      {/* ── App content — slides right when menu opens ────────────── */}
      <div className="app-content">

        {/* Mobile header */}
        <header className="mobile-header">
          <button
            className="mobile-header__hamburger"
            onClick={toggleMenu}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen
              ? <CloseIcon className="icon" />
              : <HamburgerIcon className="icon" />}
          </button>

          <Link to="/" className="mobile-header__logo-link" aria-label="103 Tactical — home">
            {logoNode}
          </Link>

          {/* Right slot — reserved for future icon */}
          <div className="mobile-header__right" aria-hidden="true" />
        </header>

        {/* Mobile logo — centered below the header bar, hidden on desktop */}
        <div className="mobile-logo">
          {logoUrl
            ? <img src={logoUrl} alt={logoAlt ?? "103 Tactical"} className="mobile-logo__img" />
            : <span className="mobile-logo__text">103 Tactical</span>
          }
        </div>

        {/* Desktop navbar */}
        <header className="navbar-desktop">
          <div className="navbar-desktop__inner">
            <Link to="/" className="navbar-desktop__logo-link" aria-label="103 Tactical — home">
              {logoNode}
            </Link>

            <nav className="navbar-desktop__nav" aria-label="Primary navigation">
              {nav.map((item) => (
                <NavLink
                  key={item.url}
                  to={item.url}
                  className={({ isActive }) =>
                    isActive
                      ? "navbar-desktop__link navbar-desktop__link--active"
                      : "navbar-desktop__link"
                  }
                  target={item.openInNewTab ? "_blank" : undefined}
                  rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>

        {/* Page content + footer */}
        {children}
      </div>
    </>
  );
}

import { useState, useEffect, useRef } from "react";
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
}

export default function Navbar({ logoUrl, logoAlt, nav, social }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const sidenavRef = useRef<HTMLElement>(null);

  /* Close menu on route change */
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  /* Prevent body scroll when sidenav is open */
  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add("sidenav-open");
    } else {
      document.body.classList.remove("sidenav-open");
    }
    return () => document.body.classList.remove("sidenav-open");
  }, [menuOpen]);

  /* Close on outside click */
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuOpen && sidenavRef.current && !sidenavRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  function toggleMenu() {
    setMenuOpen((prev) => !prev);
  }

  return (
    <>
      {/* ── Mobile Sidenav ───────────────────────────────────── */}
      <aside
        ref={sidenavRef}
        className={menuOpen ? "sidenav sidenav--open" : "sidenav"}
        aria-hidden={!menuOpen}
      >
        <div className="sidenav__header">
          <button
            className="sidenav__close"
            onClick={toggleMenu}
            aria-label="Close menu"
          >
            <CloseIcon className="icon" />
          </button>
        </div>

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

      {/* Sidenav overlay */}
      {menuOpen && (
        <div className="sidenav-overlay" onClick={toggleMenu} aria-hidden="true" />
      )}

      {/* ── Mobile Header ────────────────────────────────────── */}
      <header className="mobile-header">
        <button
          className="mobile-header__hamburger"
          onClick={toggleMenu}
          aria-label="Open menu"
          aria-expanded={menuOpen}
        >
          <HamburgerIcon className="icon" />
        </button>

        <Link to="/" className="mobile-header__logo-link" aria-label="103 Tactical — home">
          {logoUrl ? (
            <img src={logoUrl} alt={logoAlt ?? "103 Tactical"} className="mobile-header__logo" />
          ) : (
            <span className="mobile-header__logo-text">103 Tactical</span>
          )}
        </Link>

        {/* Right slot — reserved for future icon link */}
        <div className="mobile-header__right" aria-hidden="true" />
      </header>

      {/* ── Desktop Navbar ───────────────────────────────────── */}
      <header className="navbar-desktop">
        <div className="navbar-desktop__inner">
          <Link to="/" className="navbar-desktop__logo-link" aria-label="103 Tactical — home">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={logoAlt ?? "103 Tactical"}
                className="navbar-desktop__logo"
              />
            ) : (
              <span className="navbar-desktop__logo-text">103 Tactical</span>
            )}
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
    </>
  );
}

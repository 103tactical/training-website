import { Link } from "@remix-run/react";
import { SocialIcon } from "./Icons";
import type { NavbarProps } from "./Navbar";

interface FooterProps {
  logoUrl?: string;
  logoAlt?: string;
  tagline?: string;
  nav?: NavbarProps["nav"];
  contact?: {
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
  };
  social?: { platform: string; url: string }[];
  copyright?: string;
}

export default function Footer({
  logoUrl,
  logoAlt,
  tagline,
  nav,
  contact,
  social,
  copyright,
}: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__inner">
        {/* Brand */}
        <div className="footer__brand">
          <Link to="/" aria-label="103 Tactical — home">
            {logoUrl ? (
              <img src={logoUrl} alt={logoAlt ?? "103 Tactical"} className="footer__logo" />
            ) : (
              <div className="footer__logo-text">103 Tactical</div>
            )}
          </Link>
          {tagline && <p className="footer__tagline">{tagline}</p>}
        </div>

        {/* Navigation */}
        {nav && nav.length > 0 && (
          <nav aria-label="Footer navigation">
            <p className="footer__contact-heading">Navigation</p>
            <ul className="footer__contact-list">
              {nav.map((item) => (
                <li key={item.url} className="footer__contact-item">
                  <Link
                    to={item.url}
                    target={item.openInNewTab ? "_blank" : undefined}
                    rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Contact */}
        {contact && (
          <div className="footer__contact">
            <p className="footer__contact-heading">Contact</p>
            <ul className="footer__contact-list">
              {contact.address && (
                <li className="footer__contact-item">{contact.address}</li>
              )}
              {contact.city && (
                <li className="footer__contact-item">{contact.city}</li>
              )}
              {contact.phone && (
                <li className="footer__contact-item">
                  <a href={`tel:${contact.phone.replace(/\D/g, "")}`}>
                    {contact.phone}
                  </a>
                </li>
              )}
              {contact.email && (
                <li className="footer__contact-item">
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </li>
              )}
            </ul>

            {social && social.length > 0 && (
              <div className="footer__social" style={{ marginTop: "1.5rem" }}>
                {social.map((s) => (
                  <a
                    key={s.platform}
                    href={s.url}
                    className="footer__social-link"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.platform}
                  >
                    <SocialIcon platform={s.platform} className="icon" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="footer__bottom">
        <p className="footer__copyright">
          {copyright ?? `© ${year} 103 Tactical Training. All rights reserved.`}
        </p>
      </div>
    </footer>
  );
}

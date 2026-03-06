/**
 * Routes that use the "overlay nav" layout:
 * - navbar-desktop is transparent and floats over the page hero
 * - nav links are centered on top, logo centered below with a gap
 *
 * To add a page: add its path string to the Set.
 * To remove a page: delete its path string.
 */
export const overlayNavRoutes = new Set(["/", "/courses", "/applications", "/contact"]);

/**
 * Overlay nav routes that do NOT have a hero image behind the navbar.
 * These pages will show the primary (header) logo instead of the footer logo.
 * Any route in overlayNavRoutes that is NOT listed here will use the footer logo.
 */
export const overlayNavPrimaryLogoRoutes = new Set<string>(["/", "/applications"]);

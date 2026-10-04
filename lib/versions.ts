import packageJson from "../package.json";

/**
 * Chrome extension build this site targets.
 * Bump when the companion plugin release changes.
 */
export const PLUGIN_VERSION = "1.3.0";

/** Web app release — from package.json */
export const SITE_VERSION = packageJson.version;

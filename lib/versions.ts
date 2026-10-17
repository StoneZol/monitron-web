import packageJson from "../package.json";

type MonitronPackageJson = {
  version: string;
  monitron?: {
    /** Chrome extension build this site targets — bump with plugin releases. */
    pluginVersion?: string;
  };
};

const pkg = packageJson as MonitronPackageJson;

/** Web app release — `package.json` → `version` */
export const SITE_VERSION = pkg.version;

/** Companion plugin release — `package.json` → `monitron.pluginVersion` */
export const PLUGIN_VERSION = pkg.monitron?.pluginVersion ?? "0.0.0";

/**
 * @expo/fingerprint settings — what decides the runtime version an OTA
 * update must match.
 *
 * GitIgnore is skipped: the EAS build server edits .gitignore while it
 * generates the native projects, so the fingerprint it recorded for a build
 * never matched the one computed here, and no update could ever reach that
 * build (found 27 Sep, build 5 — the only difference was ".gitignore").
 * Ignore rules change no native file.
 *
 * The default skip must stay in: setting `sourceSkips` REPLACES it, and
 * without it the "android"/"ios" scripts that prebuild rewrites on the server
 * ("expo run:android") changed the fingerprint again — build 6 failed on it.
 *
 * @type {import('expo/fingerprint').Config}
 */
const { SourceSkips } = require('expo/fingerprint');

module.exports = {
  sourceSkips: SourceSkips.PackageJsonAndroidAndIosScriptsIfNotContainRun | SourceSkips.GitIgnore,
};

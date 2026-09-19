import { Directory, File, Paths } from 'expo-file-system';

/**
 * Where the downloaded archive is kept between launches — device build.
 *
 * NOT AsyncStorage, and this is the whole point of the file. AsyncStorage on
 * Android is SQLite with a 6 MB database and a 2 MB limit per row, and the
 * archive is 22 MB of JSON. `setItem` throws, and because the old code made
 * that call on the success path, the throw discarded a manifest that had
 * already been fetched and validated — so the app fell back to the bundled
 * seven-day fixture on every single launch and no reader ever saw the other
 * 7900 events.
 *
 * Documents, not cache: this is an app whose main promise is a history archive
 * you can read on a plane. The OS may empty the cache directory whenever it
 * likes, and a reader who then opens the app offline would be back to the
 * fixture.
 */

const DIR_NAME = 'archive';
const FILE_NAME = 'manifest-v1.json';

function cacheFile(): File {
  return new File(new Directory(Paths.document, DIR_NAME), FILE_NAME);
}

export async function readManifestCache(): Promise<unknown | null> {
  try {
    const file = cacheFile();
    if (!file.exists) {
      return null;
    }
    return JSON.parse(await file.text()) as unknown;
  } catch (error) {
    console.warn(`[manifestCache] unreadable, ignoring (${String(error)})`);
    return null;
  }
}

export async function writeManifestCache(json: unknown): Promise<void> {
  try {
    const directory = new Directory(Paths.document, DIR_NAME);
    if (!directory.exists) {
      directory.create({ intermediates: true });
    }
    const file = cacheFile();
    if (file.exists) {
      file.delete();
    }
    file.create();
    file.write(JSON.stringify(json));
  } catch (error) {
    // Never fatal. A reader with a full disk still gets the archive they just
    // downloaded; they only pay for it again next launch.
    console.warn(`[manifestCache] could not store the archive (${String(error)})`);
  }
}

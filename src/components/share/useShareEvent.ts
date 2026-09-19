import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { useCallback, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { shareMessage } from '@/lib/eventLink';

import { SHARE_HEIGHT, SHARE_PREVIEW_SCALE, SHARE_WIDTH } from './ShareCard';

/**
 * Capture the off-screen 9:16 card and hand it to the system share sheet.
 *
 * The card renders scaled down (so it never disturbs layout) but is captured at
 * full 1080x1920 — `captureRef`'s width/height are the OUTPUT size, independent
 * of how large the view is on screen.
 *
 * The link is copied to the clipboard alongside the image rather than attached
 * to it. `Sharing.shareAsync` sends ONE artefact — a file — and Android's share
 * sheet drops any text you try to send with it, so a caption would silently
 * vanish on the platform that matters most. Copying is unglamorous and it
 * always works: the sender pastes it under the picture.
 */
interface ShareSubject {
  id: string;
  title: string;
  year: number;
}

export function useShareEvent(subject?: ShareSubject) {
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  // Primitives, not the object: callers build `subject` inline, so depending on
  // the object itself would rebuild `share` on every single render.
  const id = subject?.id;
  const title = subject?.title;
  const year = subject?.year;

  const share = useCallback(async () => {
    if (sharing) {
      return;
    }
    setSharing(true);
    try {
      // Give the off-screen card a frame to lay out and decode its image.
      await new Promise((resolve) => setTimeout(resolve, 250));

      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        width: SHARE_WIDTH,
        height: SHARE_HEIGHT,
      });

      if (id !== undefined && title !== undefined && year !== undefined) {
        // Best-effort: a clipboard that refuses (web permissions, a locked
        // pasteboard) must not lose the reader their image.
        try {
          await Clipboard.setStringAsync(shareMessage(title, year, id));
        } catch {
          // Ignored — the picture is the payload, the link is the bonus.
        }
      }

      if (Platform.OS === 'web') {
        // No native share sheet on web — open the PNG so it can be saved.
        globalThis.open?.(uri, '_blank');
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share this moment in history',
          UTI: 'public.png',
        });
      }
    } catch (error) {
      console.warn('[share] capture failed', error);
    } finally {
      setSharing(false);
    }
  }, [sharing, id, title, year]);

  return { cardRef, share, sharing, previewScale: SHARE_PREVIEW_SCALE };
}

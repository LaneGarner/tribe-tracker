import type { ShareContent, ShareResult } from './types';

interface BrowserShareTarget {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: { writeText: (value: string) => Promise<void> };
}

export async function shareContentWithBrowser(
  content: ShareContent,
  browser: BrowserShareTarget
): Promise<ShareResult> {
  if (browser.share) {
    try {
      await browser.share({
        title: content.title,
        text: content.message,
        url: content.url,
      });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
    }
  }
  if (!browser.clipboard?.writeText) {
    throw new Error('Sharing and clipboard access are unavailable in this browser.');
  }
  await browser.clipboard.writeText(content.message);
  return 'copied';
}

export function shareContent(content: ShareContent): Promise<ShareResult> {
  if (typeof navigator === 'undefined') {
    return Promise.reject(new Error('Sharing is unavailable.'));
  }
  return shareContentWithBrowser(content, navigator);
}

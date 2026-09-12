import { Share } from 'react-native';
import type { ShareContent, ShareResult } from './types';

export async function shareContent(content: ShareContent): Promise<ShareResult> {
  await Share.share({ message: content.message });
  return 'shared';
}

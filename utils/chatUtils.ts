import dayjs from 'dayjs';
import { ChatMessage } from '../types';
import { formatChatDate } from './dateUtils';

export interface DateSeparatorItem {
  type: 'date-separator';
  date: string;
  id: string;
}

export interface DisplayMessage extends ChatMessage {
  type: 'text' | 'system';
  showTimestamp: boolean;
}

export type ChatDisplayItem = DisplayMessage | DateSeparatorItem;

const GROUP_WINDOW_MINUTES = 5;

/**
 * Takes reversed messages (newest-first for inverted FlatList) and returns
 * display items with date separators and grouped timestamps.
 */
export function buildChatDisplayItems(reversedMessages: ChatMessage[]): ChatDisplayItem[] {
  if (reversedMessages.length === 0) return [];

  const items: ChatDisplayItem[] = [];

  for (let i = 0; i < reversedMessages.length; i++) {
    const msg = reversedMessages[i];
    // In inverted list, index 0 is bottom (newest). Next item (i+1) is above (older).
    const nextMsg = i + 1 < reversedMessages.length ? reversedMessages[i + 1] : null;

    // Determine if timestamp should show.
    // Show timestamp on a message if it's the LAST in a consecutive same-sender cluster
    // within the time window. In inverted order, "last" visually = first in array (lowest index).
    // So we show timestamp when the message BELOW (i-1) is from a different sender or > 5 min apart.
    const prevMsg = i > 0 ? reversedMessages[i - 1] : null;
    const isSameSenderAsPrev = prevMsg
      && prevMsg.senderId === msg.senderId
      && prevMsg.type !== 'system'
      && msg.type !== 'system';
    const isWithinWindow = prevMsg
      && Math.abs(dayjs(msg.createdAt).diff(dayjs(prevMsg.createdAt), 'minute')) < GROUP_WINDOW_MINUTES;

    const showTimestamp = msg.type === 'system' || !isSameSenderAsPrev || !isWithinWindow;

    items.push({ ...msg, showTimestamp } as DisplayMessage);

    // Insert date separator when the message above (nextMsg) is on a different day
    if (nextMsg) {
      const currentDay = dayjs(msg.createdAt).startOf('day');
      const nextDay = dayjs(nextMsg.createdAt).startOf('day');
      if (!currentDay.isSame(nextDay, 'day')) {
        items.push({
          type: 'date-separator',
          date: formatChatDate(msg.createdAt),
          id: `separator-${currentDay.format('YYYY-MM-DD')}`,
        });
      }
    }
  }

  // Add separator for the oldest group (top of chat)
  const oldest = reversedMessages[reversedMessages.length - 1];
  items.push({
    type: 'date-separator',
    date: formatChatDate(oldest.createdAt),
    id: `separator-${dayjs(oldest.createdAt).format('YYYY-MM-DD')}`,
  });

  return items;
}

import {
  computeReadReceipts,
  buildChatDisplayItems,
  DateSeparatorItem,
  DisplayMessage,
} from '../../utils/chatUtils';
import { ChatMessage } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMessage(
  overrides: Partial<ChatMessage> & { id: string; createdAt: string }
): ChatMessage {
  return {
    conversationId: 'conv-1',
    senderId: 'user-a',
    content: 'hello',
    type: 'text',
    status: 'sent',
    ...overrides,
  };
}

function isDateSeparator(item: unknown): item is DateSeparatorItem {
  return (item as DateSeparatorItem).type === 'date-separator';
}

function isDisplayMessage(item: unknown): item is DisplayMessage {
  return !isDateSeparator(item);
}

// ---------------------------------------------------------------------------
// computeReadReceipts
// ---------------------------------------------------------------------------

describe('computeReadReceipts', () => {
  const currentUserId = 'me';

  it('returns empty map when messages array is empty', () => {
    const result = computeReadReceipts(
      [],
      [{ userId: 'u1', userName: 'Alice', lastReadAt: '2024-06-15T12:00:00Z' }],
      currentUserId
    );
    expect(result.size).toBe(0);
  });

  it('returns empty map when readers array is empty', () => {
    const msgs = [makeMessage({ id: 'm1', createdAt: '2024-06-15T10:00:00Z' })];
    const result = computeReadReceipts(msgs, [], currentUserId);
    expect(result.size).toBe(0);
  });

  it('excludes the current user from read receipts', () => {
    const msgs = [makeMessage({ id: 'm1', createdAt: '2024-06-15T10:00:00Z' })];
    const readers = [
      { userId: 'me', userName: 'Me', lastReadAt: '2024-06-15T12:00:00Z' },
    ];
    const result = computeReadReceipts(msgs, readers, currentUserId);
    expect(result.size).toBe(0);
  });

  it('assigns reader to the last message they have read', () => {
    const msgs = [
      makeMessage({ id: 'm1', createdAt: '2024-06-15T10:00:00Z' }),
      makeMessage({ id: 'm2', createdAt: '2024-06-15T11:00:00Z' }),
      makeMessage({ id: 'm3', createdAt: '2024-06-15T12:00:00Z' }),
    ];
    const readers = [
      { userId: 'u1', userName: 'Alice', lastReadAt: '2024-06-15T11:30:00Z' },
    ];
    const result = computeReadReceipts(msgs, readers, currentUserId);

    expect(result.get('m2')).toEqual([{ userId: 'u1', userName: 'Alice' }]);
    expect(result.has('m1')).toBe(false);
    expect(result.has('m3')).toBe(false);
  });

  it('handles multiple readers on different messages', () => {
    const msgs = [
      makeMessage({ id: 'm1', createdAt: '2024-06-15T10:00:00Z' }),
      makeMessage({ id: 'm2', createdAt: '2024-06-15T11:00:00Z' }),
      makeMessage({ id: 'm3', createdAt: '2024-06-15T12:00:00Z' }),
    ];
    const readers = [
      { userId: 'u1', userName: 'Alice', lastReadAt: '2024-06-15T10:30:00Z' },
      { userId: 'u2', userName: 'Bob', lastReadAt: '2024-06-15T12:00:00Z' },
    ];
    const result = computeReadReceipts(msgs, readers, currentUserId);

    expect(result.get('m1')).toEqual([{ userId: 'u1', userName: 'Alice' }]);
    expect(result.get('m3')).toEqual([{ userId: 'u2', userName: 'Bob' }]);
  });

  it('groups multiple readers on the same message', () => {
    const msgs = [
      makeMessage({ id: 'm1', createdAt: '2024-06-15T10:00:00Z' }),
    ];
    const readers = [
      { userId: 'u1', userName: 'Alice', lastReadAt: '2024-06-15T12:00:00Z' },
      {
        userId: 'u2',
        userName: 'Bob',
        userPhotoUrl: 'https://example.com/bob.jpg',
        lastReadAt: '2024-06-15T12:00:00Z',
      },
    ];
    const result = computeReadReceipts(msgs, readers, currentUserId);

    expect(result.get('m1')).toHaveLength(2);
    expect(result.get('m1')).toEqual(
      expect.arrayContaining([
        { userId: 'u1', userName: 'Alice' },
        { userId: 'u2', userName: 'Bob', userPhotoUrl: 'https://example.com/bob.jpg' },
      ])
    );
  });

  it('ignores reader whose lastReadAt is before all messages', () => {
    const msgs = [
      makeMessage({ id: 'm1', createdAt: '2024-06-15T10:00:00Z' }),
    ];
    const readers = [
      { userId: 'u1', userName: 'Alice', lastReadAt: '2024-06-15T09:00:00Z' },
    ];
    const result = computeReadReceipts(msgs, readers, currentUserId);
    expect(result.size).toBe(0);
  });

  it('works when messages are provided out of chronological order', () => {
    const msgs = [
      makeMessage({ id: 'm3', createdAt: '2024-06-15T12:00:00Z' }),
      makeMessage({ id: 'm1', createdAt: '2024-06-15T10:00:00Z' }),
      makeMessage({ id: 'm2', createdAt: '2024-06-15T11:00:00Z' }),
    ];
    const readers = [
      { userId: 'u1', userName: 'Alice', lastReadAt: '2024-06-15T11:00:00Z' },
    ];
    const result = computeReadReceipts(msgs, readers, currentUserId);

    expect(result.get('m2')).toEqual([{ userId: 'u1', userName: 'Alice' }]);
  });

  it('assigns reader to message with exact lastReadAt match', () => {
    const msgs = [
      makeMessage({ id: 'm1', createdAt: '2024-06-15T10:00:00Z' }),
      makeMessage({ id: 'm2', createdAt: '2024-06-15T11:00:00Z' }),
    ];
    const readers = [
      { userId: 'u1', userName: 'Alice', lastReadAt: '2024-06-15T11:00:00Z' },
    ];
    const result = computeReadReceipts(msgs, readers, currentUserId);

    expect(result.get('m2')).toEqual([{ userId: 'u1', userName: 'Alice' }]);
  });
});

// ---------------------------------------------------------------------------
// buildChatDisplayItems
// ---------------------------------------------------------------------------

describe('buildChatDisplayItems', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns empty array for empty input', () => {
    expect(buildChatDisplayItems([])).toEqual([]);
  });

  it('adds a date separator after the only message', () => {
    const msgs = [
      makeMessage({ id: 'm1', createdAt: '2024-06-15T10:00:00Z', senderId: 'a' }),
    ];
    const items = buildChatDisplayItems(msgs);

    expect(items).toHaveLength(2);
    expect(isDisplayMessage(items[0])).toBe(true);
    expect((items[0] as DisplayMessage).showTimestamp).toBe(true);
    expect(isDateSeparator(items[1])).toBe(true);
    expect((items[1] as DateSeparatorItem).date).toBe('Today');
  });

  it('shows timestamp on system messages regardless of sender grouping', () => {
    const msgs = [
      makeMessage({
        id: 'm2',
        createdAt: '2024-06-15T10:01:00Z',
        senderId: 'a',
        type: 'system',
        content: 'joined',
      }),
      makeMessage({
        id: 'm1',
        createdAt: '2024-06-15T10:00:00Z',
        senderId: 'a',
        type: 'text',
        content: 'hello',
      }),
    ];
    const items = buildChatDisplayItems(msgs);
    const displayMsgs = items.filter(isDisplayMessage);

    expect(displayMsgs[0].showTimestamp).toBe(true); // system message
    expect(displayMsgs[1].showTimestamp).toBe(true); // different type from prev
  });

  it('groups same-sender messages within 5 minutes', () => {
    const msgs = [
      makeMessage({
        id: 'm2',
        createdAt: '2024-06-15T10:03:00Z',
        senderId: 'a',
        content: 'second',
      }),
      makeMessage({
        id: 'm1',
        createdAt: '2024-06-15T10:00:00Z',
        senderId: 'a',
        content: 'first',
      }),
    ];
    const items = buildChatDisplayItems(msgs);
    const displayMsgs = items.filter(isDisplayMessage);

    // m2 (index 0) — no prevMsg, so showTimestamp = true
    expect(displayMsgs[0].showTimestamp).toBe(true);
    // m1 (index 1) — same sender, within 5 min of m2, so grouped
    expect(displayMsgs[1].showTimestamp).toBe(false);
  });

  it('shows timestamp when sender changes', () => {
    const msgs = [
      makeMessage({
        id: 'm2',
        createdAt: '2024-06-15T10:01:00Z',
        senderId: 'b',
        content: 'reply',
      }),
      makeMessage({
        id: 'm1',
        createdAt: '2024-06-15T10:00:00Z',
        senderId: 'a',
        content: 'hello',
      }),
    ];
    const items = buildChatDisplayItems(msgs);
    const displayMsgs = items.filter(isDisplayMessage);

    expect(displayMsgs[0].showTimestamp).toBe(true);
    expect(displayMsgs[1].showTimestamp).toBe(true);
  });

  it('shows timestamp when messages are >5 minutes apart even from same sender', () => {
    const msgs = [
      makeMessage({
        id: 'm2',
        createdAt: '2024-06-15T10:10:00Z',
        senderId: 'a',
        content: 'later',
      }),
      makeMessage({
        id: 'm1',
        createdAt: '2024-06-15T10:00:00Z',
        senderId: 'a',
        content: 'earlier',
      }),
    ];
    const items = buildChatDisplayItems(msgs);
    const displayMsgs = items.filter(isDisplayMessage);

    expect(displayMsgs[0].showTimestamp).toBe(true);
    expect(displayMsgs[1].showTimestamp).toBe(true);
  });

  it('inserts date separator between messages on different days', () => {
    const msgs = [
      makeMessage({
        id: 'm2',
        createdAt: '2024-06-15T09:00:00Z',
        senderId: 'a',
        content: 'today msg',
      }),
      makeMessage({
        id: 'm1',
        createdAt: '2024-06-14T18:00:00Z',
        senderId: 'a',
        content: 'yesterday msg',
      }),
    ];
    const items = buildChatDisplayItems(msgs);

    // Should be: DisplayMessage(m2), DateSeparator(Today), DisplayMessage(m1), DateSeparator(Yesterday)
    expect(items).toHaveLength(4);
    expect(isDisplayMessage(items[0])).toBe(true);
    expect(isDateSeparator(items[1])).toBe(true);
    expect((items[1] as DateSeparatorItem).date).toBe('Today');
    expect(isDisplayMessage(items[2])).toBe(true);
    expect(isDateSeparator(items[3])).toBe(true);
    expect((items[3] as DateSeparatorItem).date).toBe('Yesterday');
  });

  it('does not insert separator between messages on the same day', () => {
    const msgs = [
      makeMessage({
        id: 'm2',
        createdAt: '2024-06-15T14:00:00Z',
        senderId: 'a',
      }),
      makeMessage({
        id: 'm1',
        createdAt: '2024-06-15T10:00:00Z',
        senderId: 'b',
      }),
    ];
    const items = buildChatDisplayItems(msgs);
    const separators = items.filter(isDateSeparator);

    // Only the trailing separator for the oldest group
    expect(separators).toHaveLength(1);
  });

  it('always adds a separator at the end for the oldest group', () => {
    const msgs = [
      makeMessage({ id: 'm3', createdAt: '2024-06-15T12:00:00Z', senderId: 'a' }),
      makeMessage({ id: 'm2', createdAt: '2024-06-15T11:00:00Z', senderId: 'b' }),
      makeMessage({ id: 'm1', createdAt: '2024-06-15T10:00:00Z', senderId: 'a' }),
    ];
    const items = buildChatDisplayItems(msgs);
    const lastItem = items[items.length - 1];

    expect(isDateSeparator(lastItem)).toBe(true);
  });

  it('handles a multi-day conversation with correct separators', () => {
    const msgs = [
      makeMessage({
        id: 'm4',
        createdAt: '2024-06-15T09:00:00Z',
        senderId: 'a',
      }),
      makeMessage({
        id: 'm3',
        createdAt: '2024-06-14T20:00:00Z',
        senderId: 'a',
      }),
      makeMessage({
        id: 'm2',
        createdAt: '2024-06-14T10:00:00Z',
        senderId: 'b',
      }),
      makeMessage({
        id: 'm1',
        createdAt: '2024-06-13T15:00:00Z',
        senderId: 'a',
      }),
    ];
    const items = buildChatDisplayItems(msgs);

    // m4, sep(Today), m3, m2, sep(Yesterday), m1, sep(Jun 13 date)
    const separators = items.filter(isDateSeparator);
    expect(separators).toHaveLength(3);
    expect(separators[0].date).toBe('Today');
    expect(separators[1].date).toBe('Yesterday');
    // Jun 13 is 2 days ago — should use "ddd, MMM D" format
    expect(separators[2].date).toBe('Thu, Jun 13');
  });

  it('preserves message fields in display items', () => {
    const msg = makeMessage({
      id: 'm1',
      createdAt: '2024-06-15T10:00:00Z',
      senderId: 'user-x',
      content: 'test content',
      conversationId: 'conv-42',
    });
    const items = buildChatDisplayItems([msg]);
    const display = items[0] as DisplayMessage;

    expect(display.id).toBe('m1');
    expect(display.senderId).toBe('user-x');
    expect(display.content).toBe('test content');
    expect(display.conversationId).toBe('conv-42');
  });
});

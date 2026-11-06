import type { ChatMessage } from '../types';
const serialized = new WeakMap<ChatMessage[], string>();
/** Keep the existing disk format while only reserializing changed conversations. */
export function serializeMessageCache(messages: Record<string, ChatMessage[]>): string {
  return '{' + Object.entries(messages).map(([id, entries]) => {
    const cacheable = Object.isFrozen(entries) && entries.every(Object.isFrozen);
    let value = cacheable ? serialized.get(entries) : undefined;
    if (value === undefined) {
      value = JSON.stringify(entries.slice(-100));
      if (cacheable) serialized.set(entries, value);
    }
    return `${JSON.stringify(id)}:${value}`;
  }).join(',') + '}';
}

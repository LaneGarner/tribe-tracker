import { readFileSync } from 'fs';
import { join } from 'path';
import { runInNewContext } from 'vm';
import ts from 'typescript';

const source = readFileSync(join(__dirname, '../../supabase/functions/notify-chat-message/index.ts'), 'utf8')
  .replace(/^import .*createClient.*;$/m, '');

async function invoke(senderId: string | null, authorization: string, settings = {}) {
  let handler: any;
  const recipients: string[] = [];
  const query: any = {
    select: () => query, eq: () => query,
    neq: (_: string, id: string) => { recipients.push(id); return query; },
    in: () => query,
    single: async () => ({ data: { type: 'group', name: 'Together' } }),
    then: (resolve: any) => resolve({ data: [
      { user_id: 'member', id: 'member', expo_push_token: 'token', notification_settings: settings },
    ] }),
  };
  const fetchPush = jest.fn(async () => ({ ok: true }));
  const ResponseMock = class {
    constructor(public body: string, public init: any = {}) {}
    get status() { return this.init.status || 200; }
  };
  runInNewContext(ts.transpile(source, { target: ts.ScriptTarget.ES2020 }), {
    Deno: { env: { get: () => 'service-secret' }, serve: (fn: any) => { handler = fn; } },
    createClient: () => ({ from: () => query }),
    Response: ResponseMock, fetch: fetchPush, console,
  });
  const response = await handler({ method: 'POST', headers: { get: () => authorization },
    json: async () => ({ conversationId: 'group', senderId, senderName: 'TribeTracker', content: 'Weekly recap' }),
  });
  return { response, fetchPush, recipients };
}

describe('generated chat push delivery', () => {
  it('allows trusted system messages and includes all group members', async () => {
    const { response, fetchPush, recipients } = await invoke(null, 'Bearer service-secret');
    expect(response.status).toBe(200);
    expect(fetchPush).toHaveBeenCalledTimes(1);
    expect(recipients).toEqual([]);
  });
  it('rejects client impersonation of the system', async () => {
    const { response, fetchPush } = await invoke(null, 'Bearer user-token');
    expect(response.status).toBe(401);
    expect(fetchPush).not.toHaveBeenCalled();
  });
  it('honors the group push setting for generated updates', async () => {
    const { fetchPush } = await invoke(null, 'Bearer service-secret', { chatGroupEnabled: false });
    expect(fetchPush).not.toHaveBeenCalled();
  });
  it('keeps excluding the sender for normal messages', async () => {
    const { recipients } = await invoke('sender', 'Bearer user-token');
    expect(recipients).toEqual(['sender']);
  });
});

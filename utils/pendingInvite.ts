let pendingInviteCode: string | null = null;

export function setPendingInviteCode(code: string) {
  pendingInviteCode = code;
}

export function consumePendingInviteCode(): string | null {
  const code = pendingInviteCode;
  pendingInviteCode = null;
  return code;
}

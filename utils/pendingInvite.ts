let pendingInviteCode: string | null = null;
let pendingChallengeId: string | null = null;

export function setPendingInviteCode(code: string) {
  pendingInviteCode = code;
}

export function consumePendingInviteCode(): string | null {
  const code = pendingInviteCode;
  pendingInviteCode = null;
  return code;
}

export function setPendingChallengeId(id: string) {
  pendingChallengeId = id;
}

export function consumePendingChallengeId(): string | null {
  const id = pendingChallengeId;
  pendingChallengeId = null;
  return id;
}

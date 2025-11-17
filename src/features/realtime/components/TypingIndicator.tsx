'use client';

import type { TypingUser } from '../backend/schema';

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

/**
 * TypingIndicator - Display who is currently typing
 *
 * Shows: "사용자명이 입력 중..." or "사용자명1, 사용자명2가 입력 중..."
 */
export const TypingIndicator = ({ typingUsers }: TypingIndicatorProps) => {
  if (!typingUsers || typingUsers.length === 0) {
    return null;
  }

  // Format user names
  const userNames = typingUsers.map(u => u.nickname);
  let displayText = '';

  if (userNames.length === 1) {
    displayText = `${userNames[0]}님이 입력 중...`;
  } else if (userNames.length === 2) {
    displayText = `${userNames[0]}, ${userNames[1]}님이 입력 중...`;
  } else {
    displayText = `${userNames.length}명이 입력 중...`;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500">
      <div className="flex gap-1">
        <span className="inline-block h-2 w-2 rounded-full bg-slate-400 animate-bounce" />
        <span className="inline-block h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
        <span className="inline-block h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
      </div>
      <span>{displayText}</span>
    </div>
  );
};

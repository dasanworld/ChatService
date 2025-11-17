'use client';

import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Circle } from 'lucide-react';
import type { UserPresence } from '../backend/schema';

interface UserPresenceProps {
  onlineUsers: UserPresence[];
}

/**
 * UserPresenceDisplay - Display online users and their last seen time
 *
 * Shows a list of online users with online indicator and last seen time
 */
export const UserPresenceDisplay = ({ onlineUsers }: UserPresenceProps) => {
  if (!onlineUsers || onlineUsers.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase text-slate-600">온라인</p>
      <div className="flex flex-wrap gap-3">
        {onlineUsers.map(user => (
          <div key={user.user_id} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Circle className="h-2.5 w-2.5 fill-green-500 text-green-500" />
              <span className="text-sm text-slate-700">{user.nickname}</span>
            </div>
            <span className="text-xs text-slate-500">
              {formatDistanceToNow(new Date(user.last_seen), {
                addSuffix: false,
                locale: ko,
              })}
              전
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

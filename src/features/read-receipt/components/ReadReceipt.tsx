'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
import type { MessageReadStatus } from '../backend/schema';

interface ReadReceiptProps {
  readStatus?: MessageReadStatus | null;
}

/**
 * ReadReceipt - Display who has read a message
 *
 * Shows: "👁 김철수" or "👁 2명이 읽음" (hover to see list)
 */
export const ReadReceipt = ({ readStatus }: ReadReceiptProps) => {
  const [showList, setShowList] = useState(false);

  if (!readStatus || readStatus.read_count === 0) {
    return null;
  }

  const displayText =
    readStatus.read_count === 1
      ? readStatus.read_by[0].nickname
      : `${readStatus.read_count}명이 읽음`;

  return (
    <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 relative">
      <Eye className="h-3 w-3" />
      <button
        onMouseEnter={() => setShowList(true)}
        onMouseLeave={() => setShowList(false)}
        className="hover:text-slate-600 hover:underline cursor-help"
      >
        {displayText}
      </button>

      {/* Tooltip with full list */}
      {showList && readStatus.read_count > 1 && (
        <div className="absolute bottom-full left-0 mb-1 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white shadow-lg z-10">
          {readStatus.read_by.map((user, idx) => (
            <div key={user.user_id}>
              {user.nickname}
              {idx < readStatus.read_by.length - 1 && <br />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

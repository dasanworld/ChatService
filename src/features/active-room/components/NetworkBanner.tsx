'use client';

import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useNetwork } from '@/features/network/context/NetworkContext';

export const NetworkBanner = () => {
  const { isOnline, hasError, error } = useNetwork();

  if (isOnline && !hasError) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 text-sm ${
        !isOnline
          ? 'bg-red-50 text-red-700'
          : 'bg-amber-50 text-amber-700'
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4 flex-shrink-0" />
          <span>오프라인 - 메시지를 보낼 수 없습니다</span>
        </>
      ) : (
        <>
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error || '연결 오류가 발생했습니다'}</span>
        </>
      )}
    </div>
  );
};

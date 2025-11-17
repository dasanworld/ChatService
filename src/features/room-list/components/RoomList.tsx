'use client';

import { useEffect } from 'react';
import { useRooms } from '../hooks/useRooms';
import { useRoomList } from '../context/RoomListContext';
import { RoomListItem } from './RoomListItem';
import { RoomListEmpty } from './RoomListEmpty';
import { RoomListError } from './RoomListError';
import type { Room } from '../types';

export const RoomList = () => {
  const { data, isLoading, error, refetch } = useRooms();
  const { rooms, fetchStart, fetchSuccess, fetchError } = useRoomList();

  // Sync React Query data with Context state
  // fetchStart, fetchSuccess, fetchError are now memoized with useCallback
  useEffect(() => {
    if (isLoading) {
      fetchStart();
    } else if (error) {
      const message =
        error instanceof Error ? error.message : '방 목록을 불러올 수 없습니다';
      fetchError(message);
    } else if (data) {
      fetchSuccess(data.rooms as Room[]);
    }
  }, [isLoading, error, data, fetchStart, fetchSuccess, fetchError]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-slate-100"
          />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <RoomListError 
        error={error instanceof Error ? error : new Error('Unknown error')} 
        onRetry={() => refetch()}
      />
    );
  }

  // Empty state
  if (rooms.length === 0) {
    return <RoomListEmpty />;
  }

  // Render room list
  return (
    <div className="space-y-3">
      {rooms.map((room) => (
        <RoomListItem key={room.id} room={room} />
      ))}
    </div>
  );
};

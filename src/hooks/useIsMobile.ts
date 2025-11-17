'use client';

import { useState, useEffect } from 'react';

/**
 * useIsMobile - 모바일 디바이스 여부를 판단하는 훅
 * 768px (md breakpoint) 기준으로 모바일/데스크탑 구분
 */
export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // 초기 체크
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();

    // 리사이징 시 다시 체크
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

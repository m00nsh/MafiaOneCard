import { useState, useEffect } from 'react';

/**
 * 서버 연결 중 로딩 애니메이션을 위한 커스텀 훅
 * 0.333초마다 '.' 개수가 1개 → 2개 → 3개 → 1개로 순환
 */
export function useLoadingDots(isConnecting: boolean) {
  const [loadingDots, setLoadingDots] = useState(1);
  
  useEffect(() => {
    if (!isConnecting) {
      setLoadingDots(1); // 연결이 끝나면 초기화
      return;
    }
    
    const interval = setInterval(() => {
      setLoadingDots(prev => {
        if (prev >= 3) return 1;
        return prev + 1;
      });
    }, 333); // 0.333초 = 333ms
    
    return () => clearInterval(interval);
  }, [isConnecting]);
  
  return loadingDots;
}

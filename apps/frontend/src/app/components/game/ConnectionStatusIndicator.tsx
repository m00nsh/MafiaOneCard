import { DEBUG } from '@/app/config/server';

interface ConnectionStatusIndicatorProps {
  status: 'connected' | 'connecting' | 'error' | 'disconnected';
  sessionId: string | null;
  error: Error | null;
}

/**
 * 서버 연결 상태를 표시하는 컴포넌트
 */
export default function ConnectionStatusIndicator({ status, sessionId, error }: ConnectionStatusIndicatorProps) {
  return (
    <>
      <div className="absolute top-2 right-2 z-50 flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${
          status === 'connected' ? 'bg-green-500 animate-pulse' :
          status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
          status === 'error' ? 'bg-red-500' :
          'bg-gray-500'
        }`} />
        <span className="text-white text-sm font-bold bg-black/60 px-2 py-1 rounded">
          {status === 'connected' ? '연결됨' :
           status === 'connecting' ? '연결 중...' :
           status === 'error' ? '연결 실패' :
           '연결 끊김'}
        </span>
        {DEBUG && sessionId && (
          <span className="text-white text-xs bg-black/60 px-2 py-1 rounded font-mono">
            {sessionId.substring(0, 8)}
          </span>
        )}
      </div>
      {error && (
        <div className="absolute top-12 right-2 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg max-w-md">
          <p className="font-bold">연결 오류</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}
    </>
  );
}

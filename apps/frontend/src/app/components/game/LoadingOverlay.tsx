interface LoadingOverlayProps {
  isLoading: boolean;
  loadingDots: number;
}

/**
 * 서버 연결 중 로딩 오버레이 컴포넌트
 */
export default function LoadingOverlay({ isLoading, loadingDots }: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center">
      <div className="text-center">
        <p className="text-white text-2xl sm:text-3xl font-bold">
          서버에 연결 중{'.'.repeat(loadingDots)}
        </p>
      </div>
    </div>
  );
}

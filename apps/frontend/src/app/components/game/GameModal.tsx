import { ReactNode } from 'react';

interface GameModalProps {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  width?: number; // 고정 너비 (px)
}

/**
 * LandscapeLayout 내부에서 중앙에 표시되는 게임용 모달
 * Radix UI Portal 대신 absolute positioning 사용
 */
export default function GameModal({ open, onClose, children, width = 480 }: GameModalProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      {/* 오버레이 */}
      <div 
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      
      {/* 모달 컨텐츠 */}
      <div 
        className="relative z-10 rounded-xl border-2 border-amber-600/50 bg-amber-50/95 dark:bg-amber-950/95 p-6 shadow-2xl"
        style={{ width: `${width}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// 모달 헤더
export function GameModalHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

// 모달 타이틀
export function GameModalTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`text-[22px] font-bold text-amber-900 dark:text-amber-100 ${className}`}>
      {children}
    </h2>
  );
}

// 모달 설명
export function GameModalDescription({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[14px] mt-2 text-amber-800 dark:text-amber-200 ${className}`}>
      {children}
    </p>
  );
}

// 모달 푸터
export function GameModalFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex justify-end gap-3 mt-4 ${className}`}>
      {children}
    </div>
  );
}

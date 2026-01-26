import { toast } from 'sonner';

/**
 * 토스트 알림 타입
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

/**
 * 토스트 옵션
 */
export interface ToastOptions {
  /** 토스트 지속 시간 (밀리초), 기본값: 4000 */
  duration?: number;
  /** 토스트 설명 텍스트 */
  description?: string;
  /** 액션 버튼 (선택사항) */
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * 토스트 알림을 위한 커스텀 훅
 * 
 * @example
 * ```tsx
 * const { showSuccess, showError, showInfo, showWarning } = useToast();
 * 
 * showSuccess('카드를 성공적으로 냈습니다!');
 * showError('카드를 낼 수 없습니다.', { description: '문양이나 숫자가 일치하지 않습니다.' });
 * ```
 */
export function useToast() {
  /**
   * 성공 메시지 표시
   */
  const showSuccess = (message: string, options?: ToastOptions) => {
    toast.success(message, {
      duration: options?.duration ?? 4000,
      description: options?.description,
      action: options?.action,
    });
  };

  /**
   * 에러 메시지 표시
   */
  const showError = (message: string, options?: ToastOptions) => {
    toast.error(message, {
      duration: options?.duration ?? 5000, // 에러는 조금 더 길게
      description: options?.description,
      action: options?.action,
    });
  };

  /**
   * 정보 메시지 표시
   */
  const showInfo = (message: string, options?: ToastOptions) => {
    toast.info(message, {
      duration: options?.duration ?? 4000,
      description: options?.description,
      action: options?.action,
    });
  };

  /**
   * 경고 메시지 표시
   */
  const showWarning = (message: string, options?: ToastOptions) => {
    toast.warning(message, {
      duration: options?.duration ?? 4000,
      description: options?.description,
      action: options?.action,
    });
  };

  /**
   * 기본 토스트 메시지 표시
   */
  const show = (message: string, options?: ToastOptions) => {
    toast(message, {
      duration: options?.duration ?? 4000,
      description: options?.description,
      action: options?.action,
    });
  };

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    show,
  };
}

/**
 * 토스트 유틸리티 함수 (훅 없이 사용 가능)
 */
export const toastUtils = {
  success: (message: string, options?: ToastOptions) => {
    toast.success(message, {
      duration: options?.duration ?? 4000,
      description: options?.description,
      action: options?.action,
    });
  },
  error: (message: string, options?: ToastOptions) => {
    toast.error(message, {
      duration: options?.duration ?? 5000,
      description: options?.description,
      action: options?.action,
    });
  },
  info: (message: string, options?: ToastOptions) => {
    toast.info(message, {
      duration: options?.duration ?? 4000,
      description: options?.description,
      action: options?.action,
    });
  },
  warning: (message: string, options?: ToastOptions) => {
    toast.warning(message, {
      duration: options?.duration ?? 4000,
      description: options?.description,
      action: options?.action,
    });
  },
};

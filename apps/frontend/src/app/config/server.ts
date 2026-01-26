/**
 * 서버 연결 설정
 * 개발/프로덕션 환경별 서버 URL 관리
 */

// 환경 변수에서 서버 URL 가져오기 (없으면 기본값 사용)
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'ws://localhost:2567';

// Colyseus 방 이름
export const ROOM_NAME = 'mafia_room';

// 개발 모드 확인
export const IS_DEV = import.meta.env.DEV;

// 디버그 로깅 활성화 여부
export const DEBUG = IS_DEV;

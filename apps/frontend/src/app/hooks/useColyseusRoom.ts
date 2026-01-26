import { useEffect, useState, useCallback, useRef } from 'react';
import { Client, Room } from 'colyseus.js';
import { SERVER_URL, ROOM_NAME, DEBUG } from '@/app/config/server';
import { PlayerInfo, RoomStatus, CardSuit, CardRank } from '@mafia/shared';
import { cardToUI, UICard } from '@/app/utils/cardConverter';

/**
 * Colyseus Room State 타입 (백엔드 Schema와 매핑)
 * Note: Colyseus가 자동으로 동기화하는 Schema 구조
 */
interface ColyseusGameState {
  status: string;
  players: Map<string, ColyseusPlayer>;
}

interface ColyseusPlayer {
  hand: Array<ColyseusCard>;
  isReady: boolean;
}

interface ColyseusCard {
  id: string;
  suit: string;
  rank: string;
}

/**
 * Colyseus 방 연결 상태
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * useColyseusRoom 훅의 반환 타입
 */
export interface UseColyseusRoomReturn {
  // 연결 상태
  status: ConnectionStatus;
  room: Room<ColyseusGameState> | null;
  sessionId: string | null;
  error: Error | null;

  // 연결/해제 함수
  connect: (options?: { name?: string }) => Promise<void>;
  disconnect: () => void;

  // 게임 상태 (변환된 형태)
  gameState: {
    status: RoomStatus;
    players: Map<string, PlayerInfo>;
    myPlayer: PlayerInfo | null;
    myHand: UICard[];
  } | null;

  // 메시지 전송 함수
  sendMessage: <T = any>(type: string, message?: T) => void;

  // 메시지 리스너 등록 함수
  onMessage: <T = any>(type: string, callback: (message: T) => void) => void;
}

/**
 * Colyseus 방 연결 및 상태 관리를 위한 커스텀 훅
 * 
 * @example
 * ```tsx
 * const { status, room, gameState, connect, sendMessage } = useColyseusRoom();
 * 
 * useEffect(() => {
 *   connect({ name: 'Player1' });
 * }, []);
 * 
 * const handleReady = () => {
 *   sendMessage('ready', { isReady: true });
 * };
 * ```
 */
export function useColyseusRoom(): UseColyseusRoomReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [room, setRoom] = useState<Room<ColyseusGameState> | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [gameState, setGameState] = useState<UseColyseusRoomReturn['gameState']>(null);

  const clientRef = useRef<Client | null>(null);
  const messageListenersRef = useRef<Map<string, Set<(message: any) => void>>>(new Map());

  // 클라이언트 초기화
  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = new Client(SERVER_URL);
      if (DEBUG) {
        console.log('[Colyseus] 클라이언트 초기화:', SERVER_URL);
      }
    }

    return () => {
      // 컴포넌트 언마운트 시 연결 해제
      if (room) {
        room.leave();
      }
    };
  }, []);

  // 방 연결
  const connect = useCallback(async (options?: { name?: string }) => {
    if (!clientRef.current) {
      const error = new Error('Colyseus 클라이언트가 초기화되지 않았습니다.');
      setError(error);
      setStatus('error');
      return;
    }

    try {
      setStatus('connecting');
      setError(null);

      if (DEBUG) {
        console.log('[Colyseus] 방 연결 시도:', ROOM_NAME, options);
      }

      const newRoom = await clientRef.current.joinOrCreate<ColyseusGameState>(ROOM_NAME, options || {});

      setRoom(newRoom);
      setSessionId(newRoom.sessionId);
      setStatus('connected');

      if (DEBUG) {
        console.log('[Colyseus] 방 연결 성공:', newRoom.sessionId);
      }

      // 상태 변경 리스너 등록
      newRoom.onStateChange((state) => {
        if (DEBUG) {
          console.log('[Colyseus] 상태 변경:', state);
        }

        // 내 플레이어 정보 추출
        const myPlayerData = state.players.get(newRoom.sessionId);
        let myPlayer: PlayerInfo | null = null;
        let myHand: UICard[] = [];

        if (myPlayerData) {
          // CardSchema 배열을 UICard 배열로 변환
          myHand = Array.from(myPlayerData.hand).map(card => cardToUI({
            id: card.id,
            suit: card.suit as CardSuit,
            rank: card.rank as CardRank,
          }));

          myPlayer = {
            id: newRoom.sessionId,
            nickname: '', // TODO: 서버에서 받아오기
            characterId: null, // TODO: 서버에서 받아오기
            isReady: myPlayerData.isReady,
            isHost: false, // TODO: 서버에서 받아오기
            handCount: myHand.length,
          };
        }

        // 모든 플레이어 정보 변환
        const players = new Map<string, PlayerInfo>();
        state.players.forEach((playerData, id) => {
          if (id === newRoom.sessionId) {
            if (myPlayer) {
              players.set(id, myPlayer);
            }
          } else {
            players.set(id, {
              id,
              nickname: '', // TODO: 서버에서 받아오기
              characterId: null,
              isReady: playerData.isReady,
              isHost: false,
              handCount: playerData.hand.length,
            });
          }
        });

        setGameState({
          status: state.status as RoomStatus,
          players,
          myPlayer,
          myHand,
        });
      });

      // 상태 초기 동기화
      newRoom.onStateChange.once(() => {
        if (DEBUG) {
          console.log('[Colyseus] 초기 상태 동기화 완료');
        }
      });

      // 에러 처리
      newRoom.onError((code, message) => {
        const error = new Error(`Colyseus 에러 [${code}]: ${message}`);
        console.error('[Colyseus] 에러:', error);
        setError(error);
        setStatus('error');
      });

      // 연결 끊김 처리
      newRoom.onLeave((code) => {
        if (DEBUG) {
          console.log('[Colyseus] 방 나감:', code);
        }
        setStatus('disconnected');
        setRoom(null);
        setSessionId(null);
        setGameState(null);
      });

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[Colyseus] 연결 실패:', error);
      setError(error);
      setStatus('error');
    }
  }, []);

  // 방 연결 해제
  const disconnect = useCallback(() => {
    if (room) {
      room.leave();
      setRoom(null);
      setSessionId(null);
      setStatus('disconnected');
      setGameState(null);
      if (DEBUG) {
        console.log('[Colyseus] 방 연결 해제');
      }
    }
  }, [room]);

  // 메시지 전송
  const sendMessage = useCallback(<T = any>(type: string, message?: T) => {
    if (!room) {
      console.warn('[Colyseus] 메시지 전송 실패: 방에 연결되지 않음');
      return;
    }

    try {
      room.send(type, message);
      if (DEBUG) {
        console.log('[Colyseus] 메시지 전송:', type, message);
      }
    } catch (err) {
      console.error('[Colyseus] 메시지 전송 에러:', err);
    }
  }, [room]);

  // 메시지 리스너 등록
  const onMessage = useCallback(<T = any>(type: string, callback: (message: T) => void) => {
    if (!room) {
      console.warn('[Colyseus] 리스너 등록 실패: 방에 연결되지 않음');
      return;
    }

    // 리스너 맵에 등록 (나중에 제거할 수 있도록)
    if (!messageListenersRef.current.has(type)) {
      messageListenersRef.current.set(type, new Set());
    }
    messageListenersRef.current.get(type)!.add(callback);

    // Colyseus 리스너 등록
    room.onMessage(type, (message: T) => {
      if (DEBUG) {
        console.log('[Colyseus] 메시지 수신:', type, message);
      }
      callback(message);
    });
  }, [room]);

  return {
    status,
    room,
    sessionId,
    error,
    connect,
    disconnect,
    gameState,
    sendMessage,
    onMessage,
  };
}

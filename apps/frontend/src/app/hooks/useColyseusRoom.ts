import { useEffect, useState, useCallback, useRef } from 'react';
import { Client, Room } from 'colyseus.js';
import { SERVER_URL, ROOM_NAME, DEBUG } from '@/app/config/server';
import { PlayerInfo, RoomStatus, CardSuit, CardRank, GameStateSchema, PlayerSchema, CardSchema, CharacterId, GameDirection } from '@mafia/shared';
import { cardToUI, UICard } from '@/app/utils/cardConverter';

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
  room: Room<GameStateSchema> | null;
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
    currentTurn: string | null;
    direction: GameDirection;
    attackStack: number;
    topCard: UICard | null;
    selectedSuit: CardSuit | null;
    deckCount: number;
    winnerId: string | null;
  } | null;

  // 메시지 전송 함수
  sendMessage: <T = unknown>(type: string, message?: T) => void;

  // 메시지 리스너 등록 함수
  onMessage: <T = unknown>(type: string, callback: (message: T) => void) => void;
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
  const [room, setRoom] = useState<Room<GameStateSchema> | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [gameState, setGameState] = useState<UseColyseusRoomReturn['gameState']>(null);

  const clientRef = useRef<Client | null>(null);
  const roomRef = useRef<Room<GameStateSchema> | null>(null);
  const messageListenersRef = useRef<Map<string, Set<(message: unknown) => void>>>(new Map());

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
      if (roomRef.current) {
        roomRef.current.leave();
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

      const newRoom = await clientRef.current.joinOrCreate<GameStateSchema>(ROOM_NAME, options || {});

      setRoom(newRoom);
      roomRef.current = newRoom; // ref에도 저장
      setSessionId(newRoom.sessionId);
      setStatus('connected');

      if (DEBUG) {
        console.log('[Colyseus] 방 연결 성공:', newRoom.sessionId);
      }

      // 상태 변경 리스너 등록
      newRoom.onStateChange((state) => {
        try {
          if (DEBUG) {
            console.log('[Colyseus] 상태 변경:', state);
          }

          // 내 플레이어 정보 추출
          const myPlayerData = state.players.get(newRoom.sessionId);
        let myPlayer: PlayerInfo | null = null;
        let myHand: UICard[] = [];

        if (myPlayerData) {
          // PlayerSchema의 hand (ArraySchema<CardSchema>)를 UICard 배열로 변환
          // Colyseus는 ArraySchema를 배열처럼 사용할 수 있도록 제공
          const handArray = Array.from(myPlayerData.hand);
          myHand = handArray.map((card: CardSchema) => cardToUI({
            id: card.id,
            suit: card.suit as CardSuit,
            rank: card.rank as CardRank,
          }));

          // PlayerSchema에서 모든 정보 가져오기
          const characterId: CharacterId | null = myPlayerData.characterId 
            ? (myPlayerData.characterId as CharacterId)
            : null;

          myPlayer = {
            id: newRoom.sessionId,
            nickname: myPlayerData.nickname || '',
            characterId,
            isReady: myPlayerData.isReady,
            isHost: myPlayerData.isHost,
            handCount: myHand.length,
            skillCooldown: myPlayerData.skillCooldown,
            skillUsesLeft: myPlayerData.skillUsesLeft,
          };
        }

        // 모든 플레이어 정보 변환
        const players = new Map<string, PlayerInfo>();
        state.players.forEach((playerData: PlayerSchema, id: string) => {
          if (id === newRoom.sessionId) {
            if (myPlayer) {
              players.set(id, myPlayer);
            }
          } else {
            // 다른 플레이어는 핸드 개수만 알 수 있음 (보안)
            const handCount = Array.from(playerData.hand).length;
            const characterId: CharacterId | null = playerData.characterId 
              ? (playerData.characterId as CharacterId)
              : null;
            
            players.set(id, {
              id,
              nickname: playerData.nickname || '',
              characterId,
              isReady: playerData.isReady,
              isHost: playerData.isHost,
              handCount,
              skillCooldown: playerData.skillCooldown,
              skillUsesLeft: playerData.skillUsesLeft,
            });
          }
        });

        // 추가 게임 상태 동기화
        const currentTurn = state.currentTurn || null;
        const direction = (state.direction === 'counter-clockwise' ? 'counter-clockwise' : 'clockwise') as GameDirection;
        const attackStack = state.attackStack || 0;
        // topCard가 빈 카드(id가 빈 문자열)인지 확인
        const topCard = (state.topCard && state.topCard.id && state.topCard.id !== "") ? cardToUI({
          id: state.topCard.id,
          suit: state.topCard.suit as CardSuit,
          rank: state.topCard.rank as CardRank,
        }) : null;
        const selectedSuit = state.selectedSuit ? (state.selectedSuit as CardSuit) : null;
        const deckCount = state.deckCount || 0;
        const winnerId = state.winnerId || null;

        const newGameState = {
          status: state.status as RoomStatus,
          players,
          myPlayer,
          myHand,
          currentTurn,
          direction,
          attackStack,
          topCard,
          selectedSuit,
          deckCount,
          winnerId,
        };

        if (DEBUG) {
          console.log('[Colyseus] 게임 상태 업데이트:', {
            status: newGameState.status,
            playersCount: newGameState.players.size,
            myHandCount: newGameState.myHand.length,
            currentTurn: newGameState.currentTurn,
            direction: newGameState.direction,
            attackStack: newGameState.attackStack,
            topCard: newGameState.topCard,
            deckCount: newGameState.deckCount,
          });
        }

        setGameState(newGameState);
        } catch (err) {
          console.error('[Colyseus] 상태 동기화 중 에러:', err);
          // 에러가 발생해도 연결은 유지
        }
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
        roomRef.current = null; // ref도 초기화
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
    if (roomRef.current) {
      roomRef.current.leave();
      setRoom(null);
      roomRef.current = null;
      setSessionId(null);
      setStatus('disconnected');
      setGameState(null);
      if (DEBUG) {
        console.log('[Colyseus] 방 연결 해제');
      }
    }
  }, []);

  // 메시지 전송
  const sendMessage = useCallback(<T = unknown>(type: string, message?: T) => {
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
  const onMessage = useCallback(<T = unknown>(type: string, callback: (message: T) => void) => {
    if (!room) {
      console.warn('[Colyseus] 리스너 등록 실패: 방에 연결되지 않음');
      return;
    }

    // 리스너 맵에 등록 (나중에 제거할 수 있도록)
    if (!messageListenersRef.current.has(type)) {
      messageListenersRef.current.set(type, new Set());
    }
    messageListenersRef.current.get(type)!.add(callback as (message: unknown) => void);

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

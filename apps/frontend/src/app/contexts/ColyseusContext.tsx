import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { Client, Room } from 'colyseus.js';
import { SERVER_URL, ROOM_NAME, DEBUG } from '@/app/config/server';
import { PlayerInfo, RoomStatus, CardSuit, CardRank, GameStateSchema, PlayerSchema, CardSchema, CharacterId, GameDirection, GAME_CONSTANTS } from '@mafia/shared';
import { cardToUI, UICard } from '@/app/utils/cardConverter';

/**
 * Colyseus 방 연결 상태
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Colyseus Context 값 타입
 */
export interface ColyseusContextValue {
  // 연결 상태
  status: ConnectionStatus;
  room: Room<GameStateSchema> | null;
  sessionId: string | null;
  error: Error | null;

  // 연결/해제 함수
  connect: (options?: { name?: string; characterId?: CharacterId; mode?: 'quick' | 'custom'; roomCode?: string; isHost?: boolean; maxPlayers?: number }) => Promise<void>;
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
    timerEndTime: number;
    maxPlayers: number;
  } | null;

  // 메시지 전송 함수
  sendMessage: <T = unknown>(type: string, message?: T) => void;

  // 메시지 리스너 등록 함수
  onMessage: <T = unknown>(type: string, callback: (message: T) => void) => () => void;
}

const ColyseusContext = createContext<ColyseusContextValue | null>(null);

interface ColyseusProviderProps {
  children: ReactNode;
}

export function ColyseusProvider({ children }: ColyseusProviderProps) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [room, setRoom] = useState<Room<GameStateSchema> | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [gameState, setGameState] = useState<ColyseusContextValue['gameState']>(null);

  const clientRef = useRef<Client | null>(null);
  const roomRef = useRef<Room<GameStateSchema> | null>(null);
  const messageListenersRef = useRef<Map<string, Set<(message: unknown) => void>>>(new Map());
  const registeredMessageTypesRef = useRef<Set<string>>(new Set());

  // 클라이언트 초기화 (앱 시작 시 한 번만)
  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = new Client(SERVER_URL);
      if (DEBUG) {
        console.log('[ColyseusProvider] 클라이언트 초기화:', SERVER_URL);
      }
    }
  }, []);

  // 방 연결
  const connect = useCallback(async (options?: { name?: string; characterId?: CharacterId; mode?: 'quick' | 'custom'; roomCode?: string; isHost?: boolean; maxPlayers?: number }) => {
    console.log('[ColyseusProvider.connect] 방 연결 시도 시작');
    console.log('[ColyseusProvider.connect] Options:', JSON.stringify(options));
    
    if (!clientRef.current) {
      const error = new Error('Colyseus 클라이언트가 초기화되지 않았습니다.');
      console.error('[ColyseusProvider.connect] 에러: 클라이언트가 초기화되지 않음');
      setError(error);
      setStatus('error');
      return;
    }

    // 이미 연결되어 있으면 무시
    if (roomRef.current && status === 'connected') {
      console.log('[ColyseusProvider.connect] 이미 연결되어 있음');
      return;
    }

    try {
      setStatus('connecting');
      setError(null);
      console.log('[ColyseusProvider.connect] 연결 상태: connecting');

      let newRoom: Room<GameStateSchema>;
      if (options?.mode === 'quick') {
        console.log('[ColyseusProvider.connect] 빠른 게임 모드: 기존 방 조인 시도');
        try {
          newRoom = await clientRef.current.join<GameStateSchema>(ROOM_NAME, options || {});
          console.log('[ColyseusProvider.connect] 빠른 게임: 기존 방 조인 성공. Room ID:', newRoom.roomId);
        } catch (error) {
          console.log('[ColyseusProvider.connect] 빠른 게임: 기존 방 조인 실패, 새 방 생성 시도');
          newRoom = await clientRef.current.create<GameStateSchema>(ROOM_NAME, options || {});
          console.log('[ColyseusProvider.connect] 빠른 게임: 새 방 생성 성공. Room ID:', newRoom.roomId);
        }
      } else {
        // 커스텀 게임: 방 코드 기반 매칭
        console.log('[ColyseusProvider.connect] 커스텀 게임 모드: 방 코드 기반 매칭 시작');
        if (!options?.roomCode) {
          const error = new Error('커스텀 게임에는 방 코드가 필요합니다.');
          throw error;
        }

        const connectOptions = {
          ...options,
          roomCode: options.roomCode.toUpperCase(),
        };

        if (options.isHost) {
          const hostOptions = {
            ...connectOptions,
            maxPlayers: options.maxPlayers || GAME_CONSTANTS.MAX_PLAYERS,
          };
          console.log('[ColyseusProvider.connect] 호스트 모드: 새 방 생성 시도. 방 코드:', connectOptions.roomCode);
          newRoom = await clientRef.current.create<GameStateSchema>(ROOM_NAME, hostOptions);
          console.log('[ColyseusProvider.connect] 커스텀 게임: 방 생성 성공. Room ID:', newRoom.roomId);
        } else {
          console.log('[ColyseusProvider.connect] 게스트 모드: 기존 방 조인 시도. 방 코드:', connectOptions.roomCode);
          try {
            newRoom = await clientRef.current.join<GameStateSchema>(ROOM_NAME, connectOptions);
            console.log('[ColyseusProvider.connect] 커스텀 게임: 방 조인 성공. Room ID:', newRoom.roomId);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('Invalid room code') || errorMessage.includes('not found')) {
              throw new Error('존재하지 않는 방입니다. 방 코드를 확인해주세요.');
            }
            throw error;
          }
        }
      }

      setRoom(newRoom);
      roomRef.current = newRoom;
      setSessionId(newRoom.sessionId);
      setStatus('connected');
      console.log('[ColyseusProvider.connect] 방 연결 성공. Session ID:', newRoom.sessionId);

      // 상태 변경 리스너 등록
      newRoom.onStateChange((state) => {
        try {
          const myPlayerData = state.players.get(newRoom.sessionId);
          let myPlayer: PlayerInfo | null = null;
          let myHand: UICard[] = [];

          if (myPlayerData) {
            const handArray = Array.from(myPlayerData.hand);
            myHand = handArray.map((card: CardSchema) => cardToUI({
              id: card.id,
              suit: card.suit as CardSuit,
              rank: card.rank as CardRank,
            }));

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
              skillCooldown: myPlayerData.skillProgress || 0,
              skillUsesLeft: myPlayerData.skillUsesLeft || 0,
              skillProgress: myPlayerData.skillProgress || 0,
              skillMaxCooldown: myPlayerData.skillMaxCooldown || 0,
              activeEffects: Array.from(myPlayerData.activeEffects || []),
            };
          }

          const players = new Map<string, PlayerInfo>();
          state.players.forEach((playerData: PlayerSchema, id: string) => {
            if (id === newRoom.sessionId) {
              if (myPlayer) {
                players.set(id, myPlayer);
              }
            } else {
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
                skillCooldown: playerData.skillProgress || 0,
                skillUsesLeft: playerData.skillUsesLeft || 0,
                skillProgress: playerData.skillProgress || 0,
                skillMaxCooldown: playerData.skillMaxCooldown || 0,
                activeEffects: Array.from(playerData.activeEffects || []),
              });
            }
          });

          const currentTurn = state.currentTurn || null;
          const direction = (state.direction === 'counter-clockwise' ? 'counter-clockwise' : 'clockwise') as GameDirection;
          const attackStack = state.attackStack || 0;
          const topCard = (state.topCard && state.topCard.id && state.topCard.id !== "") ? cardToUI({
            id: state.topCard.id,
            suit: state.topCard.suit as CardSuit,
            rank: state.topCard.rank as CardRank,
          }) : null;
          const selectedSuit = state.selectedSuit ? (state.selectedSuit as CardSuit) : null;
          const deckCount = state.deckCount || 0;
          const winnerId = state.winnerId || null;
          const timerEndTime = state.timerEndTime || 0;
          const maxPlayers = state.maxPlayers || GAME_CONSTANTS.MAX_PLAYERS;

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
            timerEndTime,
            maxPlayers,
          };

          if (DEBUG) {
            console.log('[ColyseusProvider] 게임 상태 업데이트:', {
              status: newGameState.status,
              playersCount: newGameState.players.size,
              myHandCount: newGameState.myHand.length,
            });
          }

          setGameState(newGameState);
        } catch (err) {
          console.error('[ColyseusProvider] 상태 동기화 중 에러:', err);
        }
      });

      // 에러 처리
      newRoom.onError((code, message) => {
        const error = new Error(`Colyseus 에러 [${code}]: ${message}`);
        console.error('[ColyseusProvider] Colyseus 에러 발생:', error);
        setError(error);
        setStatus('error');
      });

      // 연결 끊김 처리
      newRoom.onLeave((code) => {
        console.log('[ColyseusProvider] 방 나감:', code);
        setStatus('disconnected');
        setRoom(null);
        roomRef.current = null;
        setSessionId(null);
        setGameState(null);
        // 메시지 리스너 정리
        messageListenersRef.current.clear();
        registeredMessageTypesRef.current.clear();
      });

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[ColyseusProvider.connect] 연결 실패:', error);
      setError(error);
      setStatus('error');
      throw error;
    }
  }, [status]);

  // 방 연결 해제
  const disconnect = useCallback(() => {
    if (roomRef.current) {
      console.log('[ColyseusProvider] 연결 해제');
      roomRef.current.leave();
      setRoom(null);
      roomRef.current = null;
      setSessionId(null);
      setStatus('disconnected');
      setGameState(null);
      // 메시지 리스너 정리
      messageListenersRef.current.clear();
      registeredMessageTypesRef.current.clear();
    }
  }, []);

  // 메시지 전송
  const sendMessage = useCallback(<T = unknown>(type: string, message?: T) => {
    if (!roomRef.current) {
      console.warn('[ColyseusProvider] 메시지 전송 실패: 방에 연결되지 않음');
      return;
    }

    try {
      roomRef.current.send(type, message);
      if (DEBUG) {
        console.log('[ColyseusProvider] 메시지 전송:', type, message);
      }
    } catch (err) {
      console.error('[ColyseusProvider] 메시지 전송 에러:', err);
    }
  }, []);

  // 메시지 리스너 등록 (cleanup 함수 반환)
  const onMessage = useCallback(<T = unknown>(type: string, callback: (message: T) => void) => {
    if (!roomRef.current) {
      console.warn('[ColyseusProvider] 리스너 등록 실패: 방에 연결되지 않음');
      return () => {};
    }

    // 리스너 맵에 등록
    if (!messageListenersRef.current.has(type)) {
      messageListenersRef.current.set(type, new Set());
    }
    const listeners = messageListenersRef.current.get(type)!;
    listeners.add(callback as (message: unknown) => void);

    // Colyseus 리스너는 타입당 한 번만 등록 (중복 등록 방지)
    if (!registeredMessageTypesRef.current.has(type)) {
      registeredMessageTypesRef.current.add(type);
      roomRef.current.onMessage(type, (message: T) => {
        if (DEBUG) {
          console.log('[ColyseusProvider] 메시지 수신:', type, message);
        }
        // 등록된 모든 리스너에게 메시지 전달
        const currentListeners = messageListenersRef.current.get(type);
        if (currentListeners) {
          currentListeners.forEach(listener => {
            try {
              listener(message);
            } catch (err) {
              console.error('[ColyseusProvider] 리스너 실행 에러:', err);
            }
          });
        }
      });
    }

    // cleanup 함수 반환
    return () => {
      listeners.delete(callback as (message: unknown) => void);
    };
  }, []);

  const value: ColyseusContextValue = {
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

  return (
    <ColyseusContext.Provider value={value}>
      {children}
    </ColyseusContext.Provider>
  );
}

/**
 * Colyseus 연결 상태를 사용하는 훅
 */
export function useColyseus(): ColyseusContextValue {
  const context = useContext(ColyseusContext);
  if (!context) {
    throw new Error('useColyseus must be used within a ColyseusProvider');
  }
  return context;
}

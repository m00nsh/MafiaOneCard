import { useState } from 'react';
import MainScreen from '@/app/components/MainScreen';
import GameModeScreen from '@/app/components/GameModeScreen';
import PlayerCountScreen from '@/app/components/PlayerCountScreen';
import RoomScreen from '@/app/components/RoomScreen';
import LoadingScreen from '@/app/components/LoadingScreen';
import CharacterSelectScreen from '@/app/components/CharacterSelectScreen';
import GameScreen from '@/app/components/GameScreen';
import CardSpriteTestScreen from '@/app/components/CardSpriteTestScreen';
import { Toaster } from '@/app/components/ui/sonner';
import { ColyseusProvider } from '@/app/contexts/ColyseusContext';

export type GameMode = 'custom' | 'quick';
export type Screen = 'main' | 'gameMode' | 'playerCount' | 'room' | 'loading' | 'characterSelect' | 'game' | 'spriteTest';

export interface GameState {
  screen: Screen;
  gameMode: GameMode | null;
  playerCount: number;
  selectedCharacters: string[];
  nickname: string;
  isHost: boolean;
  roomCode: string;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    screen: 'main',
    gameMode: null,
    playerCount: 2,
    selectedCharacters: [],
    nickname: '',
    isHost: false,
    roomCode: '',
  });

  const navigateToScreen = (screen: Screen) => {
    setGameState(prev => ({ ...prev, screen }));
  };

  const setGameMode = (mode: GameMode) => {
    setGameState(prev => ({ ...prev, gameMode: mode }));
  };

  const setPlayerCount = (count: number) => {
    setGameState(prev => ({ ...prev, playerCount: count }));
  };

  const setSelectedCharacters = (characters: string[]) => {
    setGameState(prev => ({ ...prev, selectedCharacters: characters }));
  };

  const setNickname = (nickname: string) => {
    setGameState(prev => ({ ...prev, nickname }));
  };

  const setIsHost = (isHost: boolean) => {
    setGameState(prev => ({ ...prev, isHost }));
  };

  const setRoomCode = (roomCode: string) => {
    setGameState(prev => ({ ...prev, roomCode }));
  };

  return (
    <ColyseusProvider>
      <div className="size-full bg-background overflow-hidden">
        {gameState.screen === 'main' && (
          <MainScreen
            onStart={() => navigateToScreen('gameMode')}
            onSpriteTest={() => navigateToScreen('spriteTest')}
          />
        )}

        {gameState.screen === 'spriteTest' && (
          <CardSpriteTestScreen onBack={() => navigateToScreen('main')} />
        )}

        {gameState.screen === 'gameMode' && (
          <GameModeScreen
            onSelectMode={(mode, isHost) => {
              setGameMode(mode);
              setIsHost(isHost);
              if (mode === 'custom') {
                navigateToScreen('room');
              } else {
                // 빠른 게임: 바로 캐릭터 선택 화면으로
                navigateToScreen('characterSelect');
              }
            }}
            onSetNickname={setNickname}
            onBack={() => navigateToScreen('main')}
          />
        )}

        {gameState.screen === 'playerCount' && (
          <PlayerCountScreen
            onSelectCount={(count) => {
              setPlayerCount(count);
              navigateToScreen('loading');
            }}
            onBack={() => navigateToScreen('gameMode')}
          />
        )}

        {gameState.screen === 'room' && (
          <RoomScreen
            isHost={gameState.isHost}
            nickname={gameState.nickname}
            roomCode={gameState.roomCode}
            maxPlayers={gameState.playerCount}
            onBack={() => navigateToScreen('gameMode')}
            onSetRoomCode={setRoomCode}
            onSetPlayerCount={setPlayerCount}
            onNavigateToCharacterSelect={() => navigateToScreen('characterSelect')}
          />
        )}

        {gameState.screen === 'loading' && (
          <LoadingScreen
            onComplete={() => {
              // 커스텀 게임 모드: 캐릭터 선택 화면으로
              if (gameState.gameMode === 'custom') {
                navigateToScreen('characterSelect');
              }
            }}
            onBack={() => {
              if (gameState.gameMode === 'custom') {
                navigateToScreen('room');
              } else {
                navigateToScreen('characterSelect');
              }
            }}
            gameMode={gameState.gameMode || undefined}
            selectedCharacters={gameState.selectedCharacters}
            nickname={gameState.nickname}
            roomCode={gameState.roomCode}
            isHost={gameState.isHost}
            onGameStart={() => {
              // 빠른 게임 모드: 게임 시작 시 게임 화면으로
              if (gameState.gameMode === 'quick') {
                navigateToScreen('game');
              }
            }}
          />
        )}

        {gameState.screen === 'characterSelect' && (
          <CharacterSelectScreen
            onComplete={(characters) => {
              setSelectedCharacters(characters);
              // 캐릭터 선택 완료 후 게임 화면으로 이동 (모든 플레이어가 선택할 때까지 대기)
              navigateToScreen('game');
            }}
            onBack={() => {
              if (gameState.gameMode === 'quick') {
                navigateToScreen('gameMode');
              } else {
                navigateToScreen('room');
              }
            }}
          />
        )}

        {gameState.screen === 'game' && (
          <GameScreen
            playerCount={gameState.playerCount}
            selectedCharacters={gameState.selectedCharacters}
            nickname={gameState.nickname}
            gameMode={gameState.gameMode || undefined}
            onBackToMain={() => navigateToScreen('main')}
          />
        )}

        {/* Toast 알림 시스템 */}
        <Toaster position="top-center" richColors closeButton />
      </div>
    </ColyseusProvider>
  );
}

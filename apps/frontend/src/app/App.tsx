import { useState } from 'react';
import MainScreen from '@/app/components/MainScreen';
import GameModeScreen from '@/app/components/GameModeScreen';
import PlayerCountScreen from '@/app/components/PlayerCountScreen';
import RoomScreen from '@/app/components/RoomScreen';
import LoadingScreen from '@/app/components/LoadingScreen';
import CharacterSelectScreen from '@/app/components/CharacterSelectScreen';
import GameScreen from '@/app/components/GameScreen';

export type GameMode = 'custom' | 'quick';
export type Screen = 'main' | 'gameMode' | 'playerCount' | 'room' | 'loading' | 'characterSelect' | 'game';

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
    <div className="size-full bg-background overflow-hidden">
      {gameState.screen === 'main' && (
        <MainScreen onStart={() => navigateToScreen('gameMode')} />
      )}
      
      {gameState.screen === 'gameMode' && (
        <GameModeScreen 
          onSelectMode={(mode, isHost) => {
            setGameMode(mode);
            setIsHost(isHost);
            if (mode === 'custom') {
              navigateToScreen('room');
            } else {
              navigateToScreen('playerCount');
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
          onStart={() => navigateToScreen('loading')}
          onBack={() => navigateToScreen('gameMode')}
          onSetRoomCode={setRoomCode}
          onSetPlayerCount={setPlayerCount}
        />
      )}

      {gameState.screen === 'loading' && (
        <LoadingScreen
          onComplete={() => navigateToScreen('characterSelect')}
          onBack={() => {
            if (gameState.gameMode === 'custom') {
              navigateToScreen('room');
            } else {
              navigateToScreen('playerCount');
            }
          }}
        />
      )}

      {gameState.screen === 'characterSelect' && (
        <CharacterSelectScreen
          playerCount={gameState.playerCount}
          onComplete={(characters) => {
            setSelectedCharacters(characters);
            navigateToScreen('game');
          }}
        />
      )}

      {gameState.screen === 'game' && (
        <GameScreen
          playerCount={gameState.playerCount}
          selectedCharacters={gameState.selectedCharacters}
        />
      )}
    </div>
  );
}
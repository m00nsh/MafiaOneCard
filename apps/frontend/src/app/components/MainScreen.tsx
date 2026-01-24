interface MainScreenProps {
  onStart: () => void;
}

export default function MainScreen({ onStart }: MainScreenProps) {
  return (
    <div className="size-full flex flex-col items-center justify-center bg-gradient-to-br from-green-700 via-green-600 to-green-800">
      <div className="text-center space-y-12">
        <h1 className="text-6xl text-white mb-8">원카드 배틀</h1>
        <button
          onClick={onStart}
          className="px-16 py-6 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-xl transition-all transform hover:scale-105 shadow-lg"
        >
          게임 시작
        </button>
      </div>
    </div>
  );
}

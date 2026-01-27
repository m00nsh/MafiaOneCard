import LandscapeLayout from '@/app/components/ui/LandscapeLayout';

interface MainScreenProps {
  onStart: () => void;
  onSpriteTest?: () => void;
}

export default function MainScreen({ onStart, onSpriteTest }: MainScreenProps) {
  return (
    <LandscapeLayout>
      <div 
        className="size-full relative bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/Game_title_1.png)',
        }}
      >
        {/* 기존 텍스트와 버튼 제거 - 이미지에 포함되어 있음 */}
        
        {/* 이미지 하단 중앙의 "게임 시작!" 텍스트 영역 클릭 가능하게 만들기 */}
        {/* 이미지 기준으로 하단 중앙 약 10% 영역을 클릭 가능하게 설정 */}
        <button
          onClick={onStart}
          className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-[300px] h-[80px] bg-transparent hover:bg-white/10 rounded-lg transition-all cursor-pointer"
          style={{
            // 더 정확한 위치 조정이 필요하면 여기서 수정
          }}
          aria-label="게임 시작"
        />

        {/* Debug Button */}
        {onSpriteTest && (
          <button
            onClick={onSpriteTest}
            className="text-white/30 text-sm hover:text-white/80 transition-colors absolute bottom-4 right-4 z-10"
          >
            [Dev: Card Sprites]
          </button>
        )}
      </div>
    </LandscapeLayout>
  );
}

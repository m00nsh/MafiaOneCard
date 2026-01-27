import OpponentProfile, { OpponentPlayer } from './OpponentProfile';

interface OpponentsAreaProps {
  opponents: OpponentPlayer[];
  currentTurn: string | null;
}

/**
 * 상대방 플레이어들을 표시하는 영역 컴포넌트
 */
export default function OpponentsArea({ opponents, currentTurn }: OpponentsAreaProps) {
  return (
    <div className="flex justify-between items-start w-full mt-8 sm:mt-12">
      {/* Left Column */}
      <div className="flex flex-col gap-8 sm:gap-12 pl-4 sm:pl-12">
        {opponents.filter(p => p.position === 'left-top').map(p => (
          <OpponentProfile key={p.id} player={p} isTurn={currentTurn === p.id} />
        ))}
        {opponents.filter(p => p.position === 'left-bottom').map(p => (
          <OpponentProfile key={p.id} player={p} isTurn={currentTurn === p.id} />
        ))}
      </div>

      {/* Right Column */}
      <div className="flex flex-col gap-8 sm:gap-12 pr-4 sm:pr-12">
        {opponents.filter(p => p.position === 'right-top').map(p => (
          <OpponentProfile key={p.id} player={p} isTurn={currentTurn === p.id} />
        ))}
        {opponents.filter(p => p.position === 'right-bottom').map(p => (
          <OpponentProfile key={p.id} player={p} isTurn={currentTurn === p.id} />
        ))}
      </div>
    </div>
  );
}

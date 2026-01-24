import { ArrowLeft } from 'lucide-react';
import PlayingCard from '@/app/components/PlayingCard';
import LandscapeLayout from '@/app/components/ui/LandscapeLayout';
import { Suit, Rank } from '@/app/utils/gameLogic';

interface CardSpriteTestScreenProps {
    onBack: () => void;
}

export default function CardSpriteTestScreen({ onBack }: CardSpriteTestScreenProps) {
    const suits: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades'];
    const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    return (
        <LandscapeLayout>
            <div className="size-full flex flex-col p-4 sm:p-8 bg-gray-900 overflow-auto">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={onBack}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-white" />
                    </button>
                    <h2 className="text-2xl text-white font-bold">Sprite Sheet Verification</h2>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-14 gap-2 min-w-max pb-8">
                        {/* Header Row */}
                        <div className="text-white font-bold text-center">Back</div>
                        {ranks.map(rank => (
                            <div key={rank} className="text-white font-bold text-center">{rank}</div>
                        ))}

                        {/* Suits Rows */}
                        {suits.map(suit => (
                            <div key={suit} className="contents">
                                <div className="flex items-center justify-center text-white font-bold capitalize">
                                    {suit}
                                </div>
                                {ranks.map(rank => (
                                    <div key={`${suit}-${rank}`} className="flex justify-center p-1">
                                        <PlayingCard
                                            card={{ suit, rank }}
                                            className="w-20" // Aspect ratio handled by component
                                        />
                                    </div>
                                ))}
                            </div>
                        ))}

                        {/* Special / Back Row */}
                        <div className="contents">
                            <div className="flex items-center justify-center text-white font-bold">
                                Misc
                            </div>
                            <div className="flex justify-center p-1">
                                <PlayingCard
                                    card={{ suit: 'joker', rank: 'JOKER' as any }}
                                    faceDown={true}
                                    className="w-20" // Width controlled, height auto by aspect-ratio
                                />
                            </div>
                            <div className="flex justify-center p-1">
                                {/* Black Joker */}
                                <PlayingCard
                                    card={{ suit: 'joker', rank: 'JOKER' as any }}
                                    className="w-20"
                                />
                            </div>
                            <div className="flex justify-center p-1">
                                {/* Red Joker */}
                                <PlayingCard
                                    card={{ suit: 'joker', rank: 'RED_JOKER' as any }}
                                    className="w-20"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </LandscapeLayout>
    );
}

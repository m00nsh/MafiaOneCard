/**
 * 랜덤 닉네임 생성기
 * 조합: "4음절 이내 형용사 + 3음절 이내 명사"
 * 경우의 수: 15 * 15 = 225개
 */
export const generateRandomNickname = (): string => {
    const adjectives: string[] = [
        "행복한", "건강한", "귀여운", "용감한", "신속한",
        "차분한", "똑똑한", "즐거운", "따뜻한", "빛나는",
        "당당한", "씩씩한", "신비로운", "포근한", "화사한"
    ];

    const nouns: string[] = [
        "고등어", "사자", "호랑이", "토끼", "거북이",
        "기린", "판다", "고래", "여우", "독수리",
        "다람쥐", "병아리", "강아지", "문어", "코알라"
    ];

    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

    return `${randomAdjective} ${randomNoun}`;
};

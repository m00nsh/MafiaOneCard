// apps/backend/test-client.ts
import { Client } from "colyseus.js";

//const client = new Client("ws://localhost:2567");
const client = new Client("ws://127.0.0.1:2567"); // localhost 대신 숫자로 변경

async function main() {
    try {
        // : any 를 붙여서 타입 체크를 유연하게 만듭니다.
        const room: any = await client.joinOrCreate("mafia_room", { name: "테스터1" });
        console.log(`✅ 접속 성공! ID: ${room.sessionId}`);

        room.send("ready");
        console.log("📢 준비 완료 메시지 전송!");

        // 서버 데이터(State)가 완전히 동기화될 때까지 '한 번만' 기다립니다.
        room.onStateChange.once((state: any) => {
            console.log("📦 서버 데이터 동기화 완료!");

            // 데이터가 확실히 있을 때 리스너를 답니다.
            state.players.onAdd((player: any, key: string) => {
                console.log(`👤 플레이어 입장: ${key}`);

                player.hand.onAdd((card: any) => {
                    console.log(`🃏 카드 도착: [${card.suit}-${card.rank}]`);
                });
            });
        });

    } catch (e) {
        console.error("❌ 에러 발생:", e);
    }
}

main();
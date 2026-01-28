import express from 'express';
import { createServer } from 'http';
import { Server } from 'colyseus';
import { monitor } from "@colyseus/monitor";
import cors from 'cors';
import { MafiaRoom } from './rooms/MafiaRoom';

const app = express();
app.use(cors());

// /colyseus 주소로 접속하면 모니터 화면이 뜨게 합니다.
app.use("/colyseus", monitor() as any);
const port = 2567;

// 게임 서버를 위한 HTTP 서버 생성
const server = createServer(app);
const gameServer = new Server({
    server: server,
});

// 'mafia_room'이라는 이름으로 방을 정의(등록)합니다.
// filterBy 옵션을 사용하여 방 코드로 필터링 가능하도록 설정
gameServer.define("mafia_room", MafiaRoom)
    .enableRealtimeListing()
    .filterBy(['roomCode', 'mode']);

app.get('/', (req, res) => {
    res.send('게임 서버가 준비되었습니다. 소켓 연결이 가능합니다! 🃏');
});

server.listen(port, () => {
    console.log(`Colyseus 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
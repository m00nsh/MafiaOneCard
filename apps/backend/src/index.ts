import express from 'express';
import { createServer } from 'http';
import { Server } from 'colyseus';
import { MafiaRoom } from './rooms/MafiaRoom';

const app = express();
const port = 2567;

// 게임 서버를 위한 HTTP 서버 생성
const server = createServer(app);
const gameServer = new Server({
    server: server,
});

// 'mafia_onecard'라는 이름으로 방을 정의(등록)합니다.
gameServer.define("mafia_onecard", MafiaRoom);

app.get('/', (req, res) => {
    res.send('게임 서버가 준비되었습니다. 소켓 연결이 가능합니다! 🃏');
});

server.listen(port, () => {
    console.log(`Colyseus 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
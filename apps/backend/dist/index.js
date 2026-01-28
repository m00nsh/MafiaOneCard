"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const colyseus_1 = require("colyseus");
const monitor_1 = require("@colyseus/monitor");
const cors_1 = __importDefault(require("cors"));
const MafiaRoom_1 = require("./rooms/MafiaRoom");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
// /colyseus 주소로 접속하면 모니터 화면이 뜨게 합니다.
app.use("/colyseus", (0, monitor_1.monitor)());
const port = 2567;
// 게임 서버를 위한 HTTP 서버 생성
const server = (0, http_1.createServer)(app);
const gameServer = new colyseus_1.Server({
    server: server,
});
// 'mafia_room'이라는 이름으로 방을 정의(등록)합니다.
// filterBy 옵션을 사용하여 방 코드로 필터링 가능하도록 설정
gameServer.define("mafia_room", MafiaRoom_1.MafiaRoom)
    .enableRealtimeListing()
    .filterBy(['roomCode', 'mode']);
app.get('/', (req, res) => {
    res.send('게임 서버가 준비되었습니다. 소켓 연결이 가능합니다! 🃏');
});
server.listen(port, () => {
    console.log(`Colyseus 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});

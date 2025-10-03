
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3001 });

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      // Если это не JSON, просто ретранслируем как раньше
      wss.clients.forEach(function each(client) {
        if (client !== ws && client.readyState === client.OPEN) {
          client.send(message);
        }
      });
      return;
    }
    // Событие "печатает..."
    if (data.type === 'typing' && data.chatId && data.userId) {
      wss.clients.forEach(function each(client) {
        if (client !== ws && client.readyState === client.OPEN) {
          client.send(JSON.stringify({
            type: 'typing',
            chatId: data.chatId,
            userId: data.userId,
            userName: data.userName
          }));
        }
      });
      return;
    }
    // Событие "прочитано"
    if (data.type === 'read' && data.chatId && data.messageId && data.userId) {
      wss.clients.forEach(function each(client) {
        if (client !== ws && client.readyState === client.OPEN) {
          client.send(JSON.stringify({
            type: 'read',
            chatId: data.chatId,
            messageId: data.messageId,
            userId: data.userId
          }));
        }
      });
      return;
    }
    // По умолчанию — ретрансляция (чат)
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === client.OPEN) {
        client.send(message);
      }
    });
  });
});

console.log('WebSocket server running on ws://localhost:3001');

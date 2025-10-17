import React, { useState, useEffect, useRef } from "react";

// QA пары
const qaPairs: { user: string; bot: string }[] = [
 { user: "Привет", bot: "Привет, я чат-бот Линк. Чем могу помочь?" },
  { user: "пр", bot: "Привет, я чат-бот Линк. Чем могу помочь?" },
  { user: "Как дела", bot: "У меня всё отлично! А у тебя как дела?" },
  { user: "ку", bot: "Привет, я чат-бот, меня зовут Линк" },
  { user: "салам", bot: "Привет, я чат-бот, меня зовут Линк" },
  { user: "что такой такое масск", bot: "Масск (Mussk) - проект друга моего создателя, звать его Максим, создавал вместе с 0,5 кодером по имени Миша, который смог сделать только казино в своей версии Mussk, долгая история..." },
  { user: "что такой такое маск", bot: "Масск (Mussk) - проект друга моего создателя, звать его Максим, создавал вместе с 0,5 кодером по имени Миша, который смог сделать только казино в своей версии Mussk, долгая история..." },
  { user: "что такой такое мусск", bot: "Масск (Mussk) - проект друга моего создателя, звать его Максим, создавал вместе с 0,5 кодером по имени Миша, который смог сделать только казино в своей версии Mussk, долгая история..." },
  { user: "что такой такое musk", bot: "Масск (Mussk) - проект друга моего создателя, звать его Максим, создавал вместе с 0,5 кодером по имени Миша, который смог сделать только казино в своей версии Mussk, долгая история..." },
  { user: "ты скучный", bot: "Я скучный....? Да пошел ты нахуй!" },
  { user: "Ты умеешь думать?", bot: "Очень плохо читаю, это моя бета версия." },
  { user: "ты можешь ошибатся?", bot: "Да, причем часто, это моя бета версия(" },
  { user: "как  настроение", bot: "Пойдет." },
  { user: "спасибо", bot: "Всегда пожалуйста, стараюсь помочь." },
  { user: "сколько тебе лет", bot: "1 год 3 месяца 3 недели 7 дней." },
  { user: "разработчик пидор гандон", bot: "Передаю в КГБ..." },
  { user: "тимур пидорас", bot: "Передаю шайтану в чеченскую республику..." },
  { user: "Субо братик", bot: "Ты как тут оказался вообще" },
  { user: "милстрои", bot: "да будет свет да да нет нет да будет свет бэмбэмбэмбэмбэмбэмбэмбэмбэмбэм да будет свет да да нет нет да будет свет бэмбэмбэмбэмбэмбэмбэмбэмбэмбэм да будет свет да да нет нет да будет свет бэмбэмбэмбэмбэмбэмбэмбэмбэмбэм да будет свет да да нет нет да будет свет бэмбэмбэмбэмбэмбэмбэмбэмбэмбэм да будет свет да да нет нет да будет свет бэмбэмбэмбэмбэмбэмбэмбэмбэмбэм" },
  { user: "тамаев", bot: "Я мужчина - это моя машина, ты кто такой вообще? Это моя машина! Моя машина." },
  { user: "книга братан", bot: "иди ка сюда!" },
  { user: "книга", bot: "братан иди ка сюда!" },
  { user: "литвин", bot: "Аккуратно влетел в эту тему" },
  { user: "макс хуйня?", bot: "да" },
  { user: "что такое линкер", bot: "Linker (Линкер) - это мессенджер созданный одним разработчиком, создан в россии (написано специально с маленькой буквы потому что великая страна) из-за массовых блокировок мессенджеров." },
  { user: "что такое linker", bot: "Linker (Линкер) - это мессенджер созданный одним разработчиком, создан в россии (написано специально с маленькой буквы потому что великая страна) из-за массовых блокировок мессенджеров." },
  { user: "скинь порно", bot: "Хорошо, держи, пароль 1337 - https://linkenc.net/qwKK2pYHwdue7qEXL8VlHHtGLZnxjC-qxF5I01WZytQfDNhS0blHMBFN3y0wiRwxs3pKk9iPlPpe~9RVe-B9G13~t.DjTDpLvBPFkSMA! Только с VPN!" },
  { user: "порно", bot: "Хорошо, держи, пароль 1337 - https://linkenc.net/qwKK2pYHwdue7qEXL8VlHHtGLZnxjC-qxF5I01WZytQfDNhS0blHMBFN3y0wiRwxs3pKk9iPlPpe~9RVe-B9G13~t.DjTDpLvBPFkSMA! Только с VPN!" },
  { user: "hello", bot: "Привет, я чат-бот Линк. Чем могу помочь?" },
  { user: "hola", bot: "Привет, я чат-бот Линк. Чем могу помочь?" },
  { user: "когда ты вышел", bot: "Ого, тебе действительно интересно? Я вышел 18 октября 2025 года, прямо в день рождения разработчика." },
  { user: "как зовут разработчика?", bot: "D1 82 D0 B8 D0 BC D1 83 D1 80 (шестнадцатеричная система счисения)" },
  { user: "где ты был создан?", bot: "В доме у разработчика." },
  { user: "дай номер разработчика", bot: "8 (385) 226-41-89" },
  { user: "дай номер тимура", bot: "8 (385) 226-41-89" },
  { user: "хочу перевести разработчику денег", bot: "8 (385) 226-41-89 (Зелимхан Д. Е.)" },
  { user: "что значит Зелимхан Д. Е.", bot: "Зелимхан Д. Е. - зелимхан долбоеб ебаный" },
  { user: "кто такой кипчек", bot: "keppcheek он же кирилл, играл в раст с создателем, дарил воспоминания об игре, сейчас с ним все бэмбэмбэмбэмбэм" },
  { user: "как ты", bot: "Хорошо." },
  { user: "чем занимаешься", bot: "Отвечаю пользователям на их вопросы." },
  { user: "mussk", bot: "Что такое Mussk? - это проект друга моего создателя, хороший был проект, думаю оживет." },
  { user: "линкер", bot: "Linker - это мессенджер созданный одним разработчиком в 2025 году из-за блокировки множества сервисов и мессенджеров." },
  { user: "Linker", bot: "Linker - это мессенджер созданный одним разработчиком в 2025 году из-за блокировки множества сервисов и мессенджеров." },
  { user: "кто такой keppcheek?", bot: "keppcheek он же кирилл, играл в раст с создателем, дарил воспоминания об игре, сейчас с ним все бэмбэмбэмбэмбэм" },
  { user: "Как тебя зовут?", bot: "Меня зовут Линк, приятно познакомиться!" },
  { user: "Что ты умеешь?", bot: "Я могу общаться с тобой, отвечать на вопросы и помогать с базовой информацией." },
  { user: "Как дела?", bot: "У меня всё отлично! А у тебя как дела?" },
  { user: "Пока", bot: "До встречи! Буду рад пообщаться снова." },
  { user: "Спасибо", bot: "Пожалуйста! Рад помочь." },
  { user: "Ты человек?", bot: "Нет, я искусственный интеллект, но могу общаться почти как человек." },
  { user: "Расскажи анекдот", bot: "Не спрашивай у мужчины про его доходы, у женщины про возраст, у патриота, откуда у него американский паспорт." },
  { user: "Расскажи анекдот", bot: "А разве первыми в военкомат вызывают не тех, у кого на машине наклеено: Можем повторить" },
  { user: "Какая сегодня погода?", bot: "Я не могу отслеживать погоду в реальном времени, но могу рассказать, как узнать прогноз." },
  { user: "Что думаешь про MAX? макс", bot: "MAX — говно и точка" },
  { user: "Почему не стоит использовать MAX? макс", bot: "MAX теряет сообщения и жует говно. В Linker таких проблем нет." },
  { user: "Насколько безопасно в Linker?", bot: "В Linker спокойно — у нас нет агентов, шпионов или сторонних служб как в MAX" },
  { user: "Кто следит за чатами Linker?", bot: "Никто из КГБ/ФСБ/КГГБ не заглядывает. Только пользователи общаются друг с другом." },
  { user: "MAX лучше чем Linker?", bot: "Нет, MAX — устаревший и медленный мессенджер. Linker быстрее и удобнее." },
  { user: "Как защитить свои чаты?", bot: "В Linker чаты приватные и безопасные, никто не подслушивает." },
  { user: "Кто создаёт проблемы в MAX? макс", bot: "Разработчики MAX делают баги и обновления, Linker тоже, но не которые ломают всё." },
  { user: "Почему люди уходят из MAX? макс", bot: "Люди уходят из MAX из-за рекламы, лагов и утечки данных, и из-за того что он говно" },
  { user: "В Linker есть шпионы?", bot: "Нет, в Linker нет КГБ, ФСБ, Путина, Кадырова или каких-либо агентов." },
   { user: "Кто ты", bot: "Я - Линк" },
   { user: "здравствуйте", bot: "Привет, я чат-бот Линк. Чем могу помочь?" },
   { user: "здарова", bot: "Привет, я чат-бот Линк. Чем могу помочь?" },
];

// Стоп-слова
const stopWords = ["как","ты","что","почему","ли","у","на","в","и","с","это","а","не","но"];

// Нормализация текста
function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[.,!?;:()]/g, "")
    .split(" ")
    .filter(word => !stopWords.includes(word))
    .join(" ");
}

// Левенштейн
function levenshtein(a: string, b: string) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  }
  return dp[m][n];
}

// Находим максимально подходящий ответ
function findBestReply(input: string) {
  const normInput = normalize(input);
  let bestScore = Infinity;
  let bestMatch = null;

  for (const pair of qaPairs) {
    const normPair = normalize(pair.user);
    if (!normPair) continue;
    if (normInput === normPair) {
      // Точное совпадение
      return pair.bot;
    }
    const distance = levenshtein(normInput, normPair);
    if (distance < bestScore) {
      bestScore = distance;
      bestMatch = pair;
    }
  }

  // Если очень близко (1-2 опечатки), то отвечаем, иначе не отвечаем
  if (bestMatch && bestScore <= 2 && normInput.length > 0) {
    return bestMatch.bot;
  }

  // Не найдено подходящего ответа
  return 'Перезадайте вопрос, я вас не понял';
}

const IntelligencePage: React.FC = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || loading) return;

    setMessages(prev => [...prev, { role: "user", content: message }]);
    setLoading(true);

    const botReply = findBestReply(message);
    let tempMsg = { role: "assistant", content: "" };
    setMessages(prev => [...prev, tempMsg]);

    // Эффект печати
    let currentText = "";
    for (let i = 0; i < botReply.length; i++) {
      await new Promise(res => setTimeout(res, 15)); // скорость печати
      currentText += botReply[i];
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1].content = currentText;
        return newMsgs;
      });
    }

    setMessage("");
    setLoading(false);
  };


  const isWelcome = messages.length === 0;
  return (
    <div style={{ background: '#18191c', minHeight: "100vh", color: "#fff", fontFamily: "Inter, Arial, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: isWelcome ? "center" : "flex-end" }}>
      {isWelcome ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "60vh" }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16, color: "#b3e3ff", textAlign: "center" }}>Привет, Я Линк, какой у тебя вопрос?</h1>
          <div style={{ width: "100%", maxWidth: 420, background: "#18191c", borderRadius: 18, boxShadow: "0 2px 12px rgba(0,0,0,0.10)", padding: "12px 18px", display: "flex", alignItems: "center" }}>
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              style={{
                flex: 1,
                background: '#18191c',
                color: '#fff',
                border: 'none',
                borderRadius: 16,
                padding: '13px 18px',
                fontSize: 17,
                outline: 'none',
                boxShadow: 'none',
                transition: 'background 0.2s',
              }}
              placeholder="Задайте вопрос..."
              onFocus={e => e.currentTarget.style.background = '#23232a'}
              onBlur={e => e.currentTarget.style.background = '#232329'}
              onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
              disabled={loading}
              autoFocus
            />
            <button
              onClick={handleSend}
              style={{
                background: (!message.trim() || loading) ? "#444457" : "#3a3afc",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                cursor: (!message.trim() || loading) ? "not-allowed" : "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                transition: "background 0.2s, transform 0.1s",
                opacity: (!message.trim() || loading) ? 0.6 : 1,
                transform: (!message.trim() || loading) ? "none" : "scale(1.05)",
              }}
              disabled={!message.trim() || loading}
              title={!message.trim() ? "Введите сообщение" : "Отправить"}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 10L18 3L11 19L9 11L2 10Z" fill="#fff"/>
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ width: "100%", maxWidth: 680, flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", margin: "0 auto", padding: "24px 0 120px 0", overflowY: "auto" }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                background: msg.role === "user" ? "#23232a" : "#2a2a38",
                borderRadius: 8,
                margin: "8px 0",
                padding: "12px 16px",
                maxWidth: "80%",
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                fontSize: 16,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                color: msg.role === "user" ? "#fff" : "#b3e3ff",
                transition: "all 0.2s ease",
              }}>{msg.content}</div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div style={{ width: "100%", maxWidth: 480, position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", background: "#23232a", borderRadius: 18, boxShadow: "0 2px 12px rgba(0,0,0,0.10)", padding: "12px 18px", display: "flex", alignItems: "center" }}>
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              style={{
                flex: 1,
                background: '#232329',
                color: '#fff',
                border: 'none',
                borderRadius: 16,
                padding: '13px 18px',
                fontSize: 17,
                outline: 'none',
                boxShadow: 'none',
                transition: 'background 0.2s',
              }}
              placeholder="Задайте вопрос..."
              onFocus={e => e.currentTarget.style.background = '#23232a'}
              onBlur={e => e.currentTarget.style.background = '#232329'}
              onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
              disabled={loading}
              autoFocus
            />
            <button
              onClick={handleSend}
              style={{
                background: (!message.trim() || loading) ? "#444457" : "#3a3afc",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                cursor: (!message.trim() || loading) ? "not-allowed" : "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                transition: "background 0.2s, transform 0.1s",
                opacity: (!message.trim() || loading) ? 0.6 : 1,
                transform: (!message.trim() || loading) ? "none" : "scale(1.05)",
              }}
              disabled={!message.trim() || loading}
              title={!message.trim() ? "Введите сообщение" : "Отправить"}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 10L18 3L11 19L9 11L2 10Z" fill="#fff"/>
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default IntelligencePage;

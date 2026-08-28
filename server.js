```javascript
const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

const FACEIT_API_KEY = process.env.FACEIT_API_KEY;

const FACEIT_NICKNAME = "lyalek";
const GAME = "cs2";

if (!FACEIT_API_KEY) {
    console.error("FACEIT_API_KEY is not configured!");
    process.exit(1);
}

async function faceitRequest(url) {
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${FACEIT_API_KEY}`,
            "Accept": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error(
            `FACEIT API error: ${response.status} ${response.statusText}`
        );
    }

    return await response.json();
}


// Проверка сервера
app.get("/", (req, res) => {
    res.send("FACEIT Nightbot API is working!");
});


// Основная команда
app.get("/room", async (req, res) => {
    try {

        // 1. Получаем FACEIT player_id по нику lyalek
        const player = await faceitRequest(
            `https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(FACEIT_NICKNAME)}&game=${GAME}`
        );

        if (!player.player_id) {
            return res.send(
                `FACEIT игрок ${FACEIT_NICKNAME} не найден.`
            );
        }

        const playerId = player.player_id;


        // 2. Получаем последние матчи игрока
        const history = await faceitRequest(
            `https://open.faceit.com/data/v4/players/${playerId}/history?game=${GAME}&limit=20`
        );

        if (!history.items || history.items.length === 0) {
            return res.send(
                `${FACEIT_NICKNAME} сейчас не играет на FACEIT.`
            );
        }


        // 3. Проверяем последние матчи
        for (const match of history.items) {

            if (!match.match_id) {
                continue;
            }

            try {

                const matchData = await faceitRequest(
                    `https://open.faceit.com/data/v4/matches/${match.match_id}`
                );


                // Проверяем, находится ли матч в активном состоянии
                if (
                    matchData.status === "READY" ||
                    matchData.status === "ONGOING"
                ) {

                    // FACEIT URL матча
                    const roomUrl =
                        matchData.faceit_url ||
                        `https://www.faceit.com/en/cs2/room/${match.match_id}`;

                    return res.send(
                        `FACEIT Room lyalek: ${roomUrl}`
                    );
                }

            } catch (error) {
                console.log(
                    `Ошибка проверки матча ${match.match_id}:`,
                    error.message
                );
            }
        }


        // Если активного матча нет
        return res.send(
            `${FACEIT_NICKNAME} сейчас не находится в активной FACEIT-руме.`
        );

    } catch (error) {

        console.error(error);

        return res.status(500).send(
            "Не удалось получить информацию о FACEIT."
        );
    }
});


app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started on port ${PORT}`);
});
```

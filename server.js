
const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;
const FACEIT_API_KEY = process.env.FACEIT_API_KEY;
const FACEIT_NICKNAME = process.env.FACEIT_NICKNAME || "Lyalek";
const GAME = process.env.FACEIT_GAME || "cs2";
const HISTORY_LIMIT = 3;
const REQUEST_TIMEOUT_MS = 4_000;
const CACHE_TTL_MS = 15_000;

let cachedRoom;
let roomLookup;

if (!FACEIT_API_KEY) {
    console.error("FACEIT_API_KEY is not configured!");
    process.exit(1);
}

async function faceitRequest(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response;
    try {
        response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${FACEIT_API_KEY}`,
                "Accept": "application/json"
            },
            signal: controller.signal
        });
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error("FACEIT API request timed out");
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }

    if (!response.ok) {
        throw new Error(
            `FACEIT API error: ${response.status} ${response.statusText}`
        );
    }

    return await response.json();
}

async function findActiveRoom() {
    const player = await faceitRequest(
        `https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(FACEIT_NICKNAME)}&game=${GAME}`
    );

    if (!player.player_id) {
        return `FACEIT игрок ${FACEIT_NICKNAME} не найден.`;
    }

    const history = await faceitRequest(
        `https://open.faceit.com/data/v4/players/${player.player_id}/history?game=${GAME}&limit=${HISTORY_LIMIT}`
    );

    for (const match of history.items || []) {
        if (!match.match_id) continue;

        try {
            const matchData = await faceitRequest(
                `https://open.faceit.com/data/v4/matches/${match.match_id}`
            );

            if (["READY", "ONGOING"].includes(matchData.status)) {
                return `FACEIT Room ${FACEIT_NICKNAME}: ${
                    matchData.faceit_url || `https://www.faceit.com/en/cs2/room/${match.match_id}`
                }`;
            }
        } catch (error) {
            console.warn(`Не удалось проверить матч ${match.match_id}: ${error.message}`);
        }
    }

    return `${FACEIT_NICKNAME} сейчас не находится в активной FACEIT-руме.`;
}

// Проверка сервера
app.get("/", (req, res) => {
    res.send("FACEIT Nightbot API is working!");
});


// Основная команда
app.get("/room", async (req, res) => {
    try {
        if (cachedRoom && cachedRoom.expiresAt > Date.now()) {
            return res.send(cachedRoom.message);
        }

        roomLookup ||= findActiveRoom();
        const message = await roomLookup;
        cachedRoom = { message, expiresAt: Date.now() + CACHE_TTL_MS };
        return res.send(message);

    } catch (error) {
        console.error(error);
        return res.status(502).send(
            "Не удалось получить информацию о FACEIT."
        );
    } finally {
        roomLookup = undefined;
    }
});


app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started on port ${PORT}`);
});

# SmartCC — Ye project kya karta hai? (aasan bhasha me)

## Ek line me

SmartCC ek **customer help desk** hai. Customer apni problem likhta hai. Pehle **AI** jawab dene ki koshish karta hai, aur zaroorat ho to **asli support agent** jawab deta hai.

## Kaun kaun use karta hai?

1. **Customer.** Jise madad chahiye, jaise "paisa kat gaya par plan chalu nahi hua".
2. **Support agent.** Company ka banda jo customer ko jawab deta hai.
3. **Admin.** Jo agents aur settings sambhalta hai.
4. **AI bot.** Computer wala helper jo pehle jawab dhoondta hai.

## Kaise kaam karta hai? (step by step)

1. Customer website pe login karke **ticket** banata hai (ticket = apni problem likhna).
2. Likhte waqt hi AI neeche ek **possible jawab** dikha deta hai. Kai baar problem wahi solve ho jaati hai.
3. Ticket submit hote hi wo agents ke system (**Chatwoot**) me pahunch jaata hai.
4. **AI bot** help articles padh ke jawab banata hai, aur khud se poochta hai: "main kitna sure hoon?"
   - **Bahut sure (85% se zyada):** seedha customer ko jawab bhej deta hai.
   - **Thoda sure (60–85%):** jawab ka draft bana ke agent ko de deta hai, agent check karke bhejta hai.
   - **Sure nahi (60% se kam):** seedha agent ko de deta hai.
   - Fraud, legal, payment jhagda ya gussa wala customer ho to hamesha **seedha insaan (agent)** ko jaata hai.
5. Agent apne screen pe ticket dekhta hai, reply karta hai, aur kaam ho jaane pe ticket **band (resolve)** karta hai.
6. Customer ko reply **turant** dikh jaata hai. Page refresh nahi karna padta.
7. Kaam hone ke baad customer **1 se 5 star** de ke batata hai ki service kaisi lagi.

## Time ki guarantee (SLA)

Har ticket ka ek time limit hota hai:

| Kitna zaroori | Pehla jawab kitni der me |
|---|---|
| Critical (bahut zaroori) | 15 minute |
| High | 1 ghanta |
| Medium | 4 ghante |
| Low | 24 ghante |

Time nikalne wala ho to customer ko countdown dikhta hai. Time nikal jaaye to agent ke paas "SLA breached" ka label lag jaata hai.

## Project ke hisse (folders)

| Folder | Kya hai |
|---|---|
| `web/` | Customer wali website (jo customer dekhta hai) |
| `api/` | Website ka dimaag: login, tickets, AI bot, Chatwoot se baat |
| `chatwoot/` | Agents aur admin ka system (Chatwoot ka apna version, SmartCC naam ke saath) |
| `scripts/` | Pehli baar setup karne wale scripts |
| `e2e/` | Poore system ko browser me chala ke check karne wale tests |
| `.ai/artifacts/` | Saare planning documents (requirements, design, plan, review, test report) |
| `FLOW.md` | Kya bana hai, kya baaki hai, uska diagram |
| `README.md` | Chalane ka poora tarika (technical) |

## Kaise chalaye? (short me)

Zaroori: computer pe **Docker** aur **Node.js** hone chahiye.

```sh
node scripts/init-env.mjs                   # settings file banata hai
docker compose build base                   # pehli baar ~10-15 min
docker compose up -d
docker compose run --rm rails bundle exec rails db:chatwoot_prepare
node scripts/chatwoot-setup.mjs
docker compose up -d --force-recreate api
```

Phir kholo:
- **Customer website:** http://localhost:5173 (ya `.env` me jo `WEB_PORT` ho)
- **Agent / Admin:** http://localhost:3000 (ya `.env` me jo `CW_PORT` ho)

AI chalane ke liye `.env` file me `GROQ_API_KEY=` ke aage Groq ki key daalni hogi. Key na ho to har ticket seedha agent ke paas jaayega.

## Abhi kya baaki hai?

`FLOW.md` ka "Kya baaki hai" section dekho. Main baatein:
- asli Groq key lagani hai;
- load test karna hai;
- kuch extra tests likhne hain;
- production me daalna hai.

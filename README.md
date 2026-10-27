# WhatsApp French Bot Tutor

A French conversation partner that lives in WhatsApp. Text it in French and it replies naturally, corrects your mistakes with a short explanation, logs every new word it teaches you, and can set and mark exam-style writing tasks for the TCF, TEF and DELF.

Node.js and Express, with Claude for the tutoring, Twilio's WhatsApp sandbox for messaging, and SQLite for memory. It runs on Railway for about $4 a month.

> **Built for one learner.** I made this to practise for a French proficiency exam. The tutor's prompt is pitched at that level (grammar basics in place, writing practice needed); change `SYSTEM_PROMPT` in `claude.js` to suit yours.

## What it does

- **Conversation practice:** natural replies in simple-to-intermediate French, on varied everyday and opinion topics.
- **Corrections:** each mistake is shown as `❌ what you wrote → ✅ the correct version`, with a one-line explanation in English.
- **Vocabulary logging:** new words come back with an emoji that pictures them (`📚 🐕 le chien = dog`) and are saved to your list.
- **Memory:** the last 20 messages are kept, so the conversation carries on where you left it.
- **Exam mode:** a realistic B1-B2 writing task (a formal letter, an opinion piece or a blog post), then examiner-style feedback: an estimated CEFR level, what worked, and what to improve.

The TCF and TEF are the French equivalents of IELTS (used for immigration), and the DELF and DALF are the diplomas. Exam mode targets the written expression format they share.

## Commands

| Command | What it does |
| --- | --- |
| *(any French text)* | Chat and get corrections |
| `vocab` | Your recent vocabulary |
| `exam` | An exam-style writing task; your next message is marked |
| `new topic` | A fresh conversation topic |
| `reset` | Clear the conversation history |
| `help` | The list of commands |

French versions work too: `mes mots`, `examen`, `recommencer`, `aide`.

## Design choices

- **Structured output, hidden logging.** Claude appends the new vocabulary as a JSON block inside an HTML comment. The server saves it to SQLite and strips it before the reply goes out, so logging never shows in the chat.
- **Private by default in production.** Twilio signs every webhook with your auth token; in production unsigned requests are rejected. An optional `ALLOWED_NUMBERS` allowlist keeps the bot to your own number even if others join the sandbox.
- **Small and cheap.** Three source files, no framework beyond Express, one SQLite file on a Railway volume.

## Structure

```
index.js      Express app: Twilio webhook, signature check, allowlist, commands
claude.js     the tutor prompt, the Claude call, vocabulary extraction
db.js         SQLite: conversation history and vocabulary
```

## Run it

```bash
npm install
cp .env.example .env    # add your Anthropic and Twilio keys
npm run dev             # loads .env and starts on port 3000
ngrok http 3000         # expose it so Twilio can reach the webhook
```

Then in the [Twilio Console](https://console.twilio.com/), open **Messaging > Try it out > Send a WhatsApp message**, join the sandbox from your phone, and set the sandbox webhook to `https://<your-url>/webhook` (method POST).

## Deploy to Railway

1. Create a Railway project from this repo.
2. Add `ANTHROPIC_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `NODE_ENV=production` (which turns on the signature check). Optionally add `ALLOWED_NUMBERS`.
3. Attach a volume, mount it at `/data`, and set `DB_PATH=/data/french_bot.db` so your history and vocabulary survive redeploys.
4. Point the Twilio sandbox webhook at `https://<your-railway-url>/webhook`.

## Built with

Node.js, Express, the Claude API, the Twilio WhatsApp API, better-sqlite3, Railway. Developed with Claude Code as an engineering pair.

const express = require("express");
const twilio = require("twilio");
const { MessagingResponse } = twilio.twiml;
const { chat, getVocabList } = require("./claude");
const db = require("./db");

const app = express();
// Railway sits behind a proxy: needed so signature validation sees the real https URL
app.set("trust proxy", true);
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Reject requests not signed by Twilio (uses TWILIO_AUTH_TOKEN).
// Disabled outside production so local curl/ngrok testing still works.
const validateTwilioSignature = twilio.webhook({
  validate: process.env.NODE_ENV === "production",
});

// Comma-separated phone numbers allowed to use the bot, e.g. "+15555550100,+15555550101".
// Spaces and formatting are ignored. If unset, the bot is open to anyone in the sandbox.
const allowedNumbers = (process.env.ALLOWED_NUMBERS || "")
  .split(",")
  .map((n) => n.replace(/[^+\d]/g, ""))
  .filter(Boolean);

function isAllowed(userPhone) {
  if (allowedNumbers.length === 0) return true;
  const phone = userPhone.replace(/^whatsapp:/i, "").replace(/[^+\d]/g, "");
  return allowedNumbers.includes(phone);
}

// Health check for Railway
app.get("/", (_req, res) => {
  res.send("French Bot is running! 🇫🇷");
});

// Twilio WhatsApp webhook
app.post("/webhook", validateTwilioSignature, async (req, res) => {
  const userMessage = req.body?.Body?.trim();
  const userPhone = req.body?.From;

  if (!userMessage || !userPhone) {
    return res.status(400).send("Missing message or phone number");
  }

  if (!isAllowed(userPhone)) {
    const twiml = new MessagingResponse();
    twiml.message(
      "Désolé! This is a private French practice bot. 🇫🇷🔒"
    );
    return res.type("text/xml").send(twiml.toString());
  }

  try {
    let reply;

    const command = userMessage.toLowerCase();

    if (command === "vocab" || command === "my words" || command === "mes mots") {
      reply = getVocabList(userPhone);
    } else if (command === "reset" || command === "recommencer") {
      db.clearConversation(userPhone);
      reply =
        "Conversation reset! 🔄\n\nSalut! On recommence. De quoi veux-tu parler? 😊";
    } else if (command === "exam" || command === "examen") {
      reply = await chat(
        userPhone,
        "Donne-moi un exercice d'expression écrite type examen (TEF/TCF/DELF) adapté à mon niveau. Je vais y répondre dans mon prochain message, et tu m'évalueras comme un examinateur."
      );
    } else if (command === "help" || command === "aide") {
      reply = [
        "*French Bot Commands* 🇫🇷\n",
        "Just text in French to practice!",
        "",
        "*Commands:*",
        "• *vocab*: see your learned words",
        "• *exam*: get an exam-style writing task (TEF/TCF/DELF)",
        "• *reset*: start a new conversation",
        "• *new topic*: get a fresh topic",
        "• *help*: show this message",
        "",
        "_Tip: Don't worry about mistakes, that's how you learn!_",
      ].join("\n");
    } else {
      reply = await chat(userPhone, userMessage);
    }

    const twiml = new MessagingResponse();
    twiml.message(reply);

    res.type("text/xml").send(twiml.toString());
  } catch (error) {
    console.error("Error processing message:", error);

    const twiml = new MessagingResponse();
    twiml.message(
      "Désolé, something went wrong! Try again in a moment. 🙏"
    );
    res.type("text/xml").send(twiml.toString());
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`French Bot running on port ${PORT}`);
});

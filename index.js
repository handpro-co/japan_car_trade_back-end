//-------------------------hafel-------------------------//
//-------------------------------------------------------//
import express from "express";
import assert from "assert";
import OpenAI from "openai";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config({ path: "./config/.env" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  project: process.env.PROJECT_ID,
  organization: process.env.ORGANIZATION,
});

let assistant;
const assID = process.env.ASSISTANT_ID;

const init = async () => {
  assert(!assistant, "OpenAI init only once.");
  assistant = await openai.beta.assistants.retrieve(assID);
};

const thread = () => {
  return openai.beta.threads.create();
};

const ask = async (question, res) => {
  const newThread = await thread();

  await openai.beta.threads.messages.create(newThread.id, {
    role: "user",
    content: question,
  });

  let fullResponse = "";

  try {
    await openai.beta.threads.runs
      .stream(newThread.id, { assistant_id: assistant.id })
      .on("error", (e) => {
        const errorMessage = e.error
          ? e.error.message
          : "An unknown error occurred.";
        console.error("Error:", errorMessage);
        res.status(500).json({ message: errorMessage });
      })
      .on("textDelta", (_, { value }) => {
        fullResponse = value;
      })
      .on("textDone", () => {
        res.json({ message: fullResponse });
      });
  } catch (error) {
    console.error("Failed to stream response:", error);
    res.status(500).json({ message: "Failed to stream response." });
  }
};

const app = express();
app.use(express.json());
app.use(cors());

init().then(() => {});

app.post("/openAI", async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ message: "Question is required." });
  }

  await ask(question, res);
});

const PORT = process.env.PORT || 8090;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

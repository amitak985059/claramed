import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent("hello");
    console.log("gemini-1.5-flash-latest:", result.response.text());
  } catch (e) {
    console.error("gemini error:", e.message);
  }
}
run();

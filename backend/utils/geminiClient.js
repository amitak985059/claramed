import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Singleton client — instantiated once at module load ──────────────────────
// Never create `new GoogleGenerativeAI(...)` inside a request handler.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Returns the shared generative model.
 * @param {string} modelName - Gemini model identifier
 */
export const getGeminiModel = (modelName = "gemini-2.5-flash") =>
    genAI.getGenerativeModel({ model: modelName });

/**
 * Calls `model.generateContent(parts)` with up to `maxRetries` attempts,
 * backing off exponentially on transient errors (rate-limit 429, overload 503).
 *
 * @param {import("@google/generative-ai").GenerativeModel} model
 * @param {Array} parts - content parts passed to generateContent
 * @param {number} maxRetries - default 3
 * @returns {Promise<string>} - the response text
 */
export const generateWithRetry = async (model, parts, maxRetries = 3) => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await model.generateContent(parts);
            return result.response.text();
        } catch (err) {
            lastError = err;

            // Determine if this is a retryable transient error
            const status = err?.status ?? err?.httpError?.status;
            const isTransient = status === 429 || status === 503;

            if (!isTransient || attempt === maxRetries) {
                // Non-retryable or final attempt — fail immediately
                throw err;
            }

            // Exponential backoff: 1s, 2s, 4s …
            const waitMs = 1000 * Math.pow(2, attempt - 1);
            console.warn(
                `[Gemini] Transient error (status ${status}), retrying in ${waitMs}ms (attempt ${attempt}/${maxRetries})`
            );
            await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
    }

    throw lastError;
};

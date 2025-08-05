import { GoogleGenerativeAI } from "@google/generative-ai";

const DEMO_KEY = "AIzaSyDepiRCs9vSA1T9MYHmtFRzhSvgborZKuc";
const API_KEY = process.env.GEMINI_API_KEY || DEMO_KEY;

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function POST(request: Request) {
  try {
    const { message, history = [] } = await request.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Build conversation history
    const chat = model.startChat({
      history: history.map((msg: any) => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      })),
    });

    // Create stream
    const result = await chat.sendMessageStream(message);
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              controller.enqueue(`data: ${JSON.stringify({ delta: chunkText })}\n\n`);
            }
          }
          controller.enqueue(`data: ${JSON.stringify({ done: true })}\n\n`);
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(`data: ${JSON.stringify({ error: "Streaming failed" })}\n\n`);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    
    if (error.message?.includes("429")) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
} 
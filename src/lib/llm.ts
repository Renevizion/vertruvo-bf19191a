import { CreateMLCEngine, MLCEngineInterface } from "@mlc-ai/web-llm";

let engine: MLCEngineInterface | null = null;

export interface ProgressCallback {
  (progress: number, status: string): void;
}

export const initializeModel = async (onProgress: ProgressCallback): Promise<void> => {
  if (engine) return;

  try {
    // Using Qwen2-0.5B - only ~350MB, perfect for older devices
    const selectedModel = "Qwen2-0.5B-Instruct-q4f16_1-MLC";
    
    engine = await CreateMLCEngine(selectedModel, {
      initProgressCallback: (report) => {
        const progress = report.progress * 100;
        onProgress(progress, report.text);
      },
    });
    
    onProgress(100, "Model ready!");
  } catch (error) {
    console.error("Failed to initialize model:", error);
    throw error;
  }
};

export const generateResponse = async (
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  onChunk?: (text: string) => void
): Promise<string> => {
  if (!engine) {
    throw new Error("Model not initialized");
  }

  try {
    let fullResponse = "";
    
    const completion = await engine.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 512,
      stream: true,
    });

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullResponse += content;
        onChunk?.(fullResponse);
      }
    }

    return fullResponse;
  } catch (error) {
    console.error("Error generating response:", error);
    throw error;
  }
};

export const isModelReady = (): boolean => {
  return engine !== null;
};

import { stepCountIs, streamText } from "ai";
import { google } from "@ai-sdk/google";
import { SYSTEM_PROMPT } from "./prompts";
import { getFileChangesInDirectoryTool, generateCommitMessageTool, writeReviewToMarkdownTool } from "./tools";

const codeReviewAgent = async (prompt: string) => {
  // Try different models in order of preference
  const models = [
    google("models/gemini-2.5-flash"),
    google("models/gemini-1.5-flash"),
    google("models/gemini-1.5-pro")
  ];

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      console.log(`Trying model: ${model.modelId}...`);
      
      const result = streamText({
        model,
        prompt,
        system: SYSTEM_PROMPT,
        tools: {
          getFileChangesInDirectoryTool: getFileChangesInDirectoryTool,
          generateCommitMessageTool: generateCommitMessageTool,
          writeReviewToMarkdownTool: writeReviewToMarkdownTool,
        },
        stopWhen: stepCountIs(10),
        maxRetries: 2, // Reduce retries per model
      });

      for await (const chunk of result.textStream) {
        process.stdout.write(chunk);
      }
      
      console.log("\n✅ Code review completed successfully!");
      return; // Success, exit the function
      
    } catch (error: any) {
      lastError = error;
      console.log(`❌ Model ${model.modelId} failed: ${error.message}`);
      
      // If it's a 503 error (overloaded), try the next model
      if (error.statusCode === 503 || error.message?.includes('overloaded')) {
        console.log("🔄 Model is overloaded, trying next model...");
        continue;
      }
      
      // If it's a different error, wait a bit before trying the next model
      console.log("⏳ Waiting 2 seconds before trying next model...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // If all models failed
  console.error("\n❌ All models failed. Last error:");
  console.error(lastError?.message || "Unknown error");
  console.log("\n💡 Suggestions:");
  console.log("1. Try again in a few minutes when the API load is lower");
  console.log("2. Check your Google AI API key and quota");
  console.log("3. Consider using a different AI provider");
  
  process.exit(1);
};

// Specify which directory the code review agent should review changes in your prompt
await codeReviewAgent(
  "Review the code changes in the current directory, generate a commit message, and save the review to a markdown file called 'code-review-report.md'",
);
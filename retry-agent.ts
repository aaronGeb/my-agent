import { stepCountIs, streamText } from "ai";
import { google } from "@ai-sdk/google";
import { SYSTEM_PROMPT } from "./prompts";
import { getFileChangesInDirectoryTool, generateCommitMessageTool, writeReviewToMarkdownTool } from "./tools";

const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 5, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      console.log(`Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`Waiting ${Math.round(delay)}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

const codeReviewAgent = async (prompt: string) => {
  const models = [
    google("models/gemini-1.5-flash"), // Start with the more stable model
    google("models/gemini-2.5-flash"),
    google("models/gemini-1.5-pro")
  ];

  for (const model of models) {
    try {
      console.log(`🔄 Trying model: ${model.modelId}...`);
      
      await retryWithBackoff(async () => {
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
          maxRetries: 1, // Let our custom retry logic handle it
        });

        for await (const chunk of result.textStream) {
          process.stdout.write(chunk);
        }
      });
      
      console.log("\nCode review completed successfully!");
      return;
      
    } catch (error: any) {
      console.log(`Model ${model.modelId} failed after all retries: ${error.message}`);
      
      // If it's a 503 error, try the next model immediately
      if (error.statusCode === 503 || error.message?.includes('overloaded')) {
        console.log("Model is overloaded, trying next model...");
        continue;
      }
      
      // For other errors, wait a bit before trying the next model
      console.log("Waiting 3 seconds before trying next model...");
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.error("\n All models failed. The Google AI API appears to be experiencing issues.");
  console.log("\n💡 Try again in a few minutes or check the Google AI status page.");
  process.exit(1);
};

// Run the agent
await codeReviewAgent(
  "Review the code changes in the current directory, generate a commit message, and save the review to a markdown file called 'code-review-report.md'",
);

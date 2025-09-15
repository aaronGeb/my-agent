import { getFileChangesInDirectoryTool, generateCommitMessageTool, writeReviewToMarkdownTool } from "./tools";

// Test the tools directly without AI
async function testTools() {
  console.log("Testing Code Review Agent Tools...\n");

  try {
    // Test 1: Get file changes
    console.log("1️Testing getFileChangesInDirectoryTool...");
    const changes = await getFileChangesInDirectoryTool.execute({ rootDir: "." });
    console.log(`Found ${changes.length} changed files`);
    changes.forEach(change => {
      console.log(`  - ${change.file}`);
    });
    console.log();

    // Test 2: Generate commit message
    console.log("2️ Testing generateCommitMessageTool...");
    const commitMessage = await generateCommitMessageTool.execute({ 
      rootDir: ".", 
      style: "conventional" 
    });
    console.log("Generated commit message:");
    console.log(`  ${commitMessage.message}`);
    console.log(`  Type: ${commitMessage.type}, Files: ${commitMessage.filesChanged}`);
    console.log();

    // Test 3: Write review to markdown
    console.log("3️Testing writeReviewToMarkdownTool...");
    const sampleReview = `# Code Review Summary

## Changes Made
- Extended Code Review Agent with new tools
- Added commit message generation
- Added markdown review output

## Files Modified
${changes.map(c => `- \`${c.file}\``).join('\n')}

## Recommendations
- All tools are working correctly
- Consider adding more validation
- Good job on the implementation!

## Commit Message
\`${commitMessage.message}\``;

    const markdownResult = await writeReviewToMarkdownTool.execute({
      reviewContent: sampleReview,
      outputPath: "./test-review.md",
      includeMetadata: true
    });
    
    console.log(`Markdown file created: ${markdownResult.outputPath}`);
    console.log(`   Size: ${markdownResult.fileSize} bytes`);
    console.log();

    console.log("All tools are working correctly!");

  } catch (error) {
    console.error("Error testing tools:", error);
  }
}

testTools();

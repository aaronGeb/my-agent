# Code Review Agent

An intelligent AI-powered code review agent that analyzes git changes, generates commit messages, and creates detailed review reports. Built with TypeScript, Bun, and Google's Gemini AI models.

## Features

### 🔍 **Code Analysis**
- Analyzes git changes in any directory
- Detects added, modified, and deleted files
- Provides detailed diff information
- Excludes build artifacts and lock files

### 📝 **Commit Message Generation**
- **Conventional Commits**: Follows standard format (feat:, fix:, refactor:, etc.)
- **Simple Format**: Basic summary of changes
- **Detailed Format**: Comprehensive messages with statistics
- **Smart Detection**: Automatically identifies change types and scope

### 📄 **Markdown Review Reports**
- Saves reviews to markdown files
- Includes timestamps and metadata
- Professional formatting
- Customizable output paths

### 🛡️ **Resilient AI Integration**
- Multi-model fallback system
- Automatic retry with exponential backoff
- Error handling for API overloads
- Graceful degradation

## Installation

```bash
bun install
```

## Usage

### Basic Code Review
```bash
bun run start
```

### Enhanced Retry Agent (Recommended)
```bash
bun run retry
```

### Test Tools Without AI
```bash
bun run test-tools
```

### Development Mode
```bash
bun run dev
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run start` | Run the main agent with fallback models |
| `bun run retry` | Enhanced retry agent with exponential backoff |
| `bun run test-tools` | Test tools without AI (useful when API is down) |
| `bun run dev` | Development mode with file watching |

## Configuration

### Environment Variables
Set your Google AI API key:
```bash
export GOOGLE_GENERATIVE_AI_API_KEY="your-api-key-here"
```

### Customizing the Agent
Edit `prompts.ts` to modify the review criteria and style.

## Tools Available

### 1. `getFileChangesInDirectoryTool`
Analyzes git changes in a specified directory.

**Parameters:**
- `rootDir` (string): Directory to analyze

**Returns:**
- Array of file changes with diffs

### 2. `generateCommitMessageTool`
Generates appropriate commit messages based on changes.

**Parameters:**
- `rootDir` (string): Directory to analyze
- `style` (optional): "conventional" | "simple" | "detailed"

**Returns:**
- Commit message with type, scope, and statistics

### 3. `writeReviewToMarkdownTool`
Writes code review content to a markdown file.

**Parameters:**
- `reviewContent` (string): Review content to write
- `outputPath` (string): Path for the markdown file
- `includeMetadata` (boolean, optional): Include timestamps and metadata

**Returns:**
- Success status and file information

## Example Usage

```typescript
// Review changes and generate commit message
await codeReviewAgent(
  "Review the code changes in the current directory, generate a commit message, and save the review to a markdown file called 'code-review-report.md'"
);
```

## Error Handling

The agent includes robust error handling:

- **API Overload**: Automatically tries different models
- **Network Issues**: Exponential backoff retry logic
- **Model Failures**: Graceful fallback to alternative models
- **Tool Errors**: Clear error messages and suggestions

## Dependencies

- **@ai-sdk/google**: Google AI SDK integration
- **ai**: Vercel AI SDK
- **simple-git**: Git operations
- **zod**: Schema validation
- **bun**: Runtime and package manager

## Troubleshooting

### API Overload Issues
If you encounter "model is overloaded" errors:

1. Try the retry agent: `bun run retry`
2. Test tools directly: `bun run test-tools`
3. Wait a few minutes and try again
4. Check Google AI status page

### Common Issues
- **Missing API Key**: Set `GOOGLE_GENERATIVE_AI_API_KEY` environment variable
- **Git Repository**: Ensure you're in a git repository with changes
- **Permissions**: Check file write permissions for markdown output

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `bun run test-tools`
5. Submit a pull request

## License

This project is private and proprietary.

---

Built with ❤️ using [Bun](https://bun.com) - the fast all-in-one JavaScript runtime.

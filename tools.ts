import { tool } from "ai";
import { simpleGit } from "simple-git";
import { z } from "zod";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const excludeFiles = ["dist", "bun.lock"];

const fileChange = z.object({
  rootDir: z.string().min(1).describe("The root directory"),
});

type FileChange = z.infer<typeof fileChange>;

async function getFileChangesInDirectory({ rootDir }: FileChange) {
  const git = simpleGit(rootDir);
  const summary = await git.diffSummary();
  const diffs: { file: string; diff: string }[] = [];

  for (const file of summary.files) {
    if (excludeFiles.includes(file.file)) continue;
    const diff = await git.diff(["--", file.file]);
    diffs.push({ file: file.file, diff });
  }

  return diffs;
}

export const getFileChangesInDirectoryTool = tool({
  description: "Gets the code changes made in given directory",
  inputSchema: fileChange,
  execute: getFileChangesInDirectory,
});

// Commit message generation tool
const commitMessageInput = z.object({
  rootDir: z.string().min(1).describe("The root directory to analyze for commit message"),
  style: z.enum(["conventional", "simple", "detailed"]).optional().describe("The style of commit message to generate").default("conventional"),
});

type CommitMessageInput = z.infer<typeof commitMessageInput>;

async function generateCommitMessage({ rootDir, style }: CommitMessageInput) {
  const git = simpleGit(rootDir);
  const summary = await git.diffSummary();
  
  // Get staged files for more accurate commit message
  const stagedFiles = await git.diff(["--cached", "--name-only"]);
  const unstagedFiles = await git.diff(["--name-only"]);
  
  const changedFiles = stagedFiles ? stagedFiles.split('\n').filter(Boolean) : 
                     unstagedFiles ? unstagedFiles.split('\n').filter(Boolean) : 
                     summary.files.map(f => f.file);
  
  const fileTypes = {
    added: changedFiles.filter(f => {
      const file = summary.files.find(sf => sf.file === f);
      return file && 'insertions' in file && 'deletions' in file && file.insertions > 0 && file.deletions === 0;
    }),
    modified: changedFiles.filter(f => {
      const file = summary.files.find(sf => sf.file === f);
      return file && 'insertions' in file && 'deletions' in file && file.insertions > 0 && file.deletions > 0;
    }),
    deleted: changedFiles.filter(f => {
      const file = summary.files.find(sf => sf.file === f);
      return file && 'insertions' in file && 'deletions' in file && file.insertions === 0 && file.deletions > 0;
    })
  };

  // Analyze file types to determine the nature of changes
  const hasNewFeatures = fileTypes.added.some(f => !f.includes('test') && !f.includes('spec'));
  const hasBugFixes = fileTypes.modified.some(f => f.includes('fix') || f.includes('bug'));
  const hasTests = fileTypes.added.some(f => f.includes('test') || f.includes('spec'));
  const hasDocs = fileTypes.added.some(f => f.includes('readme') || f.includes('doc') || f.endsWith('.md'));
  const hasRefactoring = fileTypes.modified.every(f => !f.includes('test') && !f.includes('spec'));

  let commitType = "feat";
  if (hasBugFixes) commitType = "fix";
  else if (hasRefactoring && !hasNewFeatures) commitType = "refactor";
  else if (hasTests) commitType = "test";
  else if (hasDocs) commitType = "docs";
  else if (fileTypes.deleted.length > 0) commitType = "remove";

  const scope = changedFiles.length === 1 ? changedFiles[0]?.split('/').pop()?.split('.')[0] : undefined;
  
  let message = "";
  switch (style) {
    case "conventional":
      message = `${commitType}${scope ? `(${scope})` : ''}: ${getConventionalMessage(commitType, fileTypes, changedFiles)}`;
      break;
    case "simple":
      message = getSimpleMessage(fileTypes, changedFiles);
      break;
    case "detailed":
      message = getDetailedMessage(commitType, fileTypes, changedFiles, summary);
      break;
  }

  return {
    message,
    type: commitType,
    scope,
    filesChanged: changedFiles.length,
    fileTypes,
    style
  };
}

function getConventionalMessage(type: string, fileTypes: any, files: string[]): string {
  const fileCount = files.length;
  const mainFiles = files.filter(f => !f.includes('test') && !f.includes('spec'));
  
  if (type === "feat") {
    return `add ${mainFiles.length > 1 ? 'new features' : mainFiles[0]?.split('/').pop() || 'functionality'}`;
  } else if (type === "fix") {
    return `resolve issues in ${mainFiles.length > 1 ? 'multiple files' : mainFiles[0]?.split('/').pop() || 'code'}`;
  } else if (type === "refactor") {
    return `improve ${mainFiles.length > 1 ? 'code structure' : mainFiles[0]?.split('/').pop() || 'implementation'}`;
  } else if (type === "test") {
    return `add test coverage for ${mainFiles.length > 0 ? mainFiles[0]?.split('/').pop() : 'code'}`;
  } else if (type === "docs") {
    return `update documentation`;
  } else if (type === "remove") {
    return `remove ${mainFiles.length > 1 ? 'unused code' : mainFiles[0]?.split('/').pop() || 'files'}`;
  }
  return `update ${fileCount > 1 ? 'multiple files' : files[0]?.split('/').pop() || 'code'}`;
}

function getSimpleMessage(fileTypes: any, files: string[]): string {
  const actions = [];
  if (fileTypes.added.length > 0) actions.push(`Added ${fileTypes.added.length} file(s)`);
  if (fileTypes.modified.length > 0) actions.push(`Modified ${fileTypes.modified.length} file(s)`);
  if (fileTypes.deleted.length > 0) actions.push(`Removed ${fileTypes.deleted.length} file(s)`);
  
  return actions.join(', ');
}

function getDetailedMessage(type: string, fileTypes: any, files: string[], summary: any): string {
  const totalChanges = summary.files.reduce((acc: number, file: any) => acc + file.insertions + file.deletions, 0);
  const insertions = summary.files.reduce((acc: number, file: any) => acc + file.insertions, 0);
  const deletions = summary.files.reduce((acc: number, file: any) => acc + file.deletions, 0);
  
  let message = `${type}: `;
  message += `Updated ${files.length} file(s) with ${insertions} insertions and ${deletions} deletions`;
  
  if (fileTypes.added.length > 0) {
    message += `\n- Added: ${fileTypes.added.join(', ')}`;
  }
  if (fileTypes.modified.length > 0) {
    message += `\n- Modified: ${fileTypes.modified.join(', ')}`;
  }
  if (fileTypes.deleted.length > 0) {
    message += `\n- Removed: ${fileTypes.deleted.join(', ')}`;
  }
  
  return message;
}

export const generateCommitMessageTool = tool({
  description: "Generates an appropriate commit message based on the changes in the given directory",
  inputSchema: commitMessageInput,
  execute: generateCommitMessage,
});

// Markdown review writing tool
const markdownReviewInput = z.object({
  reviewContent: z.string().min(1).describe("The code review content to write to markdown"),
  outputPath: z.string().min(1).describe("The path where the markdown file should be saved"),
  includeMetadata: z.boolean().optional().describe("Whether to include metadata like timestamp and file info").default(true),
});

type MarkdownReviewInput = z.infer<typeof markdownReviewInput>;

async function writeReviewToMarkdown({ reviewContent, outputPath, includeMetadata }: MarkdownReviewInput) {
  const timestamp = new Date().toISOString();
  const date = new Date().toLocaleDateString();
  const time = new Date().toLocaleTimeString();
  
  let markdownContent = "";
  
  if (includeMetadata) {
    markdownContent += `# Code Review Report\n\n`;
    markdownContent += `**Generated on:** ${date} at ${time}\n`;
    markdownContent += `**Timestamp:** ${timestamp}\n\n`;
    markdownContent += `---\n\n`;
  }
  
  markdownContent += reviewContent;
  
  // Ensure the directory exists
  const dir = outputPath.substring(0, outputPath.lastIndexOf('/'));
  if (dir) {
    mkdirSync(dir, { recursive: true });
  }
  
  // Write the file
  writeFileSync(outputPath, markdownContent, 'utf8');
  
  return {
    success: true,
    outputPath,
    fileSize: markdownContent.length,
    timestamp,
    metadata: includeMetadata
  };
}

export const writeReviewToMarkdownTool = tool({
  description: "Writes the code review content to a markdown file with optional metadata",
  inputSchema: markdownReviewInput,
  execute: writeReviewToMarkdown,
});
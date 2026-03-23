import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Find the browser-use dist/agent directory
const agentDir = path.join(projectRoot, 'node_modules', 'browser-use', 'dist', 'agent');

if (!fs.existsSync(agentDir)) {
  console.warn(`Warning: Directory not found: ${agentDir} — skipping prompt fix (run "pnpm run fix-prompts" manually after install)`);
  process.exit(0);
}

// Find the prompts directory in the project root
const promptsSourceDir = path.join(projectRoot, 'prompts');

const promptFiles = [
  'system_prompt.md',
  'system_prompt_no_thinking.md',
  'system_prompt_browser_use.md',
  'system_prompt_browser_use_no_thinking.md',
  'system_prompt_flash.md',
  'system_prompt_flash_anthropic.md',
  'system_prompt_anthropic_flash.md',
  'system_prompt_browser_use_flash.md'
];

console.log(`Writing prompts from ${promptsSourceDir} to ${agentDir}...`);

for (const filename of promptFiles) {
  const sourcePath = path.join(promptsSourceDir, filename);
  const destPath = path.join(agentDir, filename);
  
  if (!fs.existsSync(sourcePath)) {
    console.warn(`  ! Source file missing: ${filename}`);
    continue;
  }

  try {
    const content = fs.readFileSync(sourcePath, 'utf-8');
    fs.writeFileSync(destPath, content, 'utf-8');
    console.log(`  ✓ Written ${filename}`);
  } catch (err) {
    console.error(`  ✗ Failed to process ${filename}: ${err.message}`);
  }
}

console.log('Done fixing browser-use prompts.');

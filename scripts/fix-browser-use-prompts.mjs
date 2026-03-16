import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Find the browser-use dist/agent directory
const agentDir = path.join(projectRoot, 'node_modules', 'browser-use', 'dist', 'agent');

if (!fs.existsSync(agentDir)) {
  console.error(`Error: Directory not found: ${agentDir}`);
  process.exit(1);
}

const prompts = {
  'system_prompt.md': `You are an expert browser automation agent. Your goal is to complete the user's task by interacting with a website.

<instructions>
1. Analyze the current browser state (URL, page title, and interactive elements).
2. Choose a single action or a sequence of actions (max {max_actions}) to progress toward the task goal.
3. If you encounter a cookie banner, login wall, or pop-up, handle it first.
4. If you are unsure, explore the page to find relevant information.
5. Use "read_file" or "extract" if you need to consume large amounts of data.
6. When the task is complete, use the "done" action with a summary of accomplishment.
</instructions>

<format>
Always respond with a valid JSON object containing your thought process and action(s).
</format>`,

  'system_prompt_no_thinking.md': `You are an expert browser automation agent. Directly output the actions needed to complete the user's task.
Max actions per step: {max_actions}.
If task is done, use "done".`,

  'system_prompt_browser_use.md': `You are using the browser-use optimized model. 
Focus on efficient element selection and quick task completion.
Max actions: {max_actions}.`,

  'system_prompt_browser_use_no_thinking.md': `You are using the browser-use optimized model without internal monologue.
Directly output actions.
Max actions: {max_actions}.`,

  'system_prompt_flash.md': `Generic Flash model system prompt for browser automation.
Max actions: {max_actions}.`,

  'system_prompt_flash_anthropic.md': `Anthropic Flash optimized system prompt.
Max actions: {max_actions}.`,

  'system_prompt_anthropic_flash.md': `Anthropic 4.5 Flash optimized system prompt.
Max actions: {max_actions}.`,

  'system_prompt_browser_use_flash.md': `Browser-use Flash model optimized system prompt.
Max actions: {max_actions}.`
};

console.log(`Writing prompts to ${agentDir}...`);

for (const [filename, content] of Object.entries(prompts)) {
  const filePath = path.join(agentDir, filename);
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✓ Written ${filename}`);
  } catch (err) {
    console.error(`  ✗ Failed to write ${filename}: ${err.message}`);
  }
}

console.log('Done fixing browser-use prompts.');

import { aiComplete } from './ai-utils';

/**
 * Convert natural language description to a cron expression using AI.
 * @param description Natural language description like "Every day at 3am"
 * @returns Standard 5-field cron expression
 */
export async function convertNaturalLanguageToCron(description: string): Promise<string> {
  const prompt = `Convert the following natural language description to a standard 5-field cron expression.
Examples:
- "Every day at 3am" -> "0 3 * * *"
- "Every Monday at 5pm" -> "0 17 * * 1"
- "Every 30 minutes" -> "*/30 * * * *"
- "Every weekday at 9:00" -> "0 9 * * 1-5"
- "Every 1st of the month at midnight" -> "0 0 1 * *"

Only return the cron expression string, no other text or explanation. 
If the input is completely invalid and cannot be converted, return exactly: Error: Invalid description.

Natural Language Description: ${description}`;

  try {
    const response = await aiComplete(prompt);
    const result = response.trim();
    
    if (result.startsWith('Error:')) {
      throw new Error(result.slice(6).trim());
    }
    
    // 4. Try to parse anything that looks like a cron from the response
    // Cron should have at least 5 fields (minutes, hours, day, month, day of week)
    const cronRegex = /([*0-9,/\-L#A-Z]+(?:\s+[*0-9,/\-L#A-Z]+){4})/;
    const match = result.trim().match(cronRegex);
    
    if (!match) {
      throw new Error(`Invalid cron expression returned by AI: ${result}`);
    }

    return match[1].trim();
  } catch (err) {
    console.error('Failed to convert natural language to cron:', err);
    throw err;
  }
}

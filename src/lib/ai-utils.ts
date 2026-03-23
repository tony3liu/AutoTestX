import { useGatewayStore } from '@/stores/gateway';
import { subscribeHostEvent } from './host-events';

export interface AICompleteOptions {
  agentId?: string;
  systemPrompt?: string;
  temperature?: number;
}

/**
 * Perform a single-turn completion using the OpenClaw Gateway.
 * Creates a temporary session and waits for the final response.
 */
export async function aiComplete(
  prompt: string,
  options: AICompleteOptions = {}
): Promise<string> {
  const { agentId = 'main' } = options;
  // OpenClaw session keys for agents usually follow 'agent:agentId:suffix'
  const sessionKey = `agent:${agentId}:utility-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const idempotencyKey = crypto.randomUUID();
  
  return new Promise<string>((resolve, reject) => {
    let resultText = '';
    let isFinished = false;

    // 2. Setup event listener for this session
    // We use subscribeHostEvent because useGatewayStore.rpc goes through the main process IPC.
    const cleanup = subscribeHostEvent('gateway:chat-message', (payload: any) => {
      const msg = payload.message || payload;
      const eventSessionKey = payload.sessionKey || msg.sessionKey;
      
      if (eventSessionKey !== sessionKey) return;
      
      const eventState = payload.state || msg.state || payload.phase;
      
      if (eventState === 'delta') {
        const delta = msg.content || msg.text || '';
        if (typeof delta === 'string') {
          resultText += delta;
        } else if (Array.isArray(delta)) {
          for (const block of delta) {
            if (block.type === 'text') {
              resultText += (block.text || '');
            }
          }
        } else if (typeof delta === 'object' && delta !== null) {
          resultText += (delta.text || delta.content || '');
        }
      } else if (eventState === 'final' || msg.stopReason || eventState === 'completed') {
        // Delay a bit to ensure history is flushed
        setTimeout(async () => {
          if (isFinished) return;
          
          try {
            // Check history as authoritative source
            const snapshot = await useGatewayStore.getState().rpc<any>('chat.history', { sessionKey });
            const history = snapshot?.messages || snapshot || [];
            const assistantMsg = [...(Array.isArray(history) ? history : [])].reverse().find((m: any) => m.role === 'assistant');
            
            if (assistantMsg) {
              let content = '';
              if (typeof assistantMsg.content === 'string') {
                content = assistantMsg.content;
              } else if (Array.isArray(assistantMsg.content)) {
                content = assistantMsg.content
                  .filter((b: any) => b.type === 'text')
                  .map((b: any) => b.text || '')
                  .join('');
              }
              
              if (content.trim()) {
                isFinished = true;
                cleanup();
                resolve(content.trim());
                return;
              }
            }
          } catch (e) {
            console.error('Failed to fetch chat history:', e);
          }

          // Fallback to what we collected
          if (!isFinished) {
            isFinished = true;
            cleanup();
            resolve(resultText.trim());
          }
        }, 500);
      }
    });

    // 3. Set a timeout
    const timeout = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        cleanup();
        reject(new Error('AI Completion timeout (30s)'));
      }
    }, 30000);

    // 4. Send the request
    useGatewayStore.getState().rpc('chat.send', {
      sessionKey,
      message: prompt,
      deliver: false,
      idempotencyKey,
    }).catch(err => {
      if (!isFinished) {
        isFinished = true;
        cleanup();
        clearTimeout(timeout);
        reject(err);
      }
    });
  });
}

import { CerebrasConfig, Message } from '@/types/chat';

export class CerebrasClient {
  private apiKey: string;
  private baseUrl = 'https://api.cerebras.ai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendMessage(
    messages: Message[],
    config: Partial<CerebrasConfig> = {}
  ): Promise<string> {
    const {
      model = 'llama3.1-8b',
      temperature = 0.7,
      maxTokens = 4096,
      topP = 0.9
    } = config;

    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: this.formatMessageContent(msg)
    }));

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
          stream: false
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'Нет ответа от ИИ';
    } catch (error) {
      console.error('Cerebras API Error:', error);
      throw error;
    }
  }

  async sendMessageStream(
    messages: Message[],
    config: Partial<CerebrasConfig> = {},
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const {
      model = 'llama3.1-8b',
      temperature = 0.7,
      maxTokens = 4096,
      topP = 0.9
    } = config;

    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: this.formatMessageContent(msg)
    }));

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
          stream: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Cerebras Stream API Error:', error);
      throw error;
    }
  }

  private formatMessageContent(message: Message): string {
    let content = message.content;
    
    if (message.files && message.files.length > 0) {
      const fileContents = message.files.map(file => {
        return `\n\n--- Файл: ${file.name} (${file.type}) ---\n${file.content}\n--- Конец файла ---`;
      }).join('');
      
      content += fileContents;
    }

    return content;
  }

  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      return data.data?.map((model: any) => model.id) || [
        'llama3.1-8b',
        'llama3.1-70b'
      ];
    } catch (error) {
      console.error('Error fetching models:', error);
      return ['llama3.1-8b', 'llama3.1-70b'];
    }
  }
}
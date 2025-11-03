import { CerebrasConfig, Message, MessageMetadata } from '@/types/chat';

export class CerebrasClient {
  private apiKey: string;
  private baseUrl = 'https://api.cerebras.ai/v1';
  private requestCount = 0;
  private totalTokens = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async sendMessage(
    messages: Message[],
    config: Partial<CerebrasConfig> = {}
  ): Promise<{ content: string; metadata: MessageMetadata }> {
    const {
      model = 'llama3.1-8b',
      temperature = 0.7,
      maxTokens = 4096,
      topP = 0.9,
      frequencyPenalty = 0,
      presencePenalty = 0,
      systemPrompt
    } = config;

    const formattedMessages = this.formatMessages(messages, systemPrompt);
    const startTime = Date.now();

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
          frequency_penalty: frequencyPenalty,
          presence_penalty: presencePenalty,
          stream: false
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
      }

      const data = await response.json();
      const processingTime = Date.now() - startTime;
      const tokens = data.usage?.total_tokens || 0;
      
      this.requestCount++;
      this.totalTokens += tokens;

      const metadata: MessageMetadata = {
        model,
        temperature,
        maxTokens,
        topP,
        cost: this.calculateCost(tokens, model),
        language: this.detectLanguage(data.choices[0]?.message?.content || ''),
        sentiment: this.analyzeSentiment(data.choices[0]?.message?.content || ''),
        topics: this.extractTopics(data.choices[0]?.message?.content || '')
      };

      return {
        content: data.choices[0]?.message?.content || 'Нет ответа от ИИ',
        metadata
      };
    } catch (error) {
      console.error('Cerebras API Error:', error);
      throw error;
    }
  }

  async sendMessageStream(
    messages: Message[],
    config: Partial<CerebrasConfig> = {},
    onChunk: (chunk: string, metadata?: Partial<MessageMetadata>) => void,
    onComplete?: (metadata: MessageMetadata) => void
  ): Promise<void> {
    const {
      model = 'llama3.1-8b',
      temperature = 0.7,
      maxTokens = 4096,
      topP = 0.9,
      frequencyPenalty = 0,
      presencePenalty = 0,
      systemPrompt
    } = config;

    const formattedMessages = this.formatMessages(messages, systemPrompt);
    const startTime = Date.now();
    let totalContent = '';
    let tokenCount = 0;

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
          frequency_penalty: frequencyPenalty,
          presence_penalty: presencePenalty,
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
            if (data === '[DONE]') {
              const processingTime = Date.now() - startTime;
              const metadata: MessageMetadata = {
                model,
                temperature,
                maxTokens,
                topP,
                cost: this.calculateCost(tokenCount, model),
                language: this.detectLanguage(totalContent),
                sentiment: this.analyzeSentiment(totalContent),
                topics: this.extractTopics(totalContent)
              };
              
              onComplete?.(metadata);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                totalContent += content;
                tokenCount++;
                onChunk(content, { model, temperature });
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

  private formatMessages(messages: Message[], systemPrompt?: string): any[] {
    const formatted = [];
    
    if (systemPrompt) {
      formatted.push({
        role: 'system',
        content: systemPrompt
      });
    }

    return formatted.concat(messages.map(msg => ({
      role: msg.role,
      content: this.formatMessageContent(msg)
    })));
  }

  private formatMessageContent(message: Message): string {
    let content = message.content;
    
    if (message.files && message.files.length > 0) {
      const fileContents = message.files.map(file => {
        let fileInfo = `\n\n--- Файл: ${file.name} (${file.type}, ${this.formatFileSize(file.size)}) ---\n`;
        
        if (file.extractedText) {
          fileInfo += file.extractedText;
        } else {
          fileInfo += file.content;
        }
        
        fileInfo += '\n--- Конец файла ---';
        return fileInfo;
      }).join('');
      
      content += fileContents;
    }

    return content;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private calculateCost(tokens: number, model: string): number {
    // Примерные цены за 1000 токенов
    const prices: Record<string, number> = {
      'llama3.1-8b': 0.10,
      'llama3.1-70b': 0.60,
    };
    
    const pricePerThousand = prices[model] || 0.10;
    return (tokens / 1000) * pricePerThousand;
  }

  private detectLanguage(text: string): string {
    // Простое определение языка по характерным символам
    const russianChars = /[а-яё]/i;
    const englishChars = /[a-z]/i;
    
    const russianCount = (text.match(russianChars) || []).length;
    const englishCount = (text.match(englishChars) || []).length;
    
    if (russianCount > englishCount) return 'ru';
    if (englishCount > russianCount) return 'en';
    return 'mixed';
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['хорошо', 'отлично', 'замечательно', 'прекрасно', 'великолепно', 'good', 'great', 'excellent', 'wonderful'];
    const negativeWords = ['плохо', 'ужасно', 'отвратительно', 'проблема', 'ошибка', 'bad', 'terrible', 'awful', 'problem', 'error'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private extractTopics(text: string): string[] {
    // Простое извлечение тем по ключевым словам
    const topics: string[] = [];
    const topicKeywords = {
      'программирование': ['код', 'программа', 'разработка', 'алгоритм', 'функция'],
      'наука': ['исследование', 'эксперимент', 'теория', 'гипотеза'],
      'технологии': ['компьютер', 'интернет', 'сеть', 'данные', 'система'],
      'образование': ['учеба', 'знания', 'обучение', 'курс', 'урок'],
      'бизнес': ['компания', 'продажи', 'маркетинг', 'прибыль', 'клиент']
    };
    
    const lowerText = text.toLowerCase();
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        topics.push(topic);
      }
    }
    
    return topics;
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

  getStatistics() {
    return {
      requestCount: this.requestCount,
      totalTokens: this.totalTokens,
      estimatedCost: this.totalTokens * 0.0001 // примерная стоимость
    };
  }
}
import React, { useState, useEffect, useRef } from 'react';
import { Message, ChatSession, CerebrasConfig, AttachedFile } from '@/types/chat';
import { CerebrasClient } from '@/lib/cerebras';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useHotkeys } from '@/hooks/useHotkeys';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ChatSidebar } from './ChatSidebar';
import { SettingsDialog } from './SettingsDialog';
import { AnalyticsDialog } from './AnalyticsDialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { saveAs } from 'file-saver';
import { 
  Menu, X, MessageSquare, Loader as Loader2, CircleAlert as AlertCircle, 
  Sparkles, Maximize, Minimize, Moon, Sun, Zap, TrendingUp, Share,
  Download, FileText, Bookmark, Search, Filter, Settings, HelpCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const ChatInterface: React.FC = () => {
  const [sessions, setSessions] = useLocalStorage<ChatSession[]>('chat-sessions', []);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [config, setConfig] = useLocalStorage<CerebrasConfig>('cerebras-config', {
    apiKey: '',
    model: 'llama3.1-8b',
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    systemPrompt: '',
    streamResponse: true,
    autoSave: true,
    maxHistoryLength: 50,
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [showMetadata, setShowMetadata] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cerebrasClient = useRef<CerebrasClient | null>(null);

  // Горячие клавиши
  useHotkeys([
    {
      key: 'n',
      ctrl: true,
      callback: createNewSession,
      description: 'Новый чат'
    },
    {
      key: 's',
      ctrl: true,
      callback: () => setSettingsOpen(true),
      description: 'Настройки'
    },
    {
      key: 'a',
      ctrl: true,
      callback: () => setAnalyticsOpen(true),
      description: 'Аналитика'
    },
    {
      key: 'b',
      ctrl: true,
      callback: () => setSidebarOpen(!sidebarOpen),
      description: 'Переключить боковую панель'
    },
    {
      key: 'f',
      callback: toggleFullscreen,
      description: 'Полноэкранный режим'
    },
    {
      key: 'd',
      ctrl: true,
      callback: () => setDarkMode(!darkMode),
      description: 'Переключить тему'
    }
  ]);

  // Инициализация клиента
  useEffect(() => {
    if (config.apiKey) {
      cerebrasClient.current = new CerebrasClient(config.apiKey);
    }
  }, [config.apiKey]);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSessionId, isStreaming, streamingMessage]);

  // Создание новой сессии при первом запуске
  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession();
    } else if (!currentSessionId) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions, currentSessionId]);

  // Применение темной темы
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const getCurrentSession = (): ChatSession | null => {
    return sessions.find(s => s.id === currentSessionId) || null;
  };

  function createNewSession() {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'Новый чат',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      category: 'general',
      isArchived: false,
      isFavorite: false,
      settings: {
        systemPrompt: config.systemPrompt,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        model: config.model,
        autoSave: config.autoSave,
        notifications: true,
      },
      statistics: {
        totalMessages: 0,
        totalTokens: 0,
        totalCost: 0,
        averageResponseTime: 0,
        topTopics: [],
        sentimentDistribution: { positive: 0, negative: 0, neutral: 0 }
      }
    };

    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  }

  const updateSession = (sessionId: string, updates: Partial<ChatSession>) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, ...updates, updatedAt: new Date() }
        : session
    ));
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    
    if (currentSessionId === sessionId) {
      const remainingSessions = sessions.filter(s => s.id !== sessionId);
      if (remainingSessions.length > 0) {
        setCurrentSessionId(remainingSessions[0].id);
      } else {
        createNewSession();
      }
    }

    toast({
      title: "Чат удален",
      description: "Сессия чата была успешно удалена",
    });
  };

  const generateTitle = (content: string): string => {
    const words = content.trim().split(' ').slice(0, 6);
    return words.join(' ') + (content.split(' ').length > 6 ? '...' : '');
  };

  const sendMessage = async (content: string, files: AttachedFile[]) => {
    if (!cerebrasClient.current) {
      toast({
        title: "Ошибка",
        description: "Настройте API ключ в настройках",
        variant: "destructive",
      });
      setSettingsOpen(true);
      return;
    }

    const currentSession = getCurrentSession();
    if (!currentSession) return;

    // Создаем сообщение пользователя
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      files,
      timestamp: new Date(),
    };

    // Обновляем сессию с сообщением пользователя
    const updatedMessages = [...currentSession.messages, userMessage];
    updateSession(currentSession.id, { 
      messages: updatedMessages,
      title: currentSession.messages.length === 0 ? generateTitle(content) : currentSession.title
    });

    setIsLoading(true);
    setIsStreaming(true);
    setStreamingMessage('');

    try {
      // Создаем временное сообщение ассистента
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      let fullResponse = '';
      const startTime = Date.now();

      if (config.streamResponse) {
        // Используем потоковый режим
        await cerebrasClient.current.sendMessageStream(
          updatedMessages,
          config,
          (chunk: string) => {
            fullResponse += chunk;
            setStreamingMessage(fullResponse);
          },
          (metadata) => {
            assistantMessage.metadata = metadata;
            assistantMessage.processingTime = Date.now() - startTime;
          }
        );
      } else {
        // Обычный режим
        const response = await cerebrasClient.current.sendMessage(updatedMessages, config);
        fullResponse = response.content;
        assistantMessage.metadata = response.metadata;
        assistantMessage.processingTime = Date.now() - startTime;
      }

      // Обновляем сообщение с полным ответом
      assistantMessage.content = fullResponse;
      assistantMessage.tokens = fullResponse.split(' ').length; // Примерный подсчет токенов
      
      const finalMessages = [...updatedMessages, assistantMessage];
      
      // Обновляем статистику сессии
      const newStats = {
        totalMessages: finalMessages.length,
        totalTokens: finalMessages.reduce((sum, msg) => sum + (msg.tokens || 0), 0),
        totalCost: finalMessages.reduce((sum, msg) => sum + (msg.metadata?.cost || 0), 0),
        averageResponseTime: finalMessages
          .filter(msg => msg.processingTime)
          .reduce((sum, msg, _, arr) => sum + (msg.processingTime! / arr.length), 0),
        topTopics: assistantMessage.metadata?.topics || [],
        sentimentDistribution: {
          positive: finalMessages.filter(msg => msg.metadata?.sentiment === 'positive').length,
          negative: finalMessages.filter(msg => msg.metadata?.sentiment === 'negative').length,
          neutral: finalMessages.filter(msg => msg.metadata?.sentiment === 'neutral').length,
        }
      };

      updateSession(currentSession.id, { 
        messages: finalMessages,
        statistics: newStats
      });

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Произошла ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        timestamp: new Date(),
      };

      const errorMessages = [...updatedMessages, errorMessage];
      updateSession(currentSession.id, { messages: errorMessages });

      toast({
        title: "Ошибка отправки",
        description: error instanceof Error ? error.message : 'Не удалось отправить сообщение',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingMessage('');
    }
  };

  const handleMessageEdit = (messageId: string, newContent: string) => {
    const currentSession = getCurrentSession();
    if (!currentSession) return;

    const updatedMessages = currentSession.messages.map(msg => 
      msg.id === messageId 
        ? { ...msg, content: newContent, isEdited: true, originalContent: msg.content }
        : msg
    );

    updateSession(currentSession.id, { messages: updatedMessages });
    
    toast({
      title: "Сообщение изменено",
      description: "Изменения сохранены",
    });
  };

  const handleMessageReaction = (messageId: string, emoji: string) => {
    const currentSession = getCurrentSession();
    if (!currentSession) return;

    const updatedMessages = currentSession.messages.map(msg => {
      if (msg.id === messageId) {
        const reactions = msg.reactions || [];
        const existingReaction = reactions.find(r => r.emoji === emoji);
        
        if (existingReaction) {
          existingReaction.count += 1;
        } else {
          reactions.push({ emoji, count: 1, users: ['user'] });
        }
        
        return { ...msg, reactions };
      }
      return msg;
    });

    updateSession(currentSession.id, { messages: updatedMessages });
  };

  const handleMessageShare = (message: Message) => {
    const shareData = {
      title: 'Сообщение из чата',
      text: message.content,
    };

    if (navigator.share) {
      navigator.share(shareData);
    } else {
      navigator.clipboard.writeText(message.content);
      toast({
        title: "Скопировано",
        description: "Сообщение скопировано в буфер обмена",
      });
    }
  };

  const toggleMessageExpand = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const exportSessions = () => {
    const dataStr = JSON.stringify(sessions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    saveAs(blob, `chat-sessions-${timestamp}.json`);
    
    toast({
      title: "Экспорт завершен",
      description: "Сессии чатов экспортированы в файл",
    });
  };

  const exportCurrentSession = (format: 'json' | 'md' | 'txt' = 'md') => {
    const currentSession = getCurrentSession();
    if (!currentSession) return;

    let content = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
      case 'md':
        content = `# ${currentSession.title}\n\n`;
        content += currentSession.messages.map(msg => {
          const role = msg.role === 'user' ? '**Пользователь**' : '**ИИ Ассистент**';
          return `${role}: ${msg.content}\n\n---\n\n`;
        }).join('');
        filename = `${currentSession.title}-${Date.now()}.md`;
        mimeType = 'text/markdown';
        break;
      case 'txt':
        content = `${currentSession.title}\n${'='.repeat(currentSession.title.length)}\n\n`;
        content += currentSession.messages.map(msg => {
          const role = msg.role === 'user' ? 'Пользователь' : 'ИИ Ассистент';
          return `${role}: ${msg.content}\n\n`;
        }).join('');
        filename = `${currentSession.title}-${Date.now()}.txt`;
        mimeType = 'text/plain';
        break;
      case 'json':
        content = JSON.stringify(currentSession, null, 2);
        filename = `${currentSession.title}-${Date.now()}.json`;
        mimeType = 'application/json';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    saveAs(blob, filename);
  };

  const importSessions = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSessions = JSON.parse(e.target?.result as string);
        setSessions(prev => [...importedSessions, ...prev]);
        
        toast({
          title: "Импорт завершен",
          description: `Импортировано ${importedSessions.length} сессий`,
        });
      } catch (error) {
        toast({
          title: "Ошибка импорта",
          description: "Не удалось импортировать файл",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    
    // Очистка input
    event.target.value = '';
  };

  const currentSession = getCurrentSession();
  const allMessages = currentSession?.messages || [];

  const templates = [
    { name: 'Объяснить код', content: 'Объясни этот код подробно:' },
    { name: 'Исправить ошибки', content: 'Найди и исправь ошибки в этом коде:' },
    { name: 'Оптимизировать', content: 'Как можно оптимизировать этот код?' },
    { name: 'Документация', content: 'Создай документацию для этого кода:' },
    { name: 'Тесты', content: 'Напиши тесты для этого кода:' },
  ];

  return (
    <div className={`flex h-screen ${darkMode ? 'dark' : ''} bg-gray-50 dark:bg-gray-900`}>
      {/* Боковая панель */}
      {sidebarOpen && (
        <div className="flex-shrink-0">
          <ChatSidebar
            sessions={sessions}
            currentSessionId={currentSessionId}
            onNewChat={createNewSession}
            onSelectSession={setCurrentSessionId}
            onDeleteSession={deleteSession}
            onEditSession={updateSession}
            onExportSessions={exportSessions}
            onImportSessions={importSessions}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenAnalytics={() => setAnalyticsOpen(true)}
          />
        </div>
      )}

      {/* Основная область чата */}
      <div className="flex-1 flex flex-col">
        {/* Заголовок */}
        <div className="bg-white dark:bg-gray-800 border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
            
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <h1 className="text-lg font-semibold">
                {currentSession?.title || 'AI Chat Bot'}
              </h1>
              {currentSession?.isFavorite && (
                <Badge variant="secondary">Избранное</Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Статистика текущей сессии */}
            {currentSession?.statistics && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline">
                      <MessageSquare className="w-3 h-3 mr-1" />
                      {currentSession.statistics.totalMessages}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Всего сообщений</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline">
                      <Zap className="w-3 h-3 mr-1" />
                      {currentSession.statistics.totalTokens}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Токенов использовано</TooltipContent>
                </Tooltip>
              </div>
            )}

            {/* Меню действий */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowMetadata(!showMetadata)}>
                  Показать метаданные
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCurrentSession('md')}>
                  <Download className="w-4 h-4 mr-2" />
                  Экспорт в Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCurrentSession('txt')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Экспорт в текст
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleFullscreen}>
                  {isFullscreen ? <Minimize className="w-4 h-4 mr-2" /> : <Maximize className="w-4 h-4 mr-2" />}
                  {isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDarkMode(!darkMode)}>
                  {darkMode ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                  {darkMode ? 'Светлая тема' : 'Темная тема'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {!config.apiKey && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                className="text-orange-600 border-orange-200"
              >
                <AlertCircle className="w-4 h-4 mr-1" />
                Настроить API
              </Button>
            )}
          </div>
        </div>

        {/* Область сообщений */}
        <ScrollArea className="flex-1 p-4">
          {allMessages.length === 0 && !isStreaming ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">
                Добро пожаловать в AI Chat Bot!
              </h2>
              <p className="text-gray-500 mb-4 max-w-md">
                Начните разговор с искусственным интеллектом. 
                Вы можете задавать вопросы, прикреплять файлы и получать ответы в формате Markdown.
              </p>
              
              {/* Быстрые действия */}
              <div className="flex flex-wrap gap-2 mb-4">
                {templates.slice(0, 3).map((template, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Здесь можно добавить логику для вставки шаблона
                    }}
                  >
                    {template.name}
                  </Button>
                ))}
              </div>
              
              {!config.apiKey && (
                <Button onClick={() => setSettingsOpen(true)}>
                  Настроить API ключ
                </Button>
              )}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {allMessages.map((message) => (
                <MessageBubble 
                  key={message.id} 
                  message={message}
                  onEdit={handleMessageEdit}
                  onReact={handleMessageReaction}
                  onShare={handleMessageShare}
                  theme={darkMode ? 'dark' : 'light'}
                  showMetadata={showMetadata}
                  isExpanded={expandedMessages.has(message.id)}
                  onToggleExpand={toggleMessageExpand}
                />
              ))}
              
              {/* Потоковое сообщение */}
              {isStreaming && streamingMessage && (
                <MessageBubble
                  message={{
                    id: 'streaming',
                    role: 'assistant',
                    content: streamingMessage,
                    timestamp: new Date(),
                  }}
                  theme={darkMode ? 'dark' : 'light'}
                  showMetadata={showMetadata}
                />
              )}
              
              {/* Индикатор загрузки */}
              {isLoading && !streamingMessage && (
                <div className="flex gap-3 mb-6">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  </div>
                  <div className="flex-1 max-w-[80%]">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>ИИ думает...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Поле ввода */}
        <div className="border-t bg-white dark:bg-gray-800">
          <div className="max-w-4xl mx-auto">
            <ChatInput
              onSendMessage={sendMessage}
              isLoading={isLoading}
              disabled={!config.apiKey}
              templates={templates}
              suggestions={['@код', '@объяснение', '@исправление', '@оптимизация']}
            />
          </div>
        </div>
      </div>

      {/* Диалоги */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        config={config}
        onConfigChange={setConfig}
      />

      <AnalyticsDialog
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
        sessions={sessions}
      />
    </div>
  );
};
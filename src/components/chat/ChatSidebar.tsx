import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Settings, 
  Download,
  Upload,
  History
} from 'lucide-react';
import { ChatSession } from '@/types/chat';

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onExportSessions: () => void;
  onImportSessions: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenSettings: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onExportSessions,
  onImportSessions,
  onOpenSettings,
}) => {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Сегодня';
    if (diffDays === 2) return 'Вчера';
    if (diffDays <= 7) return `${diffDays} дней назад`;
    
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
    }).format(date);
  };

  const groupSessionsByDate = (sessions: ChatSession[]) => {
    const groups: { [key: string]: ChatSession[] } = {};
    
    sessions.forEach(session => {
      const dateKey = formatDate(session.updatedAt);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(session);
    });

    return groups;
  };

  const sessionGroups = groupSessionsByDate(sessions);

  return (
    <Card className="w-80 h-full flex flex-col">
      {/* Заголовок */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Чаты
          </h2>
          <Badge variant="secondary">{sessions.length}</Badge>
        </div>
        
        <Button onClick={onNewChat} className="w-full" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Новый чат
        </Button>
      </div>

      {/* Список сессий */}
      <ScrollArea className="flex-1 p-2">
        {Object.keys(sessionGroups).length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Нет сохраненных чатов</p>
            <p className="text-sm">Начните новый разговор</p>
          </div>
        ) : (
          Object.entries(sessionGroups).map(([dateGroup, groupSessions]) => (
            <div key={dateGroup} className="mb-4">
              <h3 className="text-xs font-medium text-gray-500 mb-2 px-2">
                {dateGroup}
              </h3>
              <div className="space-y-1">
                {groupSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                      currentSessionId === session.id
                        ? 'bg-blue-100 border border-blue-200'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => onSelectSession(session.id)}
                  >
                    <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {session.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {session.messages.length} сообщений
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </ScrollArea>

      {/* Нижние кнопки */}
      <div className="p-4 border-t space-y-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportSessions}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-1" />
            Экспорт
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('import-input')?.click()}
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-1" />
            Импорт
          </Button>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenSettings}
          className="w-full"
        >
          <Settings className="w-4 h-4 mr-2" />
          Настройки
        </Button>

        <input
          id="import-input"
          type="file"
          accept=".json"
          onChange={onImportSessions}
          className="hidden"
        />
      </div>
    </Card>
  );
};
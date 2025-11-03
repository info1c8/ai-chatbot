import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, MessageSquare, Trash2, Settings, Download, Upload, History, Search, Filter, Star, Archive, Tag, Calendar, MoveHorizontal as MoreHorizontal, Pin, CreditCard as Edit, Share, Bookmark, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { ChatSession, SearchFilters } from '@/types/chat';
import { useSearch } from '@/hooks/useSearch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onEditSession?: (sessionId: string, updates: Partial<ChatSession>) => void;
  onExportSessions: () => void;
  onImportSessions: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenSettings: () => void;
  onOpenAnalytics?: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onEditSession,
  onExportSessions,
  onImportSessions,
  onOpenSettings,
  onOpenAnalytics,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'messages'>('date');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { filters, setFilters, filteredSessions } = useSearch(sessions);

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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters({ ...filters, query });
  };

  const handleEditSession = (sessionId: string, title: string) => {
    setEditingSessionId(sessionId);
    setEditTitle(title);
  };

  const saveEdit = () => {
    if (editingSessionId && editTitle.trim()) {
      onEditSession?.(editingSessionId, { title: editTitle.trim() });
    }
    setEditingSessionId(null);
    setEditTitle('');
  };

  const toggleFavorite = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      onEditSession?.(sessionId, { isFavorite: !session.isFavorite });
    }
  };

  const toggleArchive = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      onEditSession?.(sessionId, { isArchived: !session.isArchived });
    }
  };

  const groupSessionsByDate = (sessions: ChatSession[]) => {
    const groups: { [key: string]: ChatSession[] } = {};
    
    const sortedSessions = [...sessions].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'messages':
          return b.messages.length - a.messages.length;
        default:
          return b.updatedAt.getTime() - a.updatedAt.getTime();
      }
    });

    sortedSessions.forEach(session => {
      if (!showArchived && session.isArchived) return;
      if (selectedCategory !== 'all' && session.category !== selectedCategory) return;
      
      const dateKey = formatDate(session.updatedAt);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(session);
    });

    return groups;
  };

  const sessionGroups = groupSessionsByDate(filteredSessions);
  const categories = [...new Set(sessions.map(s => s.category).filter(Boolean))];
  const totalCost = sessions.reduce((sum, session) => 
    sum + (session.statistics?.totalCost || 0), 0
  );

  return (
    <Card className="w-80 h-full flex flex-col">
      {/* Заголовок */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Чаты
          </h2>
          <div className="flex items-center gap-1">
            <Badge variant="secondary">{sessions.length}</Badge>
            {totalCost > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs">
                    <DollarSign className="w-3 h-3 mr-1" />
                    ${totalCost.toFixed(2)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Общая стоимость запросов
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        
        <Button onClick={onNewChat} className="w-full" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Новый чат
        </Button>

        {/* Поиск */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Поиск чатов..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 pr-10"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <Filter className="w-3 h-3" />
          </Button>
        </div>

        {/* Фильтры */}
        {showFilters && (
          <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'date' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('date')}
                className="flex-1"
              >
                <Clock className="w-3 h-3 mr-1" />
                Дата
              </Button>
              <Button
                variant={sortBy === 'name' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('name')}
                className="flex-1"
              >
                Имя
              </Button>
              <Button
                variant={sortBy === 'messages' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('messages')}
                className="flex-1"
              >
                Сообщения
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={showArchived ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
              >
                <Archive className="w-3 h-3 mr-1" />
                Архив
              </Button>
              
              {categories.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="flex-1 px-2 py-1 border rounded text-sm"
                >
                  <option value="all">Все категории</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Список сессий */}
      <ScrollArea className="flex-1 p-2">
        {Object.keys(sessionGroups).length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Нет чатов</p>
            <p className="text-sm">
              {searchQuery ? 'Попробуйте другой поисковый запрос' : 'Начните новый разговор'}
            </p>
          </div>
        ) : (
          Object.entries(sessionGroups).map(([dateGroup, groupSessions]) => (
            <div key={dateGroup} className="mb-4">
              <h3 className="text-xs font-medium text-gray-500 mb-2 px-2 flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                {dateGroup}
              </h3>
              <div className="space-y-1">
                {groupSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                      currentSessionId === session.id
                        ? 'bg-blue-100 border border-blue-200'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => onSelectSession(session.id)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        {session.isFavorite && (
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                        )}
                        {session.isArchived && (
                          <Archive className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {editingSessionId === session.id ? (
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') setEditingSessionId(null);
                            }}
                            className="h-6 text-sm"
                            autoFocus
                          />
                        ) : (
                          <>
                            <p className="text-sm font-medium truncate">
                              {session.title}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{session.messages.length} сообщений</span>
                              {session.statistics?.totalCost && (
                                <>
                                  <span>•</span>
                                  <span>${session.statistics.totalCost.toFixed(3)}</span>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Теги */}
                    {session.tags && session.tags.length > 0 && (
                      <div className="flex gap-1">
                        {session.tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs px-1">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Меню действий */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        >
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditSession(session.id, session.title)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Переименовать
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleFavorite(session.id)}>
                          <Star className="w-4 h-4 mr-2" />
                          {session.isFavorite ? 'Убрать из избранного' : 'В избранное'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleArchive(session.id)}>
                          <Archive className="w-4 h-4 mr-2" />
                          {session.isArchived ? 'Разархивировать' : 'Архивировать'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Share className="w-4 h-4 mr-2" />
                          Поделиться
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Bookmark className="w-4 h-4 mr-2" />
                          Экспортировать
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onDeleteSession(session.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
        
        <div className="flex gap-2">
          {onOpenAnalytics && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenAnalytics}
              className="flex-1"
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Аналитика
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSettings}
            className="flex-1"
          >
            <Settings className="w-4 h-4 mr-1" />
            Настройки
          </Button>
        </div>

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
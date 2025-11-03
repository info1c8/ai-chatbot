import { useState, useMemo } from 'react';
import { ChatSession, Message, SearchFilters } from '@/types/chat';

export const useSearch = (sessions: ChatSession[]) => {
  const [filters, setFilters] = useState<SearchFilters>({});

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      // Фильтр по запросу
      if (filters.query) {
        const query = filters.query.toLowerCase();
        const titleMatch = session.title.toLowerCase().includes(query);
        const messageMatch = session.messages.some(msg => 
          msg.content.toLowerCase().includes(query)
        );
        if (!titleMatch && !messageMatch) return false;
      }

      // Фильтр по дате
      if (filters.dateFrom && session.createdAt < filters.dateFrom) return false;
      if (filters.dateTo && session.createdAt > filters.dateTo) return false;

      // Фильтр по тегам
      if (filters.tags && filters.tags.length > 0) {
        if (!session.tags || !filters.tags.some(tag => session.tags!.includes(tag))) {
          return false;
        }
      }

      // Фильтр по категории
      if (filters.category && session.category !== filters.category) return false;

      // Фильтр по типу сообщений
      if (filters.messageType) {
        if (!session.messages.some(msg => msg.role === filters.messageType)) {
          return false;
        }
      }

      // Фильтр по наличию файлов
      if (filters.hasFiles !== undefined) {
        const hasFiles = session.messages.some(msg => msg.files && msg.files.length > 0);
        if (hasFiles !== filters.hasFiles) return false;
      }

      // Фильтр по настроению
      if (filters.sentiment) {
        const hasSentiment = session.messages.some(msg => 
          msg.metadata?.sentiment === filters.sentiment
        );
        if (!hasSentiment) return false;
      }

      return true;
    });
  }, [sessions, filters]);

  const searchMessages = (query: string): { session: ChatSession; message: Message }[] => {
    const results: { session: ChatSession; message: Message }[] = [];
    const lowerQuery = query.toLowerCase();

    sessions.forEach(session => {
      session.messages.forEach(message => {
        if (message.content.toLowerCase().includes(lowerQuery)) {
          results.push({ session, message });
        }
      });
    });

    return results;
  };

  return {
    filters,
    setFilters,
    filteredSessions,
    searchMessages
  };
};
import { useMemo } from 'react';
import { ChatSession, SessionStatistics } from '@/types/chat';

export const useAnalytics = (sessions: ChatSession[]) => {
  const analytics = useMemo(() => {
    const totalSessions = sessions.length;
    const totalMessages = sessions.reduce((sum, session) => sum + session.messages.length, 0);
    const totalTokens = sessions.reduce((sum, session) => 
      sum + session.messages.reduce((msgSum, msg) => msgSum + (msg.tokens || 0), 0), 0
    );
    const totalCost = sessions.reduce((sum, session) => 
      sum + session.messages.reduce((msgSum, msg) => msgSum + (msg.metadata?.cost || 0), 0), 0
    );

    // Активность по дням
    const activityByDay = sessions.reduce((acc, session) => {
      const date = session.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Популярные модели
    const modelUsage = sessions.reduce((acc, session) => {
      session.messages.forEach(msg => {
        if (msg.metadata?.model) {
          acc[msg.metadata.model] = (acc[msg.metadata.model] || 0) + 1;
        }
      });
      return acc;
    }, {} as Record<string, number>);

    // Распределение настроений
    const sentimentDistribution = sessions.reduce((acc, session) => {
      session.messages.forEach(msg => {
        if (msg.metadata?.sentiment) {
          acc[msg.metadata.sentiment] = (acc[msg.metadata.sentiment] || 0) + 1;
        }
      });
      return acc;
    }, { positive: 0, negative: 0, neutral: 0 });

    // Топ тем
    const topicCounts = sessions.reduce((acc, session) => {
      session.messages.forEach(msg => {
        if (msg.metadata?.topics) {
          msg.metadata.topics.forEach(topic => {
            acc[topic] = (acc[topic] || 0) + 1;
          });
        }
      });
      return acc;
    }, {} as Record<string, number>);

    const topTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    // Среднее время ответа
    const responseTimes = sessions.flatMap(session => 
      session.messages
        .filter(msg => msg.processingTime)
        .map(msg => msg.processingTime!)
    );
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    // Использование файлов
    const filesUsage = {
      totalFiles: sessions.reduce((sum, session) => 
        sum + session.messages.reduce((msgSum, msg) => 
          msgSum + (msg.files?.length || 0), 0
        ), 0
      ),
      fileTypes: sessions.reduce((acc, session) => {
        session.messages.forEach(msg => {
          msg.files?.forEach(file => {
            const type = file.type.split('/')[0];
            acc[type] = (acc[type] || 0) + 1;
          });
        });
        return acc;
      }, {} as Record<string, number>)
    };

    return {
      totalSessions,
      totalMessages,
      totalTokens,
      totalCost,
      averageResponseTime,
      activityByDay,
      modelUsage,
      sentimentDistribution,
      topTopics,
      filesUsage
    };
  }, [sessions]);

  const getSessionStatistics = (session: ChatSession): SessionStatistics => {
    const totalMessages = session.messages.length;
    const totalTokens = session.messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0);
    const totalCost = session.messages.reduce((sum, msg) => sum + (msg.metadata?.cost || 0), 0);
    
    const responseTimes = session.messages
      .filter(msg => msg.processingTime)
      .map(msg => msg.processingTime!);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    const topicCounts = session.messages.reduce((acc, msg) => {
      if (msg.metadata?.topics) {
        msg.metadata.topics.forEach(topic => {
          acc[topic] = (acc[topic] || 0) + 1;
        });
      }
      return acc;
    }, {} as Record<string, number>);

    const topTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);

    const sentimentDistribution = session.messages.reduce((acc, msg) => {
      if (msg.metadata?.sentiment) {
        acc[msg.metadata.sentiment]++;
      }
      return acc;
    }, { positive: 0, negative: 0, neutral: 0 });

    return {
      totalMessages,
      totalTokens,
      totalCost,
      averageResponseTime,
      topTopics,
      sentimentDistribution
    };
  };

  return {
    analytics,
    getSessionStatistics
  };
};
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  files?: AttachedFile[];
  metadata?: MessageMetadata;
  reactions?: MessageReaction[];
  isEdited?: boolean;
  originalContent?: string;
  tokens?: number;
  processingTime?: number;
}

export interface MessageMetadata {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  cost?: number;
  language?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  topics?: string[];
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  url?: string;
  thumbnail?: string;
  extractedText?: string;
  metadata?: FileMetadata;
}

export interface FileMetadata {
  dimensions?: { width: number; height: number };
  duration?: number;
  pages?: number;
  language?: string;
  encoding?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  category?: string;
  isArchived?: boolean;
  isFavorite?: boolean;
  settings?: SessionSettings;
  statistics?: SessionStatistics;
  sharedWith?: string[];
  exportedAt?: Date;
}

export interface SessionSettings {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  autoSave?: boolean;
  notifications?: boolean;
}

export interface SessionStatistics {
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  topTopics: string[];
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

export interface CerebrasConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  systemPrompt?: string;
  streamResponse?: boolean;
  autoSave?: boolean;
  maxHistoryLength?: number;
}

export interface ChatTheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    accent: string;
  };
  fonts: {
    primary: string;
    code: string;
  };
  borderRadius: string;
  shadows: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  preferences: {
    theme: string;
    language: string;
    notifications: boolean;
    autoSave: boolean;
    defaultModel: string;
  };
  statistics: {
    totalChats: number;
    totalMessages: number;
    totalTokens: number;
    joinedAt: Date;
  };
}

export interface SearchFilters {
  query?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  category?: string;
  messageType?: 'user' | 'assistant' | 'system';
  hasFiles?: boolean;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface ExportOptions {
  format: 'json' | 'markdown' | 'pdf' | 'html' | 'csv';
  includeFiles: boolean;
  includeMetadata: boolean;
  dateRange?: { from: Date; to: Date };
  sessions?: string[];
}

export interface PluginInterface {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  settings: Record<string, any>;
  hooks: {
    beforeSend?: (message: string, files: AttachedFile[]) => Promise<{ message: string; files: AttachedFile[] }>;
    afterReceive?: (response: string) => Promise<string>;
    onMessageRender?: (message: Message) => React.ReactNode;
  };
}
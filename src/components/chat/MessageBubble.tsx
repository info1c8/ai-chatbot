import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, Download, User, Bot, Check, Image, FileText, CreditCard as Edit, MoveHorizontal as MoreHorizontal, Share, Bookmark, ThumbsUp, ThumbsDown, Clock, Zap, DollarSign, Globe, Heart, Smile, Frown, Eye, EyeOff, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { saveAs } from 'file-saver';
import { formatFileSize } from '@/lib/fileUtils';
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

interface MessageBubbleProps {
  message: Message;
  onEdit?: (messageId: string, newContent: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onShare?: (message: Message) => void;
  onBookmark?: (messageId: string) => void;
  theme?: 'light' | 'dark';
  showMetadata?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (messageId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  onEdit,
  onReact,
  onShare,
  onBookmark,
  theme = 'light',
  showMetadata = true,
  isExpanded = false,
  onToggleExpand
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast({
        title: "Скопировано!",
        description: "Сообщение скопировано в буфер обмена",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать сообщение",
        variant: "destructive",
      });
    }
  };

  const handleDownload = (format: 'md' | 'txt' | 'json' = 'md') => {
    let content = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
      case 'md':
        content = message.content;
        filename = `message-${message.id}.md`;
        mimeType = 'text/markdown';
        break;
      case 'txt':
        content = message.content;
        filename = `message-${message.id}.txt`;
        mimeType = 'text/plain';
        break;
      case 'json':
        content = JSON.stringify(message, null, 2);
        filename = `message-${message.id}.json`;
        mimeType = 'application/json';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    saveAs(blob, filename);
  };

  const handleEdit = () => {
    if (isEditing) {
      onEdit?.(message.id, editContent);
      setIsEditing(false);
    } else {
      setIsEditing(true);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  const handleTextToSpeech = () => {
    if (isPlaying) {
      speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(message.content);
      utterance.lang = message.metadata?.language === 'ru' ? 'ru-RU' : 'en-US';
      utterance.onend = () => setIsPlaying(false);
      speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return <Smile className="w-3 h-3 text-green-500" />;
      case 'negative': return <Frown className="w-3 h-3 text-red-500" />;
      default: return null;
    }
  };

  const getAvatarColor = () => {
    if (isSystem) return 'bg-purple-500';
    return isUser ? 'bg-blue-500' : 'bg-green-500';
  };

  const getAvatarIcon = () => {
    if (isSystem) return <Zap className="w-4 h-4 text-white" />;
    return isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />;
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-6 group`}>
      {/* Аватар */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getAvatarColor()}`}>
        {getAvatarIcon()}
      </div>
      
      <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : 'text-left'}`}>
        <Card className={`p-4 transition-all duration-200 hover:shadow-md ${
          isUser ? 'bg-blue-50 border-blue-200' : 
          isSystem ? 'bg-purple-50 border-purple-200' : 
          'bg-gray-50'
        } ${isExpanded ? 'ring-2 ring-blue-200' : ''}`}>
          
          {/* Заголовок сообщения */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {isSystem ? 'Система' : isUser ? 'Вы' : 'ИИ Ассистент'}
              </span>
              {message.isEdited && (
                <Badge variant="secondary" className="text-xs">
                  изменено
                </Badge>
              )}
              {message.metadata?.sentiment && getSentimentIcon(message.metadata.sentiment)}
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleExpand?.(message.id)}
                    className="h-6 w-6 p-0"
                  >
                    {isExpanded ? <Minimize className="w-3 h-3" /> : <Maximize className="w-3 h-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isExpanded ? 'Свернуть' : 'Развернуть'}
                </TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleCopy}>
                    <Copy className="w-4 h-4 mr-2" />
                    Копировать
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload('md')}>
                    <Download className="w-4 h-4 mr-2" />
                    Скачать как MD
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload('txt')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Скачать как TXT
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload('json')}>
                    <FileText className="w-4 h-4 mr-2" />
                    Скачать как JSON
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleTextToSpeech}>
                    {isPlaying ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
                    {isPlaying ? 'Остановить' : 'Озвучить'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowRaw(!showRaw)}>
                    {showRaw ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                    {showRaw ? 'Скрыть разметку' : 'Показать разметку'}
                  </DropdownMenuItem>
                  {isUser && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleEdit}>
                        <Edit className="w-4 h-4 mr-2" />
                        {isEditing ? 'Сохранить' : 'Редактировать'}
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onShare?.(message)}>
                    <Share className="w-4 h-4 mr-2" />
                    Поделиться
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBookmark?.(message.id)}>
                    <Bookmark className="w-4 h-4 mr-2" />
                    В закладки
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Прикрепленные файлы */}
          {message.files && message.files.length > 0 && (
            <div className="mb-3 space-y-2">
              {message.files.map((file) => (
                <div key={file.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                  {file.thumbnail ? (
                    <img 
                      src={file.thumbnail} 
                      alt={file.name}
                      className="w-8 h-8 rounded object-cover"
                    />
                  ) : file.type.startsWith('image/') ? (
                    <Image className="w-4 h-4 text-blue-500" />
                  ) : (
                    <FileText className="w-4 h-4 text-gray-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{file.name}</span>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatFileSize(file.size)}</span>
                      {file.metadata?.dimensions && (
                        <span>{file.metadata.dimensions.width}×{file.metadata.dimensions.height}</span>
                      )}
                    </div>
                  </div>
                  {file.url && file.type.startsWith('image/') && (
                    <img 
                      src={file.url} 
                      alt={file.name}
                      className="max-w-xs max-h-32 rounded border mt-2 cursor-pointer hover:opacity-80"
                      onClick={() => window.open(file.url, '_blank')}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Содержимое сообщения */}
          <div className="prose prose-sm max-w-none">
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[100px] p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleEdit}>
                    Сохранить
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    Отмена
                  </Button>
                </div>
              </div>
            ) : showRaw ? (
              <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-3 rounded border overflow-x-auto">
                {message.content}
              </pre>
            ) : isUser ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={theme === 'dark' ? oneDark : oneLight}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-md"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={`${className} bg-gray-100 px-1 py-0.5 rounded text-sm`} {...props}>
                        {children}
                      </code>
                    );
                  },
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full border-collapse border border-gray-300 rounded-lg">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold text-left">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-gray-300 px-4 py-2">
                      {children}
                    </td>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 my-4 italic">
                      {children}
                    </blockquote>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-800">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-bold mt-5 mb-3 text-gray-800">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-bold mt-4 mb-2 text-gray-800">{children}</h3>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>

          {/* Метаданные */}
          {showMetadata && message.metadata && isExpanded && (
            <>
              <Separator className="my-3" />
              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex flex-wrap gap-2">
                  {message.metadata.model && (
                    <Badge variant="outline" className="text-xs">
                      <Zap className="w-3 h-3 mr-1" />
                      {message.metadata.model}
                    </Badge>
                  )}
                  {message.metadata.language && (
                    <Badge variant="outline" className="text-xs">
                      <Globe className="w-3 h-3 mr-1" />
                      {message.metadata.language}
                    </Badge>
                  )}
                  {message.metadata.cost && (
                    <Badge variant="outline" className="text-xs">
                      <DollarSign className="w-3 h-3 mr-1" />
                      ${message.metadata.cost.toFixed(4)}
                    </Badge>
                  )}
                  {message.processingTime && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {message.processingTime}ms
                    </Badge>
                  )}
                </div>
                
                {message.metadata.topics && message.metadata.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-gray-400">Темы:</span>
                    {message.metadata.topics.map((topic, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Реакции */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex gap-1 mt-3 pt-2 border-t">
              {message.reactions.map((reaction, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => onReact?.(message.id, reaction.emoji)}
                >
                  {reaction.emoji} {reaction.count}
                </Button>
              ))}
            </div>
          )}

          {/* Нижняя панель */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{formatTime(message.timestamp)}</span>
              <span>•</span>
              <span>{formatDate(message.timestamp)}</span>
            </div>
            
            <div className="flex items-center gap-1">
              {!isUser && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReact?.(message.id, '👍')}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReact?.(message.id, '👎')}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </Button>
                </>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
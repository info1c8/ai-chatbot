import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, User, Bot, Check, Image, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { saveAs } from 'file-saver';
import { formatFileSize } from '@/lib/fileUtils';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

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

  const handleDownload = () => {
    const blob = new Blob([message.content], { type: 'text/markdown' });
    const timestamp = new Date(message.timestamp).toISOString().slice(0, 19).replace(/:/g, '-');
    saveAs(blob, `message-${timestamp}.md`);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-6`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-blue-500' : 'bg-green-500'
      }`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>
      
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : 'text-left'}`}>
        <Card className={`p-4 ${isUser ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
          {/* Прикрепленные файлы */}
          {message.files && message.files.length > 0 && (
            <div className="mb-3 space-y-2">
              {message.files.map((file) => (
                <div key={file.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                  {file.type.startsWith('image/') ? (
                    <Image className="w-4 h-4 text-blue-500" />
                  ) : (
                    <FileText className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="text-sm font-medium truncate">{file.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {formatFileSize(file.size)}
                  </Badge>
                  {file.url && file.type.startsWith('image/') && (
                    <img 
                      src={file.url} 
                      alt={file.name}
                      className="max-w-xs max-h-32 rounded border mt-2"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Содержимое сообщения */}
          <div className="prose prose-sm max-w-none">
            {isUser ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-md"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  table: ({ children }) => (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse border border-gray-300">
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
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>

          {/* Действия с сообщением */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t">
            <span className="text-xs text-gray-500">
              {formatTime(message.timestamp)}
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 px-2"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="h-7 px-2"
              >
                <Download className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
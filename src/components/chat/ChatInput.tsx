import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Paperclip, 
  X, 
  FileText, 
  Image, 
  Loader2,
  Mic,
  MicOff
} from 'lucide-react';
import { AttachedFile } from '@/types/chat';
import { createAttachedFile, formatFileSize, isTextFile, isImageFile } from '@/lib/fileUtils';
import { toast } from '@/hooks/use-toast';

interface ChatInputProps {
  onSendMessage: (content: string, files: AttachedFile[]) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  isLoading, 
  disabled = false 
}) => {
  const [message, setMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && attachedFiles.length === 0) || isLoading || disabled) return;

    onSendMessage(message.trim(), attachedFiles);
    setMessage('');
    setAttachedFiles([]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      try {
        // Проверка размера файла (максимум 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "Файл слишком большой",
            description: `Файл ${file.name} превышает лимит в 10MB`,
            variant: "destructive",
          });
          continue;
        }

        // Проверка типа файла
        if (!isTextFile(file) && !isImageFile(file)) {
          toast({
            title: "Неподдерживаемый тип файла",
            description: `Файл ${file.name} имеет неподдерживаемый тип`,
            variant: "destructive",
          });
          continue;
        }

        const attachedFile = await createAttachedFile(file);
        setAttachedFiles(prev => [...prev, attachedFile]);
        
        toast({
          title: "Файл прикреплен",
          description: `${file.name} успешно прикреплен`,
        });
      } catch (error) {
        toast({
          title: "Ошибка",
          description: `Не удалось прикрепить файл ${file.name}`,
          variant: "destructive",
        });
      }
    }

    // Очистка input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      
      // Здесь можно добавить логику записи аудио
      toast({
        title: "Запись начата",
        description: "Функция записи аудио в разработке",
      });
      
      // Остановка через 5 секунд для демонстрации
      setTimeout(() => {
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      }, 5000);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось получить доступ к микрофону",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  return (
    <Card className="p-4 border-t">
      {/* Прикрепленные файлы */}
      {attachedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachedFiles.map((file) => (
            <Badge key={file.id} variant="secondary" className="flex items-center gap-2 pr-1">
              {file.type.startsWith('image/') ? (
                <Image className="w-3 h-3" />
              ) : (
                <FileText className="w-3 h-3" />
              )}
              <span className="text-xs truncate max-w-20">{file.name}</span>
              <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(file.id)}
                className="h-4 w-4 p-0 hover:bg-red-100"
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите ваш вопрос..."
            className="min-h-[60px] max-h-32 resize-none pr-20"
            disabled={disabled || isLoading}
          />
          
          {/* Кнопки в правом углу textarea */}
          <div className="absolute right-2 bottom-2 flex gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".txt,.md,.json,.js,.ts,.jsx,.tsx,.css,.html,.xml,.csv,.py,.java,.cpp,.c,.h,.php,.rb,.go,.rs,.swift,.kt,.scala,.sh,.yml,.yaml,.toml,.ini,.cfg,.conf,image/*"
            />
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isLoading}
              className="h-7 w-7 p-0"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={disabled || isLoading}
              className={`h-7 w-7 p-0 ${isRecording ? 'text-red-500' : ''}`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={(!message.trim() && attachedFiles.length === 0) || isLoading || disabled}
          className="px-4"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>

      <div className="mt-2 text-xs text-gray-500">
        Поддерживаемые файлы: текстовые файлы, изображения (до 10MB). 
        Нажмите Enter для отправки, Shift+Enter для новой строки.
      </div>
    </Card>
  );
};
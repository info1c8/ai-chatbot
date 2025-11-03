import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Send, Paperclip, X, FileText, Image, Loader as Loader2, 
  Mic, MicOff, Smile, AtSign, Hash, Zap, Settings,
  Camera, Video, FileCode, Archive, Music
} from 'lucide-react';
import { AttachedFile } from '@/types/chat';
import { createAttachedFile, formatFileSize, validateFile, compressImage } from '@/lib/fileUtils';
import { toast } from '@/hooks/use-toast';
import { useHotkeys } from '@/hooks/useHotkeys';
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

interface ChatInputProps {
  onSendMessage: (content: string, files: AttachedFile[]) => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxFiles?: number;
  maxFileSize?: number;
  suggestions?: string[];
  templates?: { name: string; content: string }[];
  onTemplateSelect?: (template: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  isLoading, 
  disabled = false,
  placeholder = "Введите ваш вопрос...",
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  suggestions = [],
  templates = [],
  onTemplateSelect
}) => {
  const [message, setMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [dragOver, setDragOver] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Горячие клавиши
  useHotkeys([
    {
      key: 'Enter',
      ctrl: true,
      callback: () => handleSubmit(new Event('submit') as any),
      description: 'Отправить сообщение'
    },
    {
      key: 'k',
      ctrl: true,
      callback: () => fileInputRef.current?.click(),
      description: 'Прикрепить файл'
    },
    {
      key: 'r',
      ctrl: true,
      callback: () => isRecording ? stopRecording() : startRecording(),
      description: 'Начать/остановить запись'
    }
  ]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && attachedFiles.length === 0) || isLoading || disabled) return;

    onSendMessage(message.trim(), attachedFiles);
    setMessage('');
    setAttachedFiles([]);
    setUploadProgress({});
    textareaRef.current?.focus();
  }, [message, attachedFiles, isLoading, disabled, onSendMessage]);

  const handleFileSelect = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    if (attachedFiles.length + fileArray.length > maxFiles) {
      toast({
        title: "Слишком много файлов",
        description: `Максимум ${maxFiles} файлов за раз`,
        variant: "destructive",
      });
      return;
    }

    for (const file of fileArray) {
      const validation = validateFile(file, maxFileSize);
      if (!validation.valid) {
        toast({
          title: "Ошибка файла",
          description: validation.error,
          variant: "destructive",
        });
        continue;
      }

      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        // Сжатие изображений
        const processedFile = file.type.startsWith('image/') 
          ? await compressImage(file) 
          : file;

        // Симуляция прогресса загрузки
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const current = prev[file.name] || 0;
            if (current >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return { ...prev, [file.name]: current + 10 };
          });
        }, 100);

        const attachedFile = await createAttachedFile(processedFile);
        
        clearInterval(progressInterval);
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
        }, 1000);

        setAttachedFiles(prev => [...prev, attachedFile]);
        
        toast({
          title: "Файл прикреплен",
          description: `${file.name} успешно обработан`,
        });
      } catch (error) {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
        
        toast({
          title: "Ошибка",
          description: `Не удалось обработать файл ${file.name}`,
          variant: "destructive",
        });
      }
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const removeFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
    
    if (e.key === '@') {
      setShowSuggestions(true);
      setFilteredSuggestions(suggestions);
    }
    
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    // Автоматическое изменение высоты
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    
    // Фильтрация предложений
    if (value.includes('@')) {
      const query = value.split('@').pop()?.toLowerCase() || '';
      const filtered = suggestions.filter(s => 
        s.toLowerCase().includes(query)
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm;codecs=opus' 
        });
        
        const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, {
          type: 'audio/webm'
        });
        
        await handleFileSelect([audioFile]);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start(1000); // Записывать каждую секунду
      setIsRecording(true);
      
      toast({
        title: "Запись начата",
        description: "Говорите в микрофон",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось получить доступ к микрофону",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      toast({
        title: "Запись завершена",
        description: "Аудиофайл будет прикреплен к сообщению",
      });
    }
  };

  const insertTemplate = (template: string) => {
    setMessage(prev => prev + (prev ? '\n\n' : '') + template);
    onTemplateSelect?.(template);
    textareaRef.current?.focus();
  };

  const getFileIcon = (file: AttachedFile) => {
    if (file.type.startsWith('image/')) return <Image className="w-3 h-3" />;
    if (file.type.startsWith('video/')) return <Video className="w-3 h-3" />;
    if (file.type.startsWith('audio/')) return <Music className="w-3 h-3" />;
    if (file.type.includes('zip') || file.type.includes('rar')) return <Archive className="w-3 h-3" />;
    if (file.type.includes('javascript') || file.type.includes('typescript')) return <FileCode className="w-3 h-3" />;
    return <FileText className="w-3 h-3" />;
  };

  return (
    <Card 
      className={`p-4 border-t transition-all duration-200 ${
        dragOver ? 'border-blue-500 bg-blue-50' : ''
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Прикрепленные файлы */}
      {attachedFiles.length > 0 && (
        <div className="mb-3 space-y-2">
          {attachedFiles.map((file) => (
            <div key={file.id} className="flex items-center gap-2 p-2 bg-white rounded border">
              {file.thumbnail ? (
                <img 
                  src={file.thumbnail} 
                  alt={file.name}
                  className="w-8 h-8 rounded object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                  {getFileIcon(file)}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{file.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {formatFileSize(file.size)}
                  </Badge>
                </div>
                
                {file.metadata?.dimensions && (
                  <span className="text-xs text-gray-500">
                    {file.metadata.dimensions.width}×{file.metadata.dimensions.height}
                  </span>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(file.id)}
                className="h-6 w-6 p-0 hover:bg-red-100 text-red-500"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Прогресс загрузки */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="mb-3 space-y-2">
          {Object.entries(uploadProgress).map(([filename, progress]) => (
            <div key={filename} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="truncate">{filename}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1" />
            </div>
          ))}
        </div>
      )}

      {/* Основная форма */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={dragOver ? "Отпустите файлы для прикрепления..." : placeholder}
            className="min-h-[60px] max-h-[200px] resize-none pr-32"
            disabled={disabled || isLoading}
          />
          
          {/* Кнопки в правом углу textarea */}
          <div className="absolute right-2 bottom-2 flex gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              className="hidden"
              accept="*/*"
            />
            
            {/* Меню прикрепления файлов */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled || isLoading}
                  className="h-7 w-7 p-0"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <FileText className="w-4 h-4 mr-2" />
                  Файлы
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.multiple = true;
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) handleFileSelect(files);
                  };
                  input.click();
                }}>
                  <Image className="w-4 h-4 mr-2" />
                  Изображения
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'video/*';
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) handleFileSelect(files);
                  };
                  input.click();
                }}>
                  <Video className="w-4 h-4 mr-2" />
                  Видео
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    // Захват экрана (если поддерживается)
                    navigator.mediaDevices.getDisplayMedia({ video: true })
                      .then(stream => {
                        toast({
                          title: "Захват экрана",
                          description: "Функция в разработке",
                        });
                        stream.getTracks().forEach(track => track.stop());
                      })
                      .catch(() => {
                        toast({
                          title: "Ошибка",
                          description: "Захват экрана не поддерживается",
                          variant: "destructive",
                        });
                      });
                  }
                }}>
                  <Camera className="w-4 h-4 mr-2" />
                  Скриншот
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Кнопка записи аудио */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={disabled || isLoading}
                  className={`h-7 w-7 p-0 ${isRecording ? 'text-red-500 animate-pulse' : ''}`}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isRecording ? 'Остановить запись (Ctrl+R)' : 'Начать запись (Ctrl+R)'}
              </TooltipContent>
            </Tooltip>

            {/* Меню шаблонов */}
            {templates.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled || isLoading}
                    className="h-7 w-7 p-0"
                  >
                    <Zap className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {templates.map((template, index) => (
                    <DropdownMenuItem 
                      key={index}
                      onClick={() => insertTemplate(template.content)}
                      className="flex-col items-start"
                    >
                      <span className="font-medium">{template.name}</span>
                      <span className="text-xs text-gray-500 truncate w-full">
                        {template.content.substring(0, 50)}...
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Нижняя панель */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>
              {attachedFiles.length > 0 && `${attachedFiles.length} файл(ов) • `}
              Ctrl+Enter для отправки • Ctrl+K для файлов
            </span>
          </div>

          <Button
            type="submit"
            disabled={(!message.trim() && attachedFiles.length === 0) || isLoading || disabled}
            className="px-6"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {isLoading ? 'Отправка...' : 'Отправить'}
          </Button>
        </div>
      </form>

      {/* Предложения */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border rounded-lg shadow-lg max-h-32 overflow-y-auto z-10">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm"
              onClick={() => {
                const parts = message.split('@');
                parts[parts.length - 1] = suggestion + ' ';
                setMessage(parts.join('@'));
                setShowSuggestions(false);
                textareaRef.current?.focus();
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Overlay для drag & drop */}
      {dragOver && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-10 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-20">
          <div className="text-center">
            <Paperclip className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="text-blue-700 font-medium">Отпустите файлы для прикрепления</p>
          </div>
        </div>
      )}
    </Card>
  );
};
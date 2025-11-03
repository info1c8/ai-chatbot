import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { CerebrasConfig } from '@/types/chat';
import { CerebrasClient } from '@/lib/cerebras';
import { toast } from '@/hooks/use-toast';
import { 
  Settings, 
  Key, 
  Brain, 
  Palette, 
  Shield,
  Info,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: CerebrasConfig;
  onConfigChange: (config: CerebrasConfig) => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onOpenChange,
  config,
  onConfigChange,
}) => {
  const [localConfig, setLocalConfig] = useState<CerebrasConfig>(config);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [darkMode, setDarkMode] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [streamResponse, setStreamResponse] = useState(true);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  useEffect(() => {
    if (localConfig.apiKey) {
      loadModels();
    }
  }, [localConfig.apiKey]);

  const loadModels = async () => {
    try {
      const client = new CerebrasClient(localConfig.apiKey);
      const models = await client.getModels();
      setAvailableModels(models);
    } catch (error) {
      console.error('Failed to load models:', error);
      setAvailableModels(['llama3.1-8b', 'llama3.1-70b']);
    }
  };

  const testConnection = async () => {
    if (!localConfig.apiKey) {
      toast({
        title: "Ошибка",
        description: "Введите API ключ",
        variant: "destructive",
      });
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');

    try {
      const client = new CerebrasClient(localConfig.apiKey);
      await client.sendMessage([
        { 
          id: 'test', 
          role: 'user', 
          content: 'Привет! Это тестовое сообщение.', 
          timestamp: new Date() 
        }
      ], localConfig);
      
      setConnectionStatus('success');
      toast({
        title: "Успешно!",
        description: "Подключение к Cerebras API установлено",
      });
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: "Ошибка подключения",
        description: error instanceof Error ? error.message : "Не удалось подключиться к API",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSave = () => {
    onConfigChange(localConfig);
    toast({
      title: "Настройки сохранены",
      description: "Конфигурация успешно обновлена",
    });
    onOpenChange(false);
  };

  const resetToDefaults = () => {
    const defaultConfig: CerebrasConfig = {
      apiKey: '',
      model: 'llama3.1-8b',
      temperature: 0.7,
      maxTokens: 4096,
      topP: 0.9,
    };
    setLocalConfig(defaultConfig);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Настройки
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="api" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="api">API</TabsTrigger>
            <TabsTrigger value="model">Модель</TabsTrigger>
            <TabsTrigger value="interface">Интерфейс</TabsTrigger>
            <TabsTrigger value="about">О программе</TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Cerebras API
                </CardTitle>
                <CardDescription>
                  Настройте подключение к Cerebras Cloud API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Ключ</Label>
                  <div className="flex gap-2">
                    <Input
                      id="apiKey"
                      type="password"
                      value={localConfig.apiKey}
                      onChange={(e) => setLocalConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="Введите ваш Cerebras API ключ"
                    />
                    <Button
                      variant="outline"
                      onClick={testConnection}
                      disabled={isTestingConnection || !localConfig.apiKey}
                    >
                      {isTestingConnection ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : connectionStatus === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : connectionStatus === 'error' ? (
                        <XCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        'Тест'
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Получите API ключ на{' '}
                    <a 
                      href="https://cloud.cerebras.ai" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      cloud.cerebras.ai
                    </a>
                  </p>
                </div>

                {connectionStatus === 'success' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Подключение успешно</span>
                    </div>
                  </div>
                )}

                {connectionStatus === 'error' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                      <XCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Ошибка подключения</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="model" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Параметры модели
                </CardTitle>
                <CardDescription>
                  Настройте поведение ИИ модели
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="model">Модель</Label>
                  <Select
                    value={localConfig.model}
                    onValueChange={(value) => setLocalConfig(prev => ({ ...prev, model: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите модель" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                          {model.includes('70b') && (
                            <Badge variant="secondary" className="ml-2">Pro</Badge>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Температура: {localConfig.temperature}</Label>
                  <Slider
                    value={[localConfig.temperature]}
                    onValueChange={([value]) => setLocalConfig(prev => ({ ...prev, temperature: value }))}
                    max={2}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Контролирует креативность ответов (0 = детерминированный, 2 = очень креативный)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Максимум токенов: {localConfig.maxTokens}</Label>
                  <Slider
                    value={[localConfig.maxTokens]}
                    onValueChange={([value]) => setLocalConfig(prev => ({ ...prev, maxTokens: value }))}
                    max={8192}
                    min={256}
                    step={256}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Максимальная длина ответа модели
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Top P: {localConfig.topP}</Label>
                  <Slider
                    value={[localConfig.topP]}
                    onValueChange={([value]) => setLocalConfig(prev => ({ ...prev, topP: value }))}
                    max={1}
                    min={0.1}
                    step={0.1}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Контролирует разнообразие выбора слов
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interface" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Интерфейс
                </CardTitle>
                <CardDescription>
                  Настройте внешний вид и поведение приложения
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Темная тема</Label>
                    <p className="text-xs text-gray-500">
                      Переключить на темное оформление
                    </p>
                  </div>
                  <Switch
                    checked={darkMode}
                    onCheckedChange={setDarkMode}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Автосохранение</Label>
                    <p className="text-xs text-gray-500">
                      Автоматически сохранять чаты
                    </p>
                  </div>
                  <Switch
                    checked={autoSave}
                    onCheckedChange={setAutoSave}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Потоковые ответы</Label>
                    <p className="text-xs text-gray-500">
                      Показывать ответы по мере генерации
                    </p>
                  </div>
                  <Switch
                    checked={streamResponse}
                    onCheckedChange={setStreamResponse}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  О программе
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">AI Chat Bot</h3>
                  <p className="text-sm text-gray-600">
                    Версия 1.0.0
                  </p>
                  <p className="text-sm text-gray-600">
                    Чат-бот с искусственным интеллектом на базе Cerebras API
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Возможности:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Общение с ИИ моделями Cerebras</li>
                    <li>• Прикрепление файлов и изображений</li>
                    <li>• Отображение ответов в формате Markdown</li>
                    <li>• Копирование и сохранение сообщений</li>
                    <li>• Управление сессиями чатов</li>
                    <li>• Экспорт и импорт данных</li>
                    <li>• Настройка параметров модели</li>
                  </ul>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500 text-center">
                    Создано с использованием React, TypeScript и Cerebras API
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={resetToDefaults}>
            Сбросить
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave}>
              Сохранить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
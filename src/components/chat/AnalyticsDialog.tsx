import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import { 
  TrendingUp, MessageSquare, DollarSign, Clock, Brain, 
  FileText, Image, Zap, Globe, Heart, Users
} from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { ChatSession } from '@/types/chat';

interface AnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: ChatSession[];
}

export const AnalyticsDialog: React.FC<AnalyticsDialogProps> = ({
  open,
  onOpenChange,
  sessions,
}) => {
  const { analytics } = useAnalytics(sessions);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const activityData = Object.entries(analytics.activityByDay)
    .slice(-30)
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      count
    }));

  const modelData = Object.entries(analytics.modelUsage).map(([model, count]) => ({
    name: model,
    value: count
  }));

  const sentimentData = [
    { name: 'Позитивные', value: analytics.sentimentDistribution.positive, color: '#00C49F' },
    { name: 'Негативные', value: analytics.sentimentDistribution.negative, color: '#FF8042' },
    { name: 'Нейтральные', value: analytics.sentimentDistribution.neutral, color: '#FFBB28' }
  ];

  const fileTypeData = Object.entries(analytics.filesUsage.fileTypes).map(([type, count]) => ({
    name: type,
    value: count
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Аналитика чатов
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="activity">Активность</TabsTrigger>
            <TabsTrigger value="models">Модели</TabsTrigger>
            <TabsTrigger value="content">Контент</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Основные метрики */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Всего чатов</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalSessions}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Сообщений</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalMessages}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Токенов</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalTokens.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Стоимость</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${analytics.totalCost.toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Топ темы */}
            <Card>
              <CardHeader>
                <CardTitle>Популярные темы</CardTitle>
                <CardDescription>Наиболее обсуждаемые темы в ваших чатах</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.topTopics.slice(0, 10).map((topic, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{index + 1}</Badge>
                        <span className="text-sm">{topic.topic}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={(topic.count / analytics.topTopics[0]?.count) * 100} 
                          className="w-20 h-2" 
                        />
                        <span className="text-sm text-gray-500">{topic.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Распределение настроений */}
            <Card>
              <CardHeader>
                <CardTitle>Анализ настроений</CardTitle>
                <CardDescription>Эмоциональная окраска ваших разговоров</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Активность по дням</CardTitle>
                <CardDescription>Количество созданных чатов за последние 30 дней</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Среднее время ответа
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {(analytics.averageResponseTime / 1000).toFixed(1)}с
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Среднее время генерации ответа ИИ
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Файлы
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {analytics.filesUsage.totalFiles}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Всего прикрепленных файлов
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="models" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Использование моделей</CardTitle>
                <CardDescription>Статистика использования различных ИИ моделей</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={modelData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(analytics.modelUsage).map(([model, count], index) => (
                <Card key={model}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        {model}
                      </span>
                      <Badge variant="secondary">{count}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress 
                      value={(count / Math.max(...Object.values(analytics.modelUsage))) * 100} 
                      className="h-2" 
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      {((count / analytics.totalMessages) * 100).toFixed(1)}% от всех сообщений
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Типы файлов</CardTitle>
                <CardDescription>Распределение прикрепленных файлов по типам</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={fileTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {fileTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    Изображения
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.filesUsage.fileTypes.image || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Документы
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.filesUsage.fileTypes.text || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Другие
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Object.values(analytics.filesUsage.fileTypes)
                      .reduce((sum, count) => sum + count, 0) - 
                     (analytics.filesUsage.fileTypes.image || 0) - 
                     (analytics.filesUsage.fileTypes.text || 0)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
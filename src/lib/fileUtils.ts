import { AttachedFile, FileMetadata } from '@/types/chat';

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading file'));
    
    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  });
};

export const createThumbnail = (file: File): Promise<string | undefined> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(undefined);
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const maxSize = 150;
      let { width, height } = img;

      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };

    img.onerror = () => resolve(undefined);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const extractFileMetadata = async (file: File): Promise<FileMetadata> => {
  const metadata: FileMetadata = {};

  if (file.type.startsWith('image/')) {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      metadata.dimensions = {
        width: img.width,
        height: img.height
      };

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error extracting image metadata:', error);
    }
  }

  // Определение кодировки для текстовых файлов
  if (isTextFile(file)) {
    metadata.encoding = 'UTF-8'; // По умолчанию
    metadata.language = detectFileLanguage(file.name);
  }

  return metadata;
};

export const extractTextFromFile = async (file: File): Promise<string> => {
  if (file.type === 'application/pdf') {
    // Здесь можно добавить извлечение текста из PDF
    return 'PDF файл (извлечение текста не реализовано)';
  }

  if (file.type.startsWith('image/')) {
    // Здесь можно добавить OCR для изображений
    return 'Изображение (OCR не реализован)';
  }

  if (isTextFile(file)) {
    return await readFileAsText(file);
  }

  return 'Неподдерживаемый тип файла для извлечения текста';
};

export const createAttachedFile = async (file: File): Promise<AttachedFile> => {
  const [content, thumbnail, metadata, extractedText] = await Promise.all([
    readFileAsText(file),
    createThumbnail(file),
    extractFileMetadata(file),
    extractTextFromFile(file)
  ]);
  
  return {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type,
    size: file.size,
    content,
    url: file.type.startsWith('image/') ? content : undefined,
    thumbnail,
    metadata,
    extractedText: extractedText !== content ? extractedText : undefined
  };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const isTextFile = (file: File): boolean => {
  const textTypes = [
    'text/',
    'application/json',
    'application/javascript',
    'application/typescript',
    'application/xml',
    'application/csv',
    'application/yaml',
    'application/x-yaml'
  ];
  
  const textExtensions = [
    'txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'css', 'html', 'xml', 'csv',
    'py', 'java', 'cpp', 'c', 'h', 'php', 'rb', 'go', 'rs', 'swift', 'kt',
    'scala', 'sh', 'yml', 'yaml', 'toml', 'ini', 'cfg', 'conf', 'log',
    'sql', 'r', 'matlab', 'pl', 'lua', 'dart', 'vue', 'svelte'
  ];
  
  return textTypes.some(type => file.type.startsWith(type)) || 
         textExtensions.some(ext => file.name.toLowerCase().endsWith(`.${ext}`));
};

export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

export const isPDFFile = (file: File): boolean => {
  return file.type === 'application/pdf';
};

export const isVideoFile = (file: File): boolean => {
  return file.type.startsWith('video/');
};

export const isAudioFile = (file: File): boolean => {
  return file.type.startsWith('audio/');
};

export const detectFileLanguage = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'jsx': 'javascript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'h': 'c',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'sh': 'bash',
    'sql': 'sql',
    'html': 'html',
    'css': 'css',
    'xml': 'xml',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml'
  };

  return languageMap[extension || ''] || 'text';
};

export const validateFile = (file: File, maxSize: number = 50 * 1024 * 1024): { valid: boolean; error?: string } => {
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Файл слишком большой. Максимальный размер: ${formatFileSize(maxSize)}`
    };
  }

  const allowedTypes = [
    'text/', 'image/', 'application/json', 'application/javascript',
    'application/typescript', 'application/xml', 'application/csv',
    'application/pdf', 'application/yaml', 'application/x-yaml'
  ];

  const isAllowed = allowedTypes.some(type => file.type.startsWith(type)) || isTextFile(file);

  if (!isAllowed) {
    return {
      valid: false,
      error: 'Неподдерживаемый тип файла'
    };
  }

  return { valid: true };
};

export const compressImage = async (file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> => {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: file.lastModified
          });
          resolve(compressedFile);
        } else {
          resolve(file);
        }
      }, file.type, quality);
    };

    img.onerror = () => resolve(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};
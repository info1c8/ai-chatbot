import { AttachedFile } from '@/types/chat';

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

export const createAttachedFile = async (file: File): Promise<AttachedFile> => {
  const content = await readFileAsText(file);
  
  return {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type,
    size: file.size,
    content,
    url: file.type.startsWith('image/') ? content : undefined
  };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
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
    'application/csv'
  ];
  
  return textTypes.some(type => file.type.startsWith(type)) || 
         file.name.match(/\.(txt|md|json|js|ts|jsx|tsx|css|html|xml|csv|py|java|cpp|c|h|php|rb|go|rs|swift|kt|scala|sh|yml|yaml|toml|ini|cfg|conf)$/i);
};

export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};
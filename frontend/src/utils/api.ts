import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Upload endpoints
export const uploadImage = async (formData: FormData) => {
  const response = await api.post('/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const validateImage = async (formData: FormData) => {
  const response = await api.post('/upload/validate', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getUploadStatus = async (imageId: string) => {
  const response = await api.get(`/upload/status/${imageId}`);
  return response.data;
};

// Annotation endpoints
export const createAnnotation = async (imageId: string, annotation: any) => {
  const response = await api.post(`/annotations/${imageId}`, annotation);
  return response.data;
};

export const getAnnotations = async (imageId: string) => {
  const response = await api.get(`/annotations/${imageId}`);
  return response.data;
};

export const updateAnnotation = async (annotationId: string, annotation: any) => {
  const response = await api.put(`/annotations/${annotationId}`, annotation);
  return response.data;
};

export const deleteAnnotation = async (annotationId: string) => {
  const response = await api.delete(`/annotations/${annotationId}`);
  return response.data;
};

export const getAnnotationStats = async (imageId: string) => {
  const response = await api.get(`/annotations/stats/${imageId}`);
  return response.data;
};

// Dataset endpoints
export const getDatasetStats = async () => {
  const response = await api.get('/dataset/stats');
  return response.data;
};

export const getDatasetSplit = async (split: string, page = 1, limit = 50) => {
  const response = await api.get(`/dataset/split/${split}`, {
    params: { page, limit },
  });
  return response.data;
};

export const exportDataset = async (format: 'coco' | 'jsonl', split: string = 'all') => {
  const response = await api.get('/dataset/export', {
    params: { format, split },
    responseType: format === 'jsonl' ? 'blob' : 'json',
  });
  return response.data;
};

export const reassignDatasetSplit = async (trainRatio: number, valRatio: number, testRatio: number) => {
  const response = await api.post('/dataset/reassign', {
    trainRatio,
    valRatio,
    testRatio,
  });
  return response.data;
};

// Image fetching
export const getImageUrl = (s3Path: string) => {
  // In production, this would be a CloudFront URL or presigned S3 URL
  return `${API_BASE_URL}/images/${s3Path}`;
};

export default api;
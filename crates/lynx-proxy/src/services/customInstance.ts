import axios, { AxiosError, AxiosRequestConfig } from 'axios';

export const AXIOS_INSTANCE = axios.create({
  baseURL: '/__self_service_path__',
  headers: {
    'Content-Type': 'application/json',
  },
});

AXIOS_INSTANCE.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    console.error('[Request Error]', error);
    return Promise.reject(error);
  },
);

AXIOS_INSTANCE.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    console.warn(
      `[Response Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
      {
        status: error.response?.status,
        data: error.response?.data,
        error: error.message,
      },
    );
    return Promise.reject(error);
  },
);

export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  return AXIOS_INSTANCE(config)
    .then(({ data }) => data)
    .catch((error: AxiosError) => {
      throw error;
    });
};

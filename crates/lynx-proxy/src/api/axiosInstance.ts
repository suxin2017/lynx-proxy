import axios from 'axios';
import { message } from 'antd';

const axiosInstance = axios.create({
  baseURL: '/__self_service_path__',
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    message.error(error.response?.data?.message || 'Server error');
    return Promise.reject(error);
  }
);

export default axiosInstance;

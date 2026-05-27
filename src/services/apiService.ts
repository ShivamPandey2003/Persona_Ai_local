import axios from "axios";
import { toast } from "sonner";

const platform_url = import.meta.env.VITE_REACT_APP_API_URL;

type ApiMethod = "get" | "post" | "put" | "delete";

const apiClient = axios.create({
  baseURL: platform_url,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && (config.url !== "/uam/login")) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
    (response) => {
        // You can access headers here
        const token = response.headers['access-token'];
        if(token){
          localStorage.setItem('token', token)
        }
        // Store headers in a global state or context if needed
        return response;
    },
    (error) => Promise.reject(error.response || error.message)
);

const handleSessionExpiration = (): void => {
  sessionStorage.clear();
  localStorage.clear();
  window.location.href = "/"; // Redirect to login page
};

export const apiRequest = async (
  method: ApiMethod,
  url: string,
  // headers?: Record<string, string>,
  data: any = null,
  responseType: "json" | "blob" = "json"
) => {
  try {
    // const requestHeaders = { ...headers };
    const response = await apiClient.request({
      method,
      url,
      data,
      // headers: requestHeaders,
      responseType,
    });
    if (responseType === "json") {
      if (response?.data?.code === 200) {
        return response.data;
      } else if (response?.data?.code === 401) {
        toast.error("Session expired, logging out.");
        handleSessionExpiration();
        return response.data;
      } else {
        return {
          response: response.data,
        };
      }
    } else {
      return { response: response.data, headers:response.headers };
    }
  } catch (error: any) {
    if (error?.status === 401) {
      toast.error("Session expired, logging out.");
      handleSessionExpiration();
    } else if (
      error.response?.status === 400 ||
      error?.status === 400 ||
      error?.data?.code === 400
    ) {
      toast.error(error.data.header.message);
    }
  }
};

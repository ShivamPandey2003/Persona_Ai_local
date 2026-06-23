import axios from "axios";
import { toast } from "sonner";
import { getApiErrorMessage, getNetworkErrorMessage } from "@/lib/apiError";

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
        const token = response.headers['authorization'];
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
      const body = response?.data;
      // The backend always answers HTTP 200; the real status lives in the
      // envelope (`header.code`, or a legacy top-level `code`).
      const code: number | undefined = body?.header?.code ?? body?.code;
      const message: string | undefined = body?.header?.message ?? body?.message;

      if (code === 401) {
        toast.error(getApiErrorMessage(401, message));
        handleSessionExpiration();
        return body;
      }

      // Any other non-success envelope is surfaced as a thrown error so
      // react-query (and mutations) move into an error state, with a toast.
      if (typeof code === "number" && code >= 400) {
        const friendly = getApiErrorMessage(code, message);
        toast.error(friendly);
        throw new Error(friendly);
      }

      // Success — preserve the historical return shapes used by callers.
      if (body?.code === 200) {
        return body;
      }
      return { response: body };
    } else {
      return { response: response.data, headers: response.headers };
    }
  } catch (error: any) {
    // Errors we raised above are already toasted; the axios interceptor rejects
    // with a response object or a string (never an Error), so any Error here is
    // one of ours — just propagate it without a second toast.
    if (error instanceof Error) {
      throw error;
    }

    const status: number | undefined =
      error?.status ?? error?.response?.status ?? error?.data?.code;
    const backendMessage: string | undefined =
      error?.data?.header?.message ?? error?.response?.data?.header?.message;

    if (status === 401) {
      const message401 = getApiErrorMessage(401, backendMessage);
      toast.error(message401);
      handleSessionExpiration();
      throw new Error(message401, { cause: error });
    }

    const friendly = status
      ? getApiErrorMessage(status, backendMessage)
      : getNetworkErrorMessage();
    toast.error(friendly);
    throw new Error(friendly, { cause: error });
  }
};

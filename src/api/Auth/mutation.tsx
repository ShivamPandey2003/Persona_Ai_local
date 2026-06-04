import { apiRequest } from "@/services/apiService";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";

type LoginRes = {
    header: ResponseHeader;
    response:{
        token: string
        firstName: string
        lastName:string
    }
}

type LoginPayload = {
    email: string;
    password: string
}

export const Login = () => {
  const navigate = useNavigate()
  const login = useMutation<LoginRes,Record<string, any>, LoginPayload>({
    mutationKey: ["Login"],
    mutationFn: async (payload) => {
      const res = await apiRequest("post", "users/login", payload);
      const data = await res;
      return data.response;
    },
    onSuccess:(data)=>{
        localStorage.setItem("user", btoa(JSON.stringify(data.response)))
        navigate('/dashboard')
    }
  });

  return login
};

type LogoutPayload = {
  token: string;
}

type LogoutRes = {
  header: ResponseHeader;
  response: {
    message: string;
  }
}

export const Logout = () => {
  const navigate = useNavigate()
  const logout = useMutation<LogoutRes, Record<string, any>, void>({
    mutationKey: ["Logout"],
    mutationFn: async () => {
      const userStr = localStorage.getItem("user");
      const userData = userStr ? JSON.parse(atob(userStr)) : null;
      const token = userData?.token || "";
      
      const payload: LogoutPayload = { token };
      const res = await apiRequest("post", "users/logout", payload);
      const data = await res;
      return data.response;
    },
    onSuccess: () => {
      localStorage.clear();
      navigate('/')
    }
  });

  return logout;
};
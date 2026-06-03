import { Logo } from "@/assets";
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Brain,
} from "lucide-react";
import { useState, type MouseEvent } from "react";
import { useNavigate } from "react-router";
// import Users from "@/data/DummyUser.json";
// import { toast } from "sonner";
import { Login } from "@/api/Auth/mutation";
import { aesEncrypt } from "@/lib/encryption&decryption";

export default function PersonaAILoginPage() {
  const [userCred, setUserCred] = useState<{ email: string; password: string }>(
    {
      email: "",
      password: "",
    },
  );
  const {mutate, isPending, error, data} = Login();

  const navigate = useNavigate();

  const OnSubmit = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    const payload = {
      email: aesEncrypt(userCred.email),
      password: aesEncrypt(userCred.password)
    }

    mutate(payload)
  };

  console.log(data)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eef1ff] via-[#f8f9ff] to-[#e8ecff] font-sans p-4 md:p-6 flex items-center justify-center">
      <div className="w-full max-w-7xl bg-white rounded-[36px] shadow-[0_20px_80px_rgba(99,56,246,0.08)] overflow-hidden border border-white/60 backdrop-blur-xl grid grid-cols-1 lg:grid-cols-2">
        {/* LEFT SECTION */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#5f6fff] to-[#7b89ff] p-10 md:p-8 flex flex-col justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.35),transparent_40%)]" />

          {/* HEADER */}
          {/* <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white shadow-lg">
              <Sparkles size={20} />
            </div>
            <Logo size={55} />

            <div>
              <h1 className="text-lg font-semibold tracking-wide text-white">
                PERSONA-AI
              </h1>

              <p className="text-sm text-white/70">
                Strategic Intelligence Platform
              </p>
            </div>
          </div> */}

          {/* HERO CONTENT */}
          <div className="relative z-10">
            {/* <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white mb-10">
              <Brain size={32} />
            </div> */}

            <h2 className="text-5xl md:text-6xl font-semibold leading-[1.1] tracking-[-2px] text-white max-w-xl">
              Multi-Persona AI
              <br />
              for Strategic
              <br />
              Future Planning
            </h2>

            <p className="text-white/80 text-lg leading-8 mt-8 max-w-xl">
              Leverage historical data to generate expert AI personas. Engage in
              collaborative discussions and gain diverse perspectives for future
              predictions and strategic decision making.
            </p>

            {/* FEATURE CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-12">
              <div className="bg-white/15 backdrop-blur-xl border border-white/20 rounded-[28px] p-6">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white mb-5">
                  <ShieldCheck size={22} />
                </div>

                <h3 className="text-white text-xl font-semibold">
                  Enterprise Grade
                </h3>

                <p className="text-white/70 leading-7 mt-3">
                  Secure and explainable AI insights built for strategic teams.
                </p>
              </div>

              <div className="bg-white/15 backdrop-blur-xl border border-white/20 rounded-[28px] p-6">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white mb-5">
                  <Brain size={22} />
                </div>

                <h3 className="text-white text-xl font-semibold">
                  AI Personas
                </h3>

                <p className="text-white/70 leading-7 mt-3">
                  Access specialized AI personas trained on historical data.
                </p>
              </div>
            </div>
          </div>

          {/* FLOATING CARDS */}
          {/* <div className="relative z-10 hidden lg:flex gap-5 mt-10">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="w-36 h-44 bg-white/15 backdrop-blur-2xl rounded-[28px] border border-white/20 p-4 shadow-xl rotate-[-4deg]"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/20 mb-4" />

                <div className="h-3 bg-white/60 rounded-full w-20 mb-2" />

                <div className="h-3 bg-white/40 rounded-full w-16 mb-3" />

                <div className="h-9 rounded-2xl bg-white/20" />
              </div>
            ))}
          </div> */}
        </div>

        {/* RIGHT SECTION */}
        <div className="flex justify-center p-8 md:p-8 bg-[#FCFCFF]">
          <div className="w-full max-w-md">
            {/* LOGIN CARD */}
            <div className="rounded-[32px] bg-white border border-[#F1F1F1] shadow-[0_20px_60px_rgba(99,56,246,0.08)] p-8 md:p-10">
              {/* TITLE */}
              <div className="mb-10">
                {/* <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6338F6] to-[#8B5CF6] flex items-center justify-center text-white shadow-lg shadow-[#6338F6]/20 mb-6">
                  <Sparkles size={24} />
                </div> */}
                <div className="flex items-center gap-2">
                  <Logo size={55} />
                  <span className="text-lg font-semibold tracking-wide">
                    PERSONA-AI
                  </span>
                </div>

                <h3 className="text-4xl font-semibold text-[#111827] tracking-[-1px]">
                  Welcome Back
                </h3>

                <p className="text-[#6B7280] text-lg leading-8 mt-4">
                  Sign in to unlock intelligent insights and future-ready
                  strategic decisions.
                </p>
              </div>

              {/* FORM */}
              <div className="space-y-6">
                {/* EMAIL */}
                <div>
                  <label className="text-sm font-medium text-[#374151] block mb-3">
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                    />

                    <input
                      value={userCred.email}
                      onChange={(e) =>
                        setUserCred((pre) => ({
                          ...pre,
                          email: e.target.value,
                        }))
                      }
                      type="email"
                      placeholder="Enter your email"
                      className="w-full h-14 rounded-2xl bg-[#F8F9FB] border border-[#ECECEC] pl-14 pr-5 outline-none focus:border-[#6338F6] transition-all"
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div>
                  <label className="text-sm font-medium text-[#374151] block mb-3">
                    Password
                  </label>

                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                    />

                    <input
                      value={userCred.password}
                      onChange={(e) =>
                        setUserCred((pre) => ({
                          ...pre,
                          password: e.target.value,
                        }))
                      }
                      type="password"
                      placeholder="Enter your password"
                      className="w-full h-14 rounded-2xl bg-[#F8F9FB] border border-[#ECECEC] pl-14 pr-5 outline-none focus:border-[#6338F6] transition-all"
                    />
                  </div>
                </div>

                {/* OPTIONS */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-3 text-[#6B7280]">
                    <input
                      type="checkbox"
                      className="rounded border-[#D1D5DB]"
                    />
                    Remember me
                  </label>

                  <button className="text-[#6338F6] font-medium hover:opacity-80 transition-all">
                    Forgot Password?
                  </button>
                </div>

                {/* LOGIN BUTTON */}
                <button onClick={OnSubmit} className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#6338F6] to-[#8B5CF6] text-white font-medium shadow-[0_15px_35px_rgba(99,56,246,0.35)] hover:scale-[1.01] transition-all duration-300">
                  <span className="flex items-center justify-center gap-2">
                    Sign In
                    <ArrowRight size={18} />
                  </span>
                </button>

                {/* DIVIDER */}
                {/* <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#ECECEC]" />
                  </div>

                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-sm text-[#9CA3AF]">
                      OR CONTINUE WITH
                    </span>
                  </div>
                </div> */}

                {/* GOOGLE BUTTON */}
                {/* <button
                  disabled
                  className="w-full h-14 rounded-2xl bg-white disabled:bg-white/30 border disabled:cursor-not-allowed border-[#ECECEC] hover:bg-[#F9FAFB] transition-all font-medium text-[#111827] shadow-sm"
                >
                  Continue with Google
                </button> */}
              </div>

              {/* FOOTER */}
              {/* <div className="mt-10 text-center">
                <p className="text-[#6B7280]">
                  Don’t have an account?{" "}
                  <button className="text-[#6338F6] font-semibold hover:opacity-80 transition-all">
                    Create Account
                  </button>
                </p>
              </div> */}
            </div>

            {/* DISCLAIMER */}
            {/* <p className="text-center text-sm text-[#9CA3AF] leading-6 mt-4 px-4">
              AI predictions are for informational purposes only.
            </p> */}
          </div>
        </div>
      </div>
    </div>
  );
}

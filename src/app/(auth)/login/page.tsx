"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/cognito";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn({ email, password });

      // Store tokens temporarily to make API call
      useAuthStore.setState({ accessToken: result.accessToken });

      // Get user info from API
      let user = await api.getMe();

      // emailまたはnameが空の場合、IDトークンから情報を取得して同期
      // (Cognito Access Tokenにはemail/nameが含まれないため)
      const needsSync = !user.email || user.email === "" || user.name === "User";
      if (needsSync) {
        // IDトークンをデコードしてname/emailを取得
        const idTokenParts = result.idToken.split(".");
        const idTokenPayload = idTokenParts[1] ? JSON.parse(atob(idTokenParts[1])) : {};
        const nameFromToken = idTokenPayload.name as string | undefined;

        const updateData: { email?: string; name?: string } = {};
        if (!user.email || user.email === "") {
          updateData.email = email;
        }
        if (user.name === "User" && nameFromToken) {
          updateData.name = nameFromToken;
        }

        if (Object.keys(updateData).length > 0) {
          const updated = await api.updateProfile(updateData);
          user = {
            ...user,
            name: updated.name,
            email: updated.email,
          };
        }
      }

      setAuth(user, result.accessToken, result.refreshToken);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow">
        <div className="text-center">
          <h1 className="text-3xl font-bold">GhostPM</h1>
          <p className="mt-2 text-gray-600">アカウントにログイン</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>

          <p className="text-center text-sm text-gray-600">
            アカウントをお持ちでない方は{" "}
            <Link href="/signup" className="text-blue-600 hover:underline">
              新規登録
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

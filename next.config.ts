import type { NextConfig } from "next";

const securityHeaders = [
  // クリックジャッキング防止（他サイトにiframeで埋め込まれるのを防ぐ）
  { key: "X-Frame-Options", value: "DENY" },
  // MIMEスニッフィング防止
  { key: "X-Content-Type-Options", value: "nosniff" },
  // XSS攻撃防止
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // HTTPSを強制（本番環境）
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // リファラー情報を制限（URLに個人情報が含まれる場合の漏洩防止）
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // カメラ・マイク等へのアクセスを制限
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // コンテンツセキュリティポリシー（XSS・インジェクション防止）
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://*.supabase.co https://syounannkikaku.pinoko.jp",
      "connect-src 'self' https://*.supabase.co https://api.stripe.com wss://*.supabase.co",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "font-src 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  // 本番ビルドでconsole.logを削除（情報漏洩防止）
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;

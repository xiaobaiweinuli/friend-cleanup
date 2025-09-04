// 全局类型声明文件，用于Cloudflare Workers环境

declare global {
  // WebSocketPair 类型定义
  interface WebSocketPair {
    0: WebSocket;
    1: WebSocket;
  }

  // 扩展 globalThis 以包含 Cloudflare Workers 特有的API
  interface Window {
    WebSocketPair: new () => WebSocketPair;
    crypto: Crypto;
  }

  // 扩展 globalThis 以支持 Cloudflare Workers API
  interface globalThis {
    WebSocketPair: new () => WebSocketPair;
  }

  // 扩展 Process 接口（Cloudflare Workers 环境中process对象通常有限）
  interface Process {
    env: Record<string, string | undefined>;
    exit(code?: number): never;
    versions?: Record<string, string>;
    platform?: string;
  }

  // 全局变量声明，用于在Cloudflare Workers中模拟Node.js环境的process对象
  var process: Process;

  // 为字符串添加可能缺少的属性
  interface String {
    isEscaped?: boolean;
    callbacks?: Record<string, Function>;
  }

  // 扩展 Request 对象
  interface Request {
    cf?: {
      country?: string;
      city?: string;
      region?: string;
      colo?: string;
      latitude?: string;
      longitude?: string;
      timezone?: string;
      asOrganization?: string;
    };
  }
}

export {}
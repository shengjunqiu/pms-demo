import { App } from 'antd';
import { useCallback } from 'react';

/** useBusinessAction 的配置项。 */
export interface UseBusinessActionOptions {
  /** 动作执行成功后的 message.success 文案，缺省为「办理已记录」。 */
  successMessage?: string;
}

/**
 * 统一的业务动作执行器：
 * - 先执行可选的 guard 准入校验（如 canDo 权限判断），不通过时静默中断；
 * - 再执行 fn（通常内部调用 dispatch 提交业务动作）；
 * - 成功后以 message.success 提示 successMessage，异常时以 message.error 提示异常信息。
 * 返回 fn 的返回值；被 guard 拦截或执行异常时返回 false。
 */
export type BusinessActionRunner = <R>(fn: () => R, guard?: () => boolean) => R | false;

/**
 * 页面级 run() 动作骨架的公共收敛（纯反馈骨架，不含业务规则）：
 * try { 执行动作; message.success(成功文案); return 动作结果 }
 * catch (e) { message.error(e.message); return false }
 */
export function useBusinessAction(options: UseBusinessActionOptions = {}): BusinessActionRunner {
  const { successMessage = '办理已记录' } = options;
  const { message } = App.useApp();
  return useCallback<BusinessActionRunner>(
    (fn, guard) => {
      if (guard && !guard()) return false;
      try {
        const result = fn();
        message.success(successMessage);
        return result;
      } catch (e) {
        message.error((e as Error).message);
        return false;
      }
    },
    [message, successMessage],
  );
}

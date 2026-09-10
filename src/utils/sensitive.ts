/** Mask explicit margin facts in descriptive UI text without rewriting source records. */
export function marginReason(text: string, allowed: boolean) {
  return allowed ? text : text.split('；').map((part) => /毛利|收益|利润/.test(part) ? '毛利相关规则命中（具体数值已隐藏）' : part).join('；');
}

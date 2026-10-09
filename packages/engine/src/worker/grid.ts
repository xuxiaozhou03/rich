/**
 * 参数网格。当前为串行执行；后续可把 run 拆到 worker_threads，
 * 届时 worker 需要按 strategyId 自行 import 策略（函数无法跨线程传递）。
 */

/** 笛卡尔积：{ a: [1,2], b: ['x'] } → [{a:1,b:'x'},{a:2,b:'x'}]。 */
export function cartesian(grid: Record<string, unknown[]>): Record<string, unknown>[] {
  let combos: Record<string, unknown>[] = [{}];
  for (const [key, values] of Object.entries(grid)) {
    const next: Record<string, unknown>[] = [];
    for (const combo of combos) {
      for (const value of values) {
        next.push({ ...combo, [key]: value });
      }
    }
    combos = next;
  }
  return combos;
}

export interface GridResult<T> {
  params: Record<string, unknown>;
  result: T;
}

/** 对每组参数顺序执行 run。 */
export function runGrid<T>(
  grid: Record<string, unknown[]>,
  run: (params: Record<string, unknown>) => T,
): GridResult<T>[] {
  return cartesian(grid).map((params) => ({ params, result: run(params) }));
}

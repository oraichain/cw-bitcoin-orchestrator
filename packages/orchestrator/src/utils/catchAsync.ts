import { NextFunction, Request, Response } from 'express';
import { setTimeout } from 'timers/promises';
import { Logger } from 'winston';

export const catchAsync = (func: any) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await func(req, res, next);
  } catch (err) {
    next(err);
  } finally {
    /* empty */
  }
};

export async function retry<T>(fn: (...params: any[]) => Promise<T>, retries: number, delay: number, ...params: any[]): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn(...params);
    } catch (e) {
      if (i === retries - 1) {
        throw e;
      }
      await setTimeout(delay);
      return await fn(...params);
    }
  }
}

export async function trackExecutionTime(fn: Function, fnName: string, logger: Logger) {
  const start = Date.now();
  const result = await fn();
  const end = Date.now();
  logger.info(`Execution time on function ${fnName}: ${end - start}ms`);
  return result;
}

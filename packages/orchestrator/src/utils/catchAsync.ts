import { NextFunction, Request, Response } from "express";
import { setTimeout } from "timers/promises";

export const catchAsync =
  (func: any) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      await func(req, res, next);
    } catch (err) {
      next(err);
    } finally {
    }
  };

export async function retry<T>(
  fn: (...params: any[]) => Promise<T>,
  retries: number,
  delay: number,
  ...params: any[]
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn(...params);
    } catch (e) {
      if (i === retries - 1) {
        throw e;
      }
      await setTimeout(delay);
    }
  }
}

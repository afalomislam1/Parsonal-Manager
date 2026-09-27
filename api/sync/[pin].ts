import type { Request, Response } from 'express';
import handler from '../sync';

export default async function pinHandler(req: Request, res: Response) {
  return handler(req, res);
}

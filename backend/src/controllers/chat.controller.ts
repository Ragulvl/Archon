import { Request, Response, NextFunction } from 'express';
import * as chatService from '../services/chat/chat.service';
import { orchestrate } from '../services/ai/orchestrator.service';

export async function createSession(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await chatService.createSession(req.body);
    res.status(201).json({ success: true, data: session });
  } catch (err) { next(err); }
}

export async function getSession(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await chatService.getSession(req.params.id);
    res.json({ success: true, data: session });
  } catch (err) { next(err); }
}

export async function getHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const messages = await chatService.getMessageHistory(req.params.sessionId);
    res.json({ success: true, data: messages });
  } catch (err) { next(err); }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const { sessionId, projectId, content } = req.body as {
      sessionId: string; projectId: string; content: string;
    };

    if (!sessionId || !projectId || !content?.trim()) {
      return res.status(400).json({ success: false, error: 'sessionId, projectId, and content are required' });
    }

    // Auto-title on first message
    const history = await chatService.getMessageHistory(sessionId, 2);
    if (history.length === 0) {
      chatService.autoTitleSession(sessionId, content);
    }

    // Run orchestrator (async — client gets updates via WebSocket)
    const result = await orchestrate({
      sessionId,
      projectId,
      userMessage: content.trim(),
      userId: req.auth.userId,
    });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

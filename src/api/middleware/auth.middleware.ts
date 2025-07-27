import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './error.middleware';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        specialty?: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

export function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!token) {
      throw new ApiError(401, 'No authentication token provided');
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Attach user to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      specialty: decoded.specialty,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(401, 'Invalid authentication token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new ApiError(401, 'Authentication token expired'));
    } else {
      next(error);
    }
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, 'Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ApiError(403, 'Insufficient permissions'));
      return;
    }

    next();
  };
}

// Temporary function to generate tokens for development
export function generateToken(user: { id: string; role: string; specialty?: string }): string {
  return jwt.sign(user, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}
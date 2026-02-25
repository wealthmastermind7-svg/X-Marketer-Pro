import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.SESSION_SECRET || "xmarketer-fallback-secret";
const TOKEN_EXPIRY = "30d";

export interface AuthPayload {
  userId: number;
  email: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = payload;
  next();
}

export function registerAuthRoutes(app: any) {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, displayName } = req.body;

      if (!email || !password || !displayName) {
        return res.status(400).json({ error: "Email, password, and display name are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      if (existing.length > 0) {
        return res.status(409).json({ error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const [user] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          password: hashedPassword,
          displayName,
        })
        .returning();

      const token = generateToken({ userId: user.id, email: user.email });

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = generateToken({ userId: user.id, email: user.email });

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
        },
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/me", async (req: AuthRequest, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, payload.userId));
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        defaultContext: user.defaultContext,
      },
    });
  });
}

import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET;

export function verifyToken(req) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function requireAdmin(req) {
  const admin = verifyToken(req);
  if (!admin) {
    return {
      admin: null,
      response: NextResponse.json(
        { message: "Unauthorized. Please log in as an admin." },
        { status: 401 }
      ),
    };
  }

  return { admin, response: null };
}

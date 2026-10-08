import { CognitoJwtVerifier } from "aws-jwt-verify";
import { SimpleJwksCache } from "aws-jwt-verify/jwk";
import { SimpleFetcher } from "aws-jwt-verify/https";
import { Request, Response, NextFunction } from "express";

const jwksCache = new SimpleJwksCache({
  fetcher: new SimpleFetcher({
    defaultRequestOptions: {
      responseTimeout: 10000,
    },
  }),
});

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: "access",
  clientId: process.env.COGNITO_CLIENT_ID!,
}, { jwksCache });

export interface AuthRequest<
  Params extends Record<string, string> = Record<string, string>
> extends Request<Params> {
  user?: {
    sub: string;
    username?: string;
    role?: string;
    dbUserId?: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = header.substring(7);

    const payload = await verifier.verify(token);

    req.user = {
      sub: payload.sub,
      username: payload.username,
    };

    next();
  } catch (error) {
    console.error("JWT verification failed:", error);

    return res.status(401).json({
      message: "Invalid or expired authentication token",
    });
  }
}
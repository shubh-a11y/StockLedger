import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { loginRateLimit } from "../../middleware/rate-limit.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { login, logout, me } from "./auth.controller.js";
import { loginSchema } from "./auth.schemas.js";

export const authRouter = Router();

authRouter.post("/login", loginRateLimit, validate({ body: loginSchema }), asyncHandler(login));
authRouter.post("/logout", logout);
authRouter.get("/me", authenticate, me);

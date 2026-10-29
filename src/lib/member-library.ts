import { z } from "zod";

export const passTokenSchema = z.string().regex(/^[a-f0-9]{48}$/);
export const librarySessionSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const LIBRARY_SESSION_SECONDS = 2 * 60 * 60;
export const PENDING_PASS_KEY = "tml-pending-library-pass";
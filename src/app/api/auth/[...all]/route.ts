import { toNextJsHandler } from "better-auth/next-js";
import { obtenerAuth } from "@/lib/auth/servidor";

export const { GET, POST } = toNextJsHandler((request: Request) => obtenerAuth().handler(request));

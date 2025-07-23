import { Router } from "express";
import { Health } from "./Health";

const router = Router();

router.get("/health", Health);

export default router;

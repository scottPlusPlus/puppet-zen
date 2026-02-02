import { Router } from "express";
import allafricaRouter from "./allafrica";

const router = Router();

router.use("/allafrica", allafricaRouter);

export default router;

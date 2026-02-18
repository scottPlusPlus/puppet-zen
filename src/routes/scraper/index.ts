import { Router } from "express";
import allafricaRouter from "./allafrica";
import resnexusRouter from "./resnexus";

const router = Router();

router.use("/allafrica", allafricaRouter);
router.use("/resnexus", resnexusRouter);

export default router;

import express, { Request, Response } from "express";
import cors from "cors";
import meetpointRoutes from "./routes/meetpoint.routes";

const app = express();

app.use(cors());
app.use(express.json());

// health check
app.get("/", (_req: Request, res: Response) => {
  res.send("API is running");
});

// 🔴 THIS LINE WAS MISSING (VERY IMPORTANT)
app.use("/api", meetpointRoutes);

export default app;

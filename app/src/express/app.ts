import cors from "cors";
import express from "express";
import router from "./routes";

const app = express();

app.use(express.json());
if (process.env.NODE_ENV !== "production") app.use(cors());

app.use(router);

export { app as App };

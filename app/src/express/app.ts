import cors from "cors";
import express from "express";
import router from "./routes";
import { MiddlewareErrorGlobal } from "./middlewares/erro_global";

const app = express();

app.use(express.json());
if (process.env.NODE_ENV !== "production") app.use(cors());

app.use(router);
app.use(MiddlewareErrorGlobal);

export { app as App };

import { config } from "dotenv";
import { prisma } from "../libs/prisma";
import { App as app } from "./app";

config();

if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
}

prisma
  .$connect()
  .then(async () => {
    console.log("Database conectado com sucesso!");
    app.listen(process.env.PORT, () => {
      console.log("Servidor rodando na porta:", process.env.PORT);
    });
  })
  .catch((err) => {
    console.log("Error ao conectar com o prisma!");
    console.log(err);
  });

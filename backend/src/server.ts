import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "./generated/prisma/client";

const app = express();
const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json());

// GET /products - list all
app.get("/products", async (_req, res) => {
  const products = await prisma.product.findMany({ orderBy: { id: "asc" } });
  res.json(products);
});

// POST /products - create
app.post("/products", async (req, res) => {
  const { name, category, stock, price } = req.body;
  const product = await prisma.product.create({
    data: { name, category, stock: Number(stock), price: Number(price) },
  });
  res.status(201).json(product);
});

// PUT /products/:id - update
app.put("/products/:id", async (req, res) => {
  const { name, category, stock, price } = req.body;
  const product = await prisma.product.update({
    where: { id: Number(req.params.id) },
    data: { name, category, stock: Number(stock), price: Number(price) },
  });
  res.json(product);
});

// DELETE /products/:id - remove
app.delete("/products/:id", async (req, res) => {
  await prisma.product.delete({ where: { id: Number(req.params.id) } });
  res.status(204).send();
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Backend jalan di http://localhost:${PORT}`));

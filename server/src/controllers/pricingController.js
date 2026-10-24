
import mongoose from "mongoose";
import { Readable } from "node:stream";
import csv from "csv-parser";
import Pricing from "../models/Pricing.js";

function parseDate(value) {
  const input = String(value ?? "").trim();

  if (!input) return null;

  // The assignment's CSV date format is YYYY-MM-DD.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return null;
  }

  const date = new Date(`${input}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== input
    ? null
    : date;
}

function parseCsv(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];

    Readable.from(buffer)
      .pipe(
        csv({
          mapHeaders: ({ header }) =>
            header
              .replace(/^\uFEFF/, "")
              .trim()
              .toLowerCase()
              .replace(/\s+/g, ""),
        })
      )
      .on("data", (row) => rows.push(row))
      .on("error", reject)
      .on("end", () => resolve(rows));
  });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// POST /api/pricing/upload
export async function uploadPricing(req, res) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Please upload a CSV file using the 'file' field.",
    });
  }

  const rows = await parseCsv(req.file.buffer);

  if (rows.length === 0) {
    return res.status(400).json({
      success: false,
      message: "The CSV file has no data rows.",
    });
  }

  const validRecords = [];
  const errors = [];

  rows.forEach((row, index) => {
    const storeId = String(row.storeid ?? "").trim();
    const sku = String(row.sku ?? "").trim();
    const productName = String(row.productname ?? "").trim();
    const priceText = String(row.price ?? "").trim();
    const price = Number(priceText);
    const date = parseDate(row.date);

    const rowErrors = [];

    if (!storeId) rowErrors.push("Store ID is required");
    if (!sku) rowErrors.push("SKU is required");
    if (!productName) rowErrors.push("Product Name is required");

    if (
      !priceText ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      rowErrors.push("Price must be a valid non-negative number");
    }

    if (!date) {
      rowErrors.push("Date must use YYYY-MM-DD format");
    }

    if (rowErrors.length > 0) {
      errors.push({
        row: index + 2,
        errors: rowErrors,
      });
      return;
    }

    validRecords.push({
      storeId,
      sku,
      productName,
      price,
      date,
    });
  });

  // Reject the whole file if any row is invalid.
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "CSV validation failed. No records were saved.",
      invalidRowCount: errors.length,
      errors: errors.slice(0, 20),
    });
  }

  const operations = validRecords.map((record) => ({
    updateOne: {
      filter: {
        storeId: record.storeId,
        sku: record.sku,
        date: record.date,
      },
      update: {
        $set: {
          productName: record.productName,
          price: record.price,
        },
      },
      upsert: true,
    },
  }));

  const result = await Pricing.bulkWrite(operations, {
    ordered: false,
  });

  res.status(200).json({
    success: true,
    message: "Pricing feed processed successfully.",
    totalRows: rows.length,
    insertedCount: result.upsertedCount,
    updatedCount: result.modifiedCount,
  });
}

// GET /api/pricing
export async function getPricing(req, res) {
  const {
    storeId,
    sku,
    productName,
    dateFrom,
    dateTo,
    page = "1",
    limit = "20",
  } = req.query;

  const pageNumber = Number(page);
  const pageSize = Number(limit);

  if (
    !Number.isInteger(pageNumber) ||
    pageNumber < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "page must be positive; limit must be between 1 and 100.",
    });
  }

  const filter = {};

  if (storeId) filter.storeId = String(storeId).trim();
  if (sku) filter.sku = String(sku).trim();

  if (productName) {
    filter.productName = {
      $regex: escapeRegex(String(productName).trim()),
      $options: "i",
    };
  }

  if (dateFrom || dateTo) {
    const range = {};

    if (dateFrom) {
      const from = parseDate(dateFrom);
      if (!from) {
        return res.status(400).json({
          success: false,
          message: "dateFrom must use YYYY-MM-DD format.",
        });
      }
      range.$gte = from;
    }

    if (dateTo) {
      const to = parseDate(dateTo);
      if (!to) {
        return res.status(400).json({
          success: false,
          message: "dateTo must use YYYY-MM-DD format.",
        });
      }
      range.$lte = to;
    }

    if (range.$gte && range.$lte && range.$gte > range.$lte) {
      return res.status(400).json({
        success: false,
        message: "dateFrom must not be after dateTo.",
      });
    }

    filter.date = range;
  }

  const [records, total] = await Promise.all([
    Pricing.find(filter)
      .sort({ date: -1, storeId: 1, sku: 1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Pricing.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: records,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

// GET /api/pricing/:id
export async function getPricingById(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid pricing record ID.",
    });
  }

  const record = await Pricing.findById(req.params.id).lean();

  if (!record) {
    return res.status(404).json({
      success: false,
      message: "Pricing record not found.",
    });
  }

  res.json({ success: true, data: record });
}

// PUT /api/pricing/:id
export async function updatePricing(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid pricing record ID.",
    });
  }

  const allowedFields = ["productName", "price"];
  const updates = {};

  for (const field of allowedFields) {
    if (Object.hasOwn(req.body, field)) {
      updates[field] = req.body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Provide productName or price to update.",
    });
  }

  if (
    Object.hasOwn(updates, "productName") &&
    (typeof updates.productName !== "string" ||
      !updates.productName.trim())
  ) {
    return res.status(400).json({
      success: false,
      message: "productName must be a non-empty string.",
    });
  }

  if (
    Object.hasOwn(updates, "price") &&
    (typeof updates.price !== "number" ||
      !Number.isFinite(updates.price) ||
      updates.price < 0)
  ) {
    return res.status(400).json({
      success: false,
      message: "price must be a non-negative number.",
    });
  }

  if (updates.productName) {
    updates.productName = updates.productName.trim();
  }

  const record = await Pricing.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!record) {
    return res.status(404).json({
      success: false,
      message: "Pricing record not found.",
    });
  }

  res.json({
    success: true,
    message: "Pricing record updated successfully.",
    data: record,
  });
}

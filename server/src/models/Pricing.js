
import mongoose from "mongoose";

const pricingSchema = new mongoose.Schema(
  {
    storeId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

pricingSchema.index(
  { storeId: 1, sku: 1, date: 1 },
  { unique: true }
);

export default mongoose.model("Pricing", pricingSchema);

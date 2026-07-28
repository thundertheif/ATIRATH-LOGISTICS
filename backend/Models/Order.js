const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  from: String,
  to: String,
  weight: String,
  status: {
    type: String,
    default: "Booked"
  }
});

module.exports = mongoose.model("Order", orderSchema);
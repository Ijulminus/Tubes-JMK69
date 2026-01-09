// parcel-service/models/ParcelOrder.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const ParcelOrder = sequelize.define('ParcelOrder', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  bookingId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  flightCode: {
    type: DataTypes.STRING,
    allowNull: false
  },
  senderName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  senderAddress: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  receiverName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  receiverAddress: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  weight: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  dimensions: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'PENDING',
    allowNull: false
  },
  paymentStatus: {
    type: DataTypes.STRING,
    defaultValue: 'UNPAID',
    allowNull: false
  }
});

module.exports = ParcelOrder;


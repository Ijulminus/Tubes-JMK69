// onboard-service/models/OnboardOrder.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const OnboardOrder = sequelize.define('OnboardOrder', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  bookingId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  flightCode: {
    type: DataTypes.STRING,
    allowNull: false
  },
  items: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  totalPrice: {
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

module.exports = OnboardOrder;


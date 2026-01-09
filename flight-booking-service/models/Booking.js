// flight-booking-service/models/Booking.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Booking = sequelize.define('Booking', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  flightCode: {
    type: DataTypes.STRING,
    allowNull: false
  },
  flightId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  passengerName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  seatNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  numberOfSeats: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
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
  },
  paymentId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  externalBookingId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID booking dari kelompok lain untuk integrasi lintas kelompok'
  }
});

module.exports = Booking;


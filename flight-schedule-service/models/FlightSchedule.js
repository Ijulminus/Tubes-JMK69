// flight-schedule-service/models/FlightSchedule.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const FlightSchedule = sequelize.define('FlightSchedule', {
  flightCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  aircraftType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  departureLocation: {
    type: DataTypes.STRING,
    allowNull: false
  },
  destinationLocation: {
    type: DataTypes.STRING,
    allowNull: false
  },
  departureTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  arrivalTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  totalSeats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  availableSeats: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'ACTIVE',
    allowNull: false
  }
});

module.exports = FlightSchedule;


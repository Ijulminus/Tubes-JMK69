// parcel-service/db.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'parcel_db',
  process.env.DB_USER || 'user',
  process.env.DB_PASS || 'pass',
  {
    host: process.env.DB_HOST || 'parcel-db',
    dialect: 'postgres',
    logging: false,
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ Parcel Service: Terhubung ke PostgreSQL (${sequelize.config.database})`);
    await sequelize.sync({ alter: true });
  } catch (err) {
    console.error('❌ DB Connection Error:', err.message);
  }
};

module.exports = { sequelize, connectDB };


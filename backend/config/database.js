const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

if (process.env.DATABASE_URL) {
  // Railway provides a single DATABASE_URL connection string
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'mysql',
    logging: false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
      connectTimeout: 60000,
    },
    timezone: '+07:00',
  });
} else {
  // Fallback: individual env vars (local dev)
  sequelize = new Sequelize(
    process.env.DB_NAME || 'hrd_system',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
      dialectOptions: {
        ssl: process.env.NODE_ENV === 'production'
          ? { require: true, rejectUnauthorized: false }
          : false,
        connectTimeout: 60000,
      },
      timezone: '+07:00',
    }
  );
}

const connectDB = async () => {
  let attempts = 0;
  while (attempts < 5) {
    try {
      await sequelize.authenticate();
      console.log('✅ MySQL Database connected');
      return;
    } catch (error) {
      attempts++;
      console.error(`❌ DB attempt ${attempts}/5 failed: ${error.message}`);
      if (attempts >= 5) {
        // Do NOT process.exit - let server stay up so Railway doesn't restart loop
        console.error('⚠️  DB unavailable - server running without DB');
        return;
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  }
};

module.exports = { sequelize, connectDB };

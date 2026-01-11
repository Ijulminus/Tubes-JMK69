// flight-schedule-service/index.js
const { ApolloServer, gql } = require('apollo-server');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const { connectDB } = require('./db');
const FlightSchedule = require('./models/FlightSchedule');

connectDB();

const JWT_SECRET = process.env.JWT_SECRET || 'RAHASIA_NEGARA';
// Shared secret untuk integrasi partner/travel app (header: x-api-key)
const PARTNER_API_KEY = process.env.PARTNER_API_KEY || 'PARTNER_SECRET';

const typeDefs = gql`
  type FlightSchedule @key(fields: "id") {
    id: ID!
    flightCode: String!
    aircraftType: String!
    departureLocation: String!
    destinationLocation: String!
    departureTime: String!
    arrivalTime: String!
    price: Float!
    totalSeats: Int!
    availableSeats: Int!
    status: String!
  }

  extend type Query {
    flightSchedules(
      departureLocation: String
      destinationLocation: String
      departureDate: String
    ): [FlightSchedule]
    flightById(id: ID!): FlightSchedule
    flightByCode(flightCode: String!): FlightSchedule
  }

  extend type Mutation {
    createFlightSchedule(
      flightCode: String!
      aircraftType: String!
      departureLocation: String!
      destinationLocation: String!
      departureTime: String!
      arrivalTime: String!
      price: Float!
      totalSeats: Int!
    ): FlightSchedule

    updateFlightSchedule(
      id: ID!
      departureTime: String
      arrivalTime: String
      price: Float
      totalSeats: Int
      status: String
    ): FlightSchedule

    decreaseAvailableSeats(flightCode: String!, seats: Int!): FlightSchedule
    increaseAvailableSeats(flightCode: String!, seats: Int!): FlightSchedule
  }
`;

function isPartner(context) {
  return !!context && !!context.apiKey && context.apiKey === PARTNER_API_KEY;
}

function requireJwtAuth(context) {
  if (context.isAuthenticated !== true) throw new Error('Unauthorized');
}

// Untuk query schedule (dipakai user + dipakai travel-app) dan seat-adjust (dipanggil booking-service)
function requireJwtOrPartner(context) {
  if (context.isAuthenticated === true) return;
  if (isPartner(context)) return;
  throw new Error('Unauthorized');
}

const resolvers = {
  Query: {
    flightSchedules: async (_, { departureLocation, destinationLocation, departureDate }, context) => {
      // Query schedule dibuat public agar bisa diakses oleh Travel-app tanpa JWT.
      // (Untuk akses terproteksi dari Apollo, tetap bisa kirim JWT.)

      const where = {};

      if (departureLocation) where.departureLocation = departureLocation;
      if (destinationLocation) where.destinationLocation = destinationLocation;

      if (departureDate) {
        const startDate = new Date(departureDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(departureDate);
        endDate.setHours(23, 59, 59, 999);

        where.departureTime = { [Op.gte]: startDate, [Op.lte]: endDate };
      }

      return await FlightSchedule.findAll({ where });
    },
    flightById: async (_, { id }, context) => {
      // Public

      const flight = await FlightSchedule.findByPk(id);
      if (!flight) throw new Error('Flight tidak ditemukan');
      return flight;
    },
    flightByCode: async (_, { flightCode }, context) => {
      // Public

      const flight = await FlightSchedule.findOne({ where: { flightCode } });
      if (!flight) throw new Error('Flight tidak ditemukan');
      return flight;
    }
  },
  Mutation: {
    createFlightSchedule: async (_, args, context) => {
      requireJwtAuth(context);

      const flight = await FlightSchedule.create({ ...args, availableSeats: args.totalSeats });
      return flight;
    },
    updateFlightSchedule: async (_, { id, ...updates }, context) => {
      requireJwtAuth(context);

      const flight = await FlightSchedule.findByPk(id);
      if (!flight) throw new Error('Flight tidak ditemukan');

      await flight.update(updates);
      return flight;
    },
    decreaseAvailableSeats: async (_, { flightCode, seats }, context) => {
      requireJwtOrPartner(context);

      const flight = await FlightSchedule.findOne({ where: { flightCode } });
      if (!flight) throw new Error('Flight tidak ditemukan');

      if (flight.availableSeats < seats) throw new Error('Kursi tidak cukup');

      flight.availableSeats -= seats;
      await flight.save();
      return flight;
    },
    increaseAvailableSeats: async (_, { flightCode, seats }, context) => {
      requireJwtOrPartner(context);

      const flight = await FlightSchedule.findOne({ where: { flightCode } });
      if (!flight) throw new Error('Flight tidak ditemukan');

      flight.availableSeats = Math.min(flight.availableSeats + seats, flight.totalSeats);
      await flight.save();
      return flight;
    }
  }
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  context: ({ req }) => {
    const authorization = req.headers.authorization || '';
    const apiKey = req.headers['x-api-key'];

    if (!authorization) {
      return { userId: null, userRole: null, isAuthenticated: false, authorization: '', apiKey };
    }

    try {
      const token = authorization.replace(/^Bearer\s+/i, '');
      const decoded = jwt.verify(token, JWT_SECRET);

      return {
        userId: decoded.id ?? decoded.userId,
        userRole: decoded.role,
        isAuthenticated: true,
        authorization: `Bearer ${token}`,
        apiKey
      };
    } catch (e) {
      return { userId: null, userRole: null, isAuthenticated: false, authorization, apiKey };
    }
  }
});

server.listen({ port: 4002, host: '0.0.0.0' }).then(({ url }) => {
  console.log(`🚀 Flight Schedule Service ready at ${url}`);
});

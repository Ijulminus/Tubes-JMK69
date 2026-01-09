// flight-schedule-service/index.js
const { ApolloServer, gql } = require('apollo-server');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { Op } = require('sequelize');
const { connectDB } = require('./db');
const FlightSchedule = require('./models/FlightSchedule');

connectDB();

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

const resolvers = {
  Query: {
    flightSchedules: async (_, { departureLocation, destinationLocation, departureDate }) => {
      const where = {};
      
      if (departureLocation) {
        where.departureLocation = departureLocation;
      }
      
      if (destinationLocation) {
        where.destinationLocation = destinationLocation;
      }
      
      if (departureDate) {
        const startDate = new Date(departureDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(departureDate);
        endDate.setHours(23, 59, 59, 999);
        
        where.departureTime = {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        };
      }
      
      return await FlightSchedule.findAll({ where });
    },
    flightById: async (_, { id }) => {
      const flight = await FlightSchedule.findByPk(id);
      if (!flight) throw new Error('Flight tidak ditemukan');
      return flight;
    },
    flightByCode: async (_, { flightCode }) => {
      const flight = await FlightSchedule.findOne({ where: { flightCode } });
      if (!flight) throw new Error('Flight tidak ditemukan');
      return flight;
    }
  },
  Mutation: {
    createFlightSchedule: async (_, args) => {
      const flight = await FlightSchedule.create({
        ...args,
        availableSeats: args.totalSeats
      });
      return flight;
    },
    updateFlightSchedule: async (_, { id, ...updates }) => {
      const flight = await FlightSchedule.findByPk(id);
      if (!flight) throw new Error('Flight tidak ditemukan');
      
      await flight.update(updates);
      return flight;
    },
    decreaseAvailableSeats: async (_, { flightCode, seats }) => {
      const flight = await FlightSchedule.findOne({ where: { flightCode } });
      if (!flight) throw new Error('Flight tidak ditemukan');
      
      if (flight.availableSeats < seats) {
        throw new Error('Kursi tidak cukup');
      }
      
      flight.availableSeats -= seats;
      await flight.save();
      return flight;
    },
    increaseAvailableSeats: async (_, { flightCode, seats }) => {
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
    return { userId: req.headers['user-id'] };
  }
});

server.listen({ port: 4002 }).then(({ url }) => {
  console.log(`🚀 Flight Schedule Service ready at ${url}`);
});


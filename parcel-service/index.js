// parcel-service/index.js
const { ApolloServer, gql } = require('apollo-server');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { connectDB } = require('./db');
const ParcelOrder = require('./models/ParcelOrder');

connectDB();

const JWT_SECRET = process.env.JWT_SECRET || 'RAHASIA_NEGARA';
const FLIGHT_BOOKING_SERVICE = process.env.FLIGHT_BOOKING_SERVICE || 'http://flight-booking-service:4003';

const typeDefs = gql`
  type ParcelOrder @key(fields: "id") {
    id: ID!
    userId: Int!
    bookingId: Int
    flightCode: String!
    senderName: String!
    senderAddress: String!
    receiverName: String!
    receiverAddress: String!
    weight: Float!
    dimensions: String
    cost: Float!
    status: String!
    paymentStatus: String!
  }

  extend type Query {
    myParcelOrders: [ParcelOrder]
    parcelOrderById(id: ID!): ParcelOrder
  }

  extend type Mutation {
    createParcelOrder(
      bookingId: Int
      flightCode: String!
      senderName: String!
      senderAddress: String!
      receiverName: String!
      receiverAddress: String!
      weight: Float!
      dimensions: String
    ): ParcelOrder

    updateParcelOrderStatus(id: ID!, status: String!): ParcelOrder
  }
`;

function requireAuth(context) {
  if (context.isAuthenticated !== true) throw new Error('Unauthorized');
}

// Helper function untuk validasi booking
async function validateBooking(bookingId, authorization) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authorization) headers['authorization'] = authorization;

    const response = await axios.post(
      `${FLIGHT_BOOKING_SERVICE}`,
      {
        query: `
          query {
            bookingById(id: "${bookingId}") {
              id
              userId
              flightCode
              status
            }
          }
        `
      },
      { headers }
    );

    if (response.data.errors) throw new Error(response.data.errors[0].message);
    if (!response.data.data?.bookingById) throw new Error('Booking tidak ditemukan');

    return response.data.data.bookingById;
  } catch (error) {
    if (error.response?.data?.errors?.length) {
      throw new Error(`Booking tidak valid: ${error.response.data.errors[0].message}`);
    }
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`Tidak dapat terhubung ke flight booking service: ${FLIGHT_BOOKING_SERVICE}`);
    }
    throw new Error(`Booking tidak valid: ${error.message}`);
  }
}

// Fungsi untuk menghitung biaya pengiriman
function calculateCost(weight) {
  const baseCostPerKg = 50000;
  const minCost = 100000;

  const calculatedCost = parseFloat(weight) * baseCostPerKg;
  return Math.max(calculatedCost, minCost);
}

const resolvers = {
  Query: {
    myParcelOrders: async (_, __, context) => {
      requireAuth(context);
      return await ParcelOrder.findAll({ where: { userId: context.userId } });
    },

    parcelOrderById: async (_, { id }, context) => {
      requireAuth(context);

      const order = await ParcelOrder.findByPk(id);
      if (!order || order.userId !== context.userId) throw new Error('Parcel order tidak ditemukan');
      return order;
    }
  },

  Mutation: {
    createParcelOrder: async (_, args, context) => {
      requireAuth(context);

      // Jika ada bookingId, validasi booking
      if (args.bookingId) {
        const booking = await validateBooking(args.bookingId, context.authorization);
        if (booking.status !== 'CONFIRMED') throw new Error('Booking harus dalam status CONFIRMED');
        args.flightCode = booking.flightCode;
      }

      const cost = calculateCost(args.weight);

      const parcelOrder = await ParcelOrder.create({
        ...args,
        userId: context.userId,
        cost,
        status: 'PENDING',
        paymentStatus: 'UNPAID'
      });

      return parcelOrder;
    },

    updateParcelOrderStatus: async (_, { id, status }, context) => {
      requireAuth(context);

      const order = await ParcelOrder.findByPk(id);
      if (!order || order.userId !== context.userId) throw new Error('Parcel order tidak ditemukan');

      order.status = status;
      await order.save();
      return order;
    }
  }
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  context: ({ req }) => {
    const authorization = req.headers.authorization || '';
    if (!authorization) return { userId: null, userRole: null, isAuthenticated: false, authorization: '' };

    try {
      const token = authorization.replace(/^Bearer\s+/i, '');
      const decoded = jwt.verify(token, JWT_SECRET);
      return {
        userId: decoded.id ?? decoded.userId,
        userRole: decoded.role,
        isAuthenticated: true,
        authorization: `Bearer ${token}`
      };
    } catch (e) {
      return { userId: null, userRole: null, isAuthenticated: false, authorization };
    }
  }
});

server.listen({ port: 4004, host: '0.0.0.0' }).then(({ url }) => {
  console.log(`🚀 Parcel Service ready at ${url}`);
});

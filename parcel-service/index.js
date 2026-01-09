// parcel-service/index.js
const { ApolloServer, gql } = require('apollo-server');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const axios = require('axios');
const { connectDB } = require('./db');
const ParcelOrder = require('./models/ParcelOrder');

connectDB();

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

// Helper function untuk validasi booking
async function validateBooking(bookingId, userId) {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'user-id': userId.toString()
    };
    
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
    
    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }
    
    if (!response.data.data || !response.data.data.bookingById) {
      throw new Error('Booking tidak ditemukan');
    }
    
    return response.data.data.bookingById;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.errors) {
      throw new Error(`Booking tidak valid: ${error.response.data.errors[0].message}`);
    }
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`Tidak dapat terhubung ke flight booking service: ${FLIGHT_BOOKING_SERVICE}`);
    }
    throw new Error(`Booking tidak valid: ${error.message}`);
  }
}

// Fungsi untuk menghitung biaya pengiriman
function calculateCost(weight, flightCode) {
  // Base cost per kg
  const baseCostPerKg = 50000;
  // Minimum cost
  const minCost = 100000;
  
  const calculatedCost = parseFloat(weight) * baseCostPerKg;
  return Math.max(calculatedCost, minCost);
}

const resolvers = {
  Query: {
    myParcelOrders: async (_, __, context) => {
      if (!context.userId) throw new Error('Unauthorized');
      return await ParcelOrder.findAll({ where: { userId: context.userId } });
    },
    parcelOrderById: async (_, { id }, context) => {
      if (!context.userId) throw new Error('Unauthorized');
      const order = await ParcelOrder.findByPk(id);
      if (!order || order.userId !== context.userId) {
        throw new Error('Parcel order tidak ditemukan');
      }
      return order;
    }
  },
  Mutation: {
    createParcelOrder: async (_, args, context) => {
      if (!context.userId) throw new Error('Anda harus login!');
      
      // Jika ada bookingId, validasi booking
      if (args.bookingId) {
        const booking = await validateBooking(args.bookingId, context.userId);
        if (booking.status !== 'CONFIRMED') {
          throw new Error('Booking harus dalam status CONFIRMED');
        }
        args.flightCode = booking.flightCode;
      }
      
      // Hitung biaya
      const cost = calculateCost(args.weight, args.flightCode);
      
      // Buat parcel order
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
      if (!context.userId) throw new Error('Unauthorized');
      
      const order = await ParcelOrder.findByPk(id);
      if (!order || order.userId !== context.userId) {
        throw new Error('Parcel order tidak ditemukan');
      }
      
      order.status = status;
      await order.save();
      
      return order;
    }
  }
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  context: ({ req }) => {
    return { userId: req.headers['user-id'] };
  }
});

server.listen({ port: 4004 }).then(({ url }) => {
  console.log(`🚀 Parcel Service ready at ${url}`);
});


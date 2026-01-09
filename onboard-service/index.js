// onboard-service/index.js
const { ApolloServer, gql } = require('apollo-server');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const axios = require('axios');
const { connectDB } = require('./db');
const OnboardOrder = require('./models/OnboardOrder');
const MenuItem = require('./models/MenuItem');

connectDB();

const FLIGHT_BOOKING_SERVICE = process.env.FLIGHT_BOOKING_SERVICE || 'http://flight-booking-service:4003';

const typeDefs = gql`
  type MenuItem @key(fields: "id") {
    id: ID!
    name: String!
    description: String
    category: String!
    price: Float!
    available: Boolean!
  }

  type OnboardOrder @key(fields: "id") {
    id: ID!
    userId: Int!
    bookingId: Int!
    flightCode: String!
    items: String!
    totalPrice: Float!
    status: String!
    paymentStatus: String!
  }

  input OrderItemInput {
    menuItemId: ID!
    quantity: Int!
  }

  extend type Query {
    menuItems(category: String): [MenuItem]
    menuItemById(id: ID!): MenuItem
    myOnboardOrders: [OnboardOrder]
    onboardOrderById(id: ID!): OnboardOrder
  }

  extend type Mutation {
    createMenuItem(
      name: String!
      description: String
      category: String!
      price: Float!
    ): MenuItem
    
    createOnboardOrder(
      bookingId: Int!
      items: [OrderItemInput!]!
    ): OnboardOrder
    
    updateOnboardOrderStatus(id: ID!, status: String!): OnboardOrder
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

const resolvers = {
  Query: {
    menuItems: async (_, { category }) => {
      const where = {};
      if (category) {
        where.category = category;
      }
      where.available = true;
      return await MenuItem.findAll({ where });
    },
    menuItemById: async (_, { id }) => {
      const item = await MenuItem.findByPk(id);
      if (!item) throw new Error('Menu item tidak ditemukan');
      return item;
    },
    myOnboardOrders: async (_, __, context) => {
      if (!context.userId) throw new Error('Unauthorized');
      return await OnboardOrder.findAll({ where: { userId: context.userId } });
    },
    onboardOrderById: async (_, { id }, context) => {
      if (!context.userId) throw new Error('Unauthorized');
      const order = await OnboardOrder.findByPk(id);
      if (!order || order.userId !== context.userId) {
        throw new Error('Onboard order tidak ditemukan');
      }
      return order;
    }
  },
  Mutation: {
    createMenuItem: async (_, args) => {
      const menuItem = await MenuItem.create(args);
      return menuItem;
    },
    
    createOnboardOrder: async (_, { bookingId, items }, context) => {
      if (!context.userId) throw new Error('Anda harus login!');
      
      // Validasi booking
      const booking = await validateBooking(bookingId, context.userId);
      if (booking.status !== 'CONFIRMED') {
        throw new Error('Booking harus dalam status CONFIRMED');
      }
      
      // Validasi dan hitung total harga
      let totalPrice = 0;
      const orderItems = [];
      
      for (const item of items) {
        const menuItem = await MenuItem.findByPk(item.menuItemId);
        if (!menuItem || !menuItem.available) {
          throw new Error(`Menu item ${item.menuItemId} tidak tersedia`);
        }
        
        const itemTotal = parseFloat(menuItem.price) * item.quantity;
        totalPrice += itemTotal;
        
        orderItems.push({
          menuItemId: menuItem.id,
          name: menuItem.name,
          quantity: item.quantity,
          price: menuItem.price,
          subtotal: itemTotal
        });
      }
      
      // Buat onboard order
      const onboardOrder = await OnboardOrder.create({
        userId: context.userId,
        bookingId,
        flightCode: booking.flightCode,
        items: JSON.stringify(orderItems),
        totalPrice,
        status: 'PENDING',
        paymentStatus: 'UNPAID'
      });
      
      return onboardOrder;
    },
    
    updateOnboardOrderStatus: async (_, { id, status }, context) => {
      if (!context.userId) throw new Error('Unauthorized');
      
      const order = await OnboardOrder.findByPk(id);
      if (!order || order.userId !== context.userId) {
        throw new Error('Onboard order tidak ditemukan');
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

server.listen({ port: 4005 }).then(({ url }) => {
  console.log(`🚀 Onboard Service ready at ${url}`);
});


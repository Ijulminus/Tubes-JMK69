const { ApolloServer, gql } = require('apollo-server');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { connectDB, sequelize } = require('./db');
const Booking = require('./models/Booking');

// Update Database Structure (Alter Table)
connectDB().then(async () => {
  // Opsi { alter: true } akan otomatis menambah kolom baru (hotelName) ke tabel yang sudah ada
  await sequelize.sync({ alter: true });
});

const typeDefs = gql`
  type Booking @key(fields: "id") {
    id: ID!
    userId: String
    type: String      # Baru
    hotelName: String # Baru
    flightCode: String
    passengerName: String
    status: String
  }

  extend type Mutation {
    # Kita update mutasi ini supaya flightCode jadi opsional (bisa null kalau booking hotel)
    createBooking(
      type: String, 
      flightCode: String, 
      hotelName: String, 
      passengerName: String!
    ): Booking
    
    updateBookingStatus(id: ID!, status: String!): Booking
  }
  
  extend type Query {
    myBookings: [Booking]
    bookingById(id: ID!): Booking
  }
`;

const resolvers = {
  Mutation: {
    createBooking: async (_, args, context) => {
      if (!context.userId) throw new Error("Anda harus login!");
      
      // Default type FLIGHT jika tidak diisi
      const type = args.type || 'FLIGHT';

      return await Booking.create({ 
        userId: context.userId,
        type: type,
        flightCode: args.flightCode,
        hotelName: args.hotelName,
        passengerName: args.passengerName,
        status: 'BOOKED' 
      });
    },

    updateBookingStatus: async (_, { id, status }) => {
      const booking = await Booking.findByPk(id);
      if (!booking) throw new Error("Booking tidak ditemukan");
      booking.status = status;
      await booking.save();
      return booking;
    }
  },
  Query: {
    myBookings: async (_, __, context) => {
      if (!context.userId) throw new Error("Unauthorized");
      return await Booking.findAll({ 
        where: { userId: context.userId },
        order: [['createdAt', 'DESC']] // Urutkan dari yang terbaru
      });
    },
    bookingById: async (_, { id }, context) => {
      // Query ini dapat diakses tanpa auth untuk integrasi lintas kelompok
      const booking = await Booking.findByPk(id);
      if (!booking) throw new Error("Booking tidak ditemukan");
      return booking;
    }
  }
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  context: ({ req }) => ({ userId: req.headers['user-id'] })
});

server.listen({ port: 4000 }).then(({ url }) => {
  console.log(`🚀 Booking Service ready at ${url}`);
});
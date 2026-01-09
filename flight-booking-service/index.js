// flight-booking-service/index.js
const { ApolloServer, gql } = require('apollo-server');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const axios = require('axios');
const { connectDB } = require('./db');
const Booking = require('./models/Booking');

connectDB();

const FLIGHT_SCHEDULE_SERVICE = process.env.FLIGHT_SCHEDULE_SERVICE || 'http://flight-schedule-service:4002';
// External Booking Service dari kelompok lain (untuk integrasi lintas kelompok)
const EXTERNAL_BOOKING_SERVICE = process.env.EXTERNAL_BOOKING_SERVICE || 'http://external-booking-service:4000';
// Booking Service dari Kelompok 2 (IAE_TuBes-front-end)
const KELOMPOK2_BOOKING_SERVICE = process.env.KELOMPOK2_BOOKING_SERVICE || 'http://host.docker.internal:4003';

const typeDefs = gql`
  type Booking @key(fields: "id") {
    id: ID!
    userId: Int!
    flightCode: String!
    flightId: Int
    passengerName: String!
    seatNumber: String
    numberOfSeats: Int!
    totalPrice: Float!
    status: String!
    paymentStatus: String!
    paymentId: String
    externalBookingId: String
  }

  # Type untuk informasi booking dari kelompok lain
  type ExternalBookingInfo {
    id: ID!
    bookingCode: String
    passengerName: String!
    status: String!
    createdAt: String
  }

  # Type untuk informasi booking dari Kelompok 2
  type Kelompok2BookingInfo {
    id: ID!
    userId: String
    type: String
    hotelName: String
    flightCode: String
    passengerName: String
    status: String
  }

  extend type Query {
    myBookings: [Booking]
    bookingById(id: ID!): Booking
    # Query untuk integrasi lintas kelompok - mengambil booking dari kelompok lain
    externalBookingById(externalBookingId: ID!): ExternalBookingInfo
    # Query untuk mengambil booking dari Kelompok 2 (IAE_TuBes-main)
    kelompok2BookingById(bookingId: ID!): Kelompok2BookingInfo
  }

  extend type Mutation {
    createBooking(
      flightCode: String!
      passengerName: String!
      numberOfSeats: Int!
      seatNumber: String
      paymentId: String
    ): Booking
    
    updateBookingStatus(id: ID!, status: String!): Booking
    
    confirmPayment(bookingId: ID!, paymentId: String): Booking
    
    # Mutation untuk integrasi lintas kelompok - sinkronisasi booking dari kelompok lain
    syncExternalBooking(externalBookingId: ID!): Booking
  }
`;

// Helper function untuk memanggil Flight Schedule Service
async function getFlightSchedule(flightCode) {
  try {
    const response = await axios.post(`${FLIGHT_SCHEDULE_SERVICE}`, {
      query: `
        query {
          flightByCode(flightCode: "${flightCode}") {
            id
            flightCode
            price
            availableSeats
            status
          }
        }
      `
    });
    
    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }
    
    return response.data.data.flightByCode;
  } catch (error) {
    throw new Error(`Flight tidak ditemukan: ${error.message}`);
  }
}

// Helper function untuk mengurangi kursi tersedia
async function decreaseSeats(flightCode, seats) {
  try {
    const response = await axios.post(`${FLIGHT_SCHEDULE_SERVICE}`, {
      query: `
        mutation {
          decreaseAvailableSeats(flightCode: "${flightCode}", seats: ${seats}) {
            id
            availableSeats
          }
        }
      `
    });
    
    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }
    
    return response.data.data.decreaseAvailableSeats;
  } catch (error) {
    throw new Error(`Gagal mengurangi kursi: ${error.message}`);
  }
}

// Helper function untuk mengambil booking dari kelompok lain (lintas kelompok)
async function getExternalBooking(externalBookingId, userId = null) {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Tambahkan user-id header jika ada (untuk authentication)
    if (userId) {
      headers['user-id'] = userId;
    }
    
    const response = await axios.post(
      `${EXTERNAL_BOOKING_SERVICE}`,
      {
        query: `
          query {
            bookingById(id: "${externalBookingId}") {
              id
              userId
              type
              hotelName
              flightCode
              passengerName
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
    
    return response.data.data.bookingById;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`Tidak dapat terhubung ke external booking service: ${EXTERNAL_BOOKING_SERVICE}`);
    }
    throw new Error(`Gagal mengambil booking dari kelompok lain: ${error.message}`);
  }
}

// Helper function untuk mengambil booking dari Kelompok 2 (IAE_TuBes-front-end)
async function getKelompok2Booking(bookingId, userId = null) {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Tambahkan user-id header jika ada (untuk authentication)
    if (userId) {
      headers['user-id'] = userId;
    }
    
    const response = await axios.post(
      `${KELOMPOK2_BOOKING_SERVICE}`,
      {
        query: `
          query {
            bookingById(id: "${bookingId}") {
              id
              userId
              type
              hotelName
              flightCode
              passengerName
              status
            }
          }
        `
      },
      { 
        headers,
        timeout: 5000
      }
    );
    
    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }
    
    return response.data.data.bookingById;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`Tidak dapat terhubung ke booking service kelompok 2: ${KELOMPOK2_BOOKING_SERVICE}`);
    }
    if (error.code === 'ETIMEDOUT') {
      throw new Error(`Timeout saat memanggil booking service kelompok 2`);
    }
    throw new Error(`Gagal mengambil booking dari kelompok 2: ${error.message}`);
  }
}

const resolvers = {
  Query: {
    myBookings: async (_, __, context) => {
      if (!context.userId) throw new Error('Unauthorized');
      return await Booking.findAll({ where: { userId: context.userId } });
    },
    bookingById: async (_, { id }, context) => {
      if (!context.userId) throw new Error('Unauthorized');
      const booking = await Booking.findByPk(id);
      if (!booking || booking.userId !== parseInt(context.userId)) {
        throw new Error('Booking tidak ditemukan');
      }
      return booking;
    },
    // Query untuk mengambil booking dari kelompok lain (integrasi lintas kelompok)
    externalBookingById: async (_, { externalBookingId }, context) => {
      if (!context.userId) throw new Error('Unauthorized');
      
      try {
        const externalBooking = await getExternalBooking(externalBookingId, context.userId.toString());
        return {
          id: externalBooking.id,
          bookingCode: externalBooking.id, // Gunakan ID sebagai bookingCode
          passengerName: externalBooking.passengerName,
          status: externalBooking.status,
          createdAt: new Date().toISOString() // Default timestamp
        };
      } catch (error) {
        throw new Error(`Gagal mengambil booking dari kelompok lain: ${error.message}`);
      }
    },
    // Query untuk mengambil booking dari Kelompok 2 (IAE_TuBes-front-end)
    kelompok2BookingById: async (_, { bookingId }, context) => {
      if (!context.userId) throw new Error('Unauthorized');
      
      try {
        const kelompok2Booking = await getKelompok2Booking(bookingId, context.userId.toString());
        return {
          id: kelompok2Booking.id,
          userId: kelompok2Booking.userId,
          type: kelompok2Booking.type,
          hotelName: kelompok2Booking.hotelName,
          flightCode: kelompok2Booking.flightCode,
          passengerName: kelompok2Booking.passengerName,
          status: kelompok2Booking.status
        };
      } catch (error) {
        throw new Error(`Gagal mengambil booking dari kelompok 2: ${error.message}`);
      }
    }
  },
  Mutation: {
    createBooking: async (_, { flightCode, passengerName, numberOfSeats, seatNumber, paymentId }, context) => {
      if (!context.userId) throw new Error('Anda harus login!');
      
      // Validasi flight dari Flight Schedule Service
      const flight = await getFlightSchedule(flightCode);
      
      if (flight.status !== 'ACTIVE') {
        throw new Error('Flight tidak aktif');
      }
      
      if (flight.availableSeats < numberOfSeats) {
        throw new Error('Kursi tidak cukup');
      }
      
      // Hitung total harga
      const totalPrice = parseFloat(flight.price) * numberOfSeats;
      
      // Buat booking dengan paymentId jika diberikan
      const booking = await Booking.create({
        userId: context.userId,
        flightCode,
        flightId: flight.id,
        passengerName,
        seatNumber,
        numberOfSeats,
        totalPrice,
        status: 'BOOKED',
        paymentStatus: paymentId ? 'PAID' : 'UNPAID',
        paymentId: paymentId || null
      });
      
      // Jika paymentId diberikan, langsung set status menjadi CONFIRMED
      if (paymentId) {
        booking.status = 'CONFIRMED';
        await booking.save();
      }
      
      // Kurangi kursi tersedia di Flight Schedule Service
      try {
        await decreaseSeats(flightCode, numberOfSeats);
      } catch (error) {
        // Jika gagal mengurangi kursi, hapus booking
        await booking.destroy();
        throw error;
      }
      
      return booking;
    },
    
    updateBookingStatus: async (_, { id, status }, context) => {
      if (!context.userId) throw new Error('Unauthorized');
      
      const booking = await Booking.findByPk(id);
      if (!booking || booking.userId !== parseInt(context.userId)) {
        throw new Error('Booking tidak ditemukan');
      }
      
      booking.status = status;
      await booking.save();
      
      return booking;
    },
    
    confirmPayment: async (_, { bookingId, paymentId }, context) => {
      if (!context.userId) throw new Error('Unauthorized');
      
      const booking = await Booking.findByPk(bookingId);
      if (!booking || booking.userId !== parseInt(context.userId)) {
        throw new Error('Booking tidak ditemukan');
      }
      
      // Jika paymentId tidak diberikan, gunakan paymentId yang sudah ada di booking
      const finalPaymentId = paymentId || booking.paymentId;
      
      if (!finalPaymentId) {
        throw new Error('Payment ID harus diberikan atau sudah ada di booking');
      }
      
      booking.paymentStatus = 'PAID';
      booking.paymentId = finalPaymentId;
      booking.status = 'CONFIRMED';
      await booking.save();
      
      return booking;
    },
    
    // Mutation untuk sinkronisasi booking dari kelompok lain (integrasi lintas kelompok)
    syncExternalBooking: async (_, { externalBookingId }, context) => {
      if (!context.userId) throw new Error('Unauthorized');
      
      try {
        // Ambil booking dari kelompok lain
        const externalBooking = await getExternalBooking(externalBookingId, context.userId.toString());
        
        // Cek apakah booking sudah ada di sistem kita
        let booking = await Booking.findOne({ 
          where: { externalBookingId: externalBooking.id.toString() } 
        });
        
        if (booking) {
          // Update booking yang sudah ada
          booking.status = externalBooking.status;
          await booking.save();
          return booking;
        } else {
          // Buat booking baru berdasarkan data dari kelompok lain
          // Gunakan flightCode dari external booking jika tersedia, atau 'EXTERNAL' jika tidak
          const flightCode = externalBooking.flightCode || 'EXTERNAL';
          
          booking = await Booking.create({
            userId: context.userId,
            flightCode: flightCode,
            passengerName: externalBooking.passengerName,
            numberOfSeats: 1, // Default, bisa disesuaikan
            totalPrice: 0, // Default, bisa disesuaikan
            status: externalBooking.status,
            paymentStatus: 'UNPAID',
            externalBookingId: externalBooking.id.toString()
          });
          
          return booking;
        }
      } catch (error) {
        throw new Error(`Gagal sinkronisasi booking dari kelompok lain: ${error.message}`);
      }
    }
  }
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  context: ({ req }) => {
    return { userId: req.headers['user-id'] };
  }
});

server.listen({ port: 4003 }).then(({ url }) => {
  console.log(`🚀 Flight Booking Service ready at ${url}`);
});


// flight-booking-service/index.js
const { ApolloServer, gql } = require('apollo-server');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const axios = require('axios');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const { connectDB } = require('./db');
const Booking = require('./models/Booking');

connectDB();

const JWT_SECRET = process.env.JWT_SECRET || 'RAHASIA_NEGARA';

const FLIGHT_SCHEDULE_SERVICE = process.env.FLIGHT_SCHEDULE_SERVICE || 'http://flight-schedule-service:4002';
// External Booking Service dari kelompok lain (untuk integrasi lintas kelompok)
const EXTERNAL_BOOKING_SERVICE = process.env.EXTERNAL_BOOKING_SERVICE || 'http://external-booking-service:4000';
// Booking Service dari Kelompok 2 (IAE_TuBes-front-end)
const KELOMPOK2_BOOKING_SERVICE = process.env.KELOMPOK2_BOOKING_SERVICE || 'http://host.docker.internal:4003';

// Shared secret sederhana untuk integrasi lintas laptop (server-to-server)
const PARTNER_API_KEY = process.env.PARTNER_API_KEY || 'PARTNER_SECRET';
const EXTERNAL_DEFAULT_USER_ID = parseInt(process.env.EXTERNAL_DEFAULT_USER_ID || '0', 10);

// Helper: auto-generate Payment ID untuk booking (khususnya hasil sync dari Travel-app)
function generatePaymentId() {
  // Contoh format: PAY-20260111-123045-ABC123
  const now = new Date();
  const y = now.getFullYear().toString();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PAY-${y}${m}${d}-${hh}${mm}${ss}-${rand}`;
}

function normalizePaymentId(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (s.toLowerCase() === 'null') return null;
  return s;
}

function requireAuth(context) {
  if (context.isAuthenticated !== true) throw new Error('Unauthorized');
}

function requirePartner(context) {
  if (!context.apiKey || context.apiKey !== PARTNER_API_KEY) throw new Error('Unauthorized partner');
}

function isPartnerBooking(booking) {
  return booking && booking.externalBookingId !== undefined && booking.externalBookingId !== null;
}

function canAccessBooking(booking, context) {
  if (!booking) return false;
  if (context.userRole === 'ADMIN') return true;

  // booking milik user sendiri
  if (booking.userId === context.userId) return true;

  // booking hasil import Travel-app / partner (umumnya userId=0 + ada externalBookingId)
  if (booking.userId === EXTERNAL_DEFAULT_USER_ID) return true;
  if (isPartnerBooking(booking)) return true;

  return false;
}

function buildAuthHeaders(context) {
  const headers = { 'Content-Type': 'application/json' };
  if (context && context.authorization) {
    headers['authorization'] = context.authorization;
  }
  // Forward x-api-key untuk integrasi partner (Travel-app) / internal service-to-service
  if (context && context.apiKey) {
    headers['x-api-key'] = context.apiKey;
  }
  return headers;
}

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
    # "USER" = booking dibuat oleh user maskapai, "TRAVEL_APP" = booking hasil sinkronisasi dari Travel App
    source: String!
  }

  type ExternalBookingInfo {
    id: ID!
    bookingCode: String
    passengerName: String!
    status: String!
    createdAt: String
  }

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
    allBookings: [Booking]
    myBookings: [Booking]
    bookingById(id: ID!): Booking

    externalBookingById(externalBookingId: ID!): ExternalBookingInfo
    kelompok2BookingById(bookingId: ID!): Kelompok2BookingInfo

    # Untuk verifikasi integrasi (pakai x-api-key)
    partnerImportedBookings: [Booking]
    partnerBookingByExternalId(externalBookingId: String!): Booking
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

    syncExternalBooking(externalBookingId: ID!): Booking

    # Dipanggil oleh Travel-app setelah createBooking, dengan header: x-api-key
    syncKelompok2Booking(bookingId: ID!): Booking
  }
`;

// Helper function untuk memanggil Flight Schedule Service
async function getFlightSchedule(flightCode, context) {
  try {
    const response = await axios.post(
      `${FLIGHT_SCHEDULE_SERVICE}`,
      {
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
      },
      { headers: buildAuthHeaders(context) }
    );

    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.flightByCode;
  } catch (error) {
    throw new Error(`Flight tidak ditemukan: ${error.message}`);
  }
}

// Helper function untuk mengurangi kursi tersedia
async function decreaseSeats(flightCode, seats, context) {
  try {
    const response = await axios.post(
      `${FLIGHT_SCHEDULE_SERVICE}`,
      {
        query: `
          mutation {
            decreaseAvailableSeats(flightCode: "${flightCode}", seats: ${seats}) {
              id
              availableSeats
            }
          }
        `
      },
      { headers: buildAuthHeaders(context) }
    );

    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.decreaseAvailableSeats;
  } catch (error) {
    throw new Error(`Gagal mengurangi kursi: ${error.message}`);
  }
}

// Helper function untuk mengambil booking dari kelompok lain (lintas kelompok)
async function getExternalBooking(externalBookingId, userId = null) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (userId !== undefined && userId !== null) headers['user-id'] = String(userId);

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

    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.bookingById;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`Tidak dapat terhubung ke booking service kelompok lain: ${EXTERNAL_BOOKING_SERVICE}`);
    }
    if (error.code === 'ETIMEDOUT') {
      throw new Error(`Timeout saat memanggil booking service kelompok lain`);
    }
    throw new Error(`Gagal mengambil booking dari kelompok lain: ${error.message}`);
  }
}

// Helper function untuk mengambil booking dari Kelompok 2 (IAE_TuBes-front-end)
async function getKelompok2Booking(bookingId, userId = null) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (userId !== undefined && userId !== null) headers['user-id'] = String(userId);

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
      { headers }
    );

    if (response.data.errors) throw new Error(response.data.errors[0].message);
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
      requireAuth(context);
      return await Booking.findAll({ where: { userId: context.userId } });
    },

    bookingById: async (_, { id }, context) => {
      requireAuth(context);
      const booking = await Booking.findByPk(id);
      if (!booking || !canAccessBooking(booking, context)) throw new Error('Booking tidak ditemukan');
      return booking;
    },

    allBookings: async (_, __, context) => {
      requireAuth(context);
      return await Booking.findAll({ order: [['id', 'DESC']] });
    },

    externalBookingById: async (_, { externalBookingId }, context) => {
      requireAuth(context);

      try {
        const externalBooking = await getExternalBooking(externalBookingId, context.userId);
        return {
          id: externalBooking.id,
          bookingCode: externalBooking.id,
          passengerName: externalBooking.passengerName,
          status: externalBooking.status,
          createdAt: new Date().toISOString()
        };
      } catch (error) {
        throw new Error(`Gagal mengambil booking dari kelompok lain: ${error.message}`);
      }
    },

    kelompok2BookingById: async (_, { bookingId }, context) => {
      requireAuth(context);

      try {
        const kelompok2Booking = await getKelompok2Booking(bookingId, context.userId);
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
    },

    partnerImportedBookings: async (_, __, context) => {
      requirePartner(context);

      return await Booking.findAll({
        where: { externalBookingId: { [Op.ne]: null } },
        order: [['createdAt', 'DESC']]
      });
    },

    partnerBookingByExternalId: async (_, { externalBookingId }, context) => {
      requirePartner(context);

      const booking = await Booking.findOne({ where: { externalBookingId: externalBookingId.toString() } });
      if (!booking) throw new Error('Booking tidak ditemukan');
      return booking;
    }
  },

  Booking: {
    source: (booking) => (booking.externalBookingId ? 'TRAVEL_APP' : 'USER')
  },

  Mutation: {
    createBooking: async (_, { flightCode, passengerName, numberOfSeats, seatNumber, paymentId }, context) => {
      requireAuth(context);

      const flight = await getFlightSchedule(flightCode, context);

      if (flight.status !== 'ACTIVE') throw new Error('Flight tidak aktif');
      if (flight.availableSeats < numberOfSeats) throw new Error('Kursi tidak cukup');

      const totalPrice = parseFloat(flight.price) * numberOfSeats;

      const normalizedPaymentId = normalizePaymentId(paymentId);

      const booking = await Booking.create({
        userId: context.userId,
        flightCode,
        flightId: flight.id,
        passengerName,
        seatNumber,
        numberOfSeats,
        totalPrice,
        status: 'BOOKED',
        paymentStatus: normalizedPaymentId ? 'PAID' : 'UNPAID',
        paymentId: normalizedPaymentId
      });

      if (normalizedPaymentId) {
        booking.status = 'CONFIRMED';
        await booking.save();
      }

      try {
        await decreaseSeats(flightCode, numberOfSeats, context);
      } catch (error) {
        await booking.destroy();
        throw error;
      }

      return booking;
    },

    updateBookingStatus: async (_, { id, status }, context) => {
      requireAuth(context);

      const booking = await Booking.findByPk(id);
      if (!booking || !canAccessBooking(booking, context)) throw new Error('Booking tidak ditemukan');

      booking.status = status;
      await booking.save();
      return booking;
    },

    confirmPayment: async (_, { bookingId, paymentId }, context) => {
      requireAuth(context);

      const booking = await Booking.findByPk(bookingId);
      if (!booking || !canAccessBooking(booking, context)) throw new Error('Booking tidak ditemukan');

      let finalPaymentId = normalizePaymentId(paymentId) || normalizePaymentId(booking.paymentId);

      // Booking hasil import: jika belum ada paymentId, auto-generate agar bisa confirm
      if (!finalPaymentId) {
        if (isPartnerBooking(booking) || booking.userId === EXTERNAL_DEFAULT_USER_ID) {
          finalPaymentId = generatePaymentId();
        } else {
          throw new Error('Payment ID harus diberikan atau sudah ada di booking');
        }
      }

      booking.paymentStatus = 'PAID';
      booking.paymentId = finalPaymentId;
      booking.status = 'CONFIRMED';
      await booking.save();

      return booking;
    },

    syncExternalBooking: async (_, { externalBookingId }, context) => {
      requireAuth(context);

      try {
        const externalBooking = await getExternalBooking(externalBookingId, context.userId);

        let booking = await Booking.findOne({
          where: { externalBookingId: externalBooking.id.toString() }
        });

        if (booking) {
          booking.status = externalBooking.status;
          await booking.save();
          return booking;
        }

        const flightCode = externalBooking.flightCode || 'EXTERNAL';

        booking = await Booking.create({
          userId: context.userId,
          flightCode,
          passengerName: externalBooking.passengerName,
          numberOfSeats: 1,
          totalPrice: 0,
          status: externalBooking.status,
          paymentStatus: 'UNPAID',
          paymentId: null,
          externalBookingId: externalBooking.id.toString()
        });

        return booking;
      } catch (error) {
        throw new Error(`Gagal sinkronisasi booking dari kelompok lain: ${error.message}`);
      }
    },

    // Dipanggil oleh Travel-app setelah membuat booking (wajib x-api-key + JWT)
    syncKelompok2Booking: async (_, { bookingId }, context) => {
      // Endpoint integrasi partner: cukup pakai x-api-key (tanpa JWT)
      requirePartner(context);

      const ext = await getKelompok2Booking(bookingId, null);
      if (!ext) throw new Error('Booking tidak ditemukan di Travel-app');

      const extType = (ext.type || 'FLIGHT').toUpperCase();
      if (extType !== 'FLIGHT') throw new Error('Hanya booking type FLIGHT yang bisa di-sync ke Flight Booking Service');
      if (!ext.flightCode) throw new Error('flightCode kosong dari Travel-app');

      // Idempotency
      let booking = await Booking.findOne({ where: { externalBookingId: ext.id.toString() } });
      if (booking) {
        const extStatusUpper = (ext.status || booking.status || 'BOOKED').toString().toUpperCase();

        if (extStatusUpper === 'PAID') {
          booking.status = 'CONFIRMED';
          booking.paymentStatus = 'PAID';
        } else {
          booking.status = ext.status || booking.status;
        }

        if (!normalizePaymentId(booking.paymentId)) {
          booking.paymentId = generatePaymentId();
        }

        await booking.save();
        return booking;
      }

      const flight = await getFlightSchedule(ext.flightCode, context);
      if (flight.status !== 'ACTIVE') throw new Error('Flight tidak aktif');
      if (flight.availableSeats < 1) throw new Error('Kursi tidak cukup');

      const seats = 1;
      const totalPrice = parseFloat(flight.price) * seats;

      const extStatusUpper = (ext.status || 'BOOKED').toString().toUpperCase();
      const isPaid = extStatusUpper === 'PAID';

      booking = await Booking.create({
        userId: EXTERNAL_DEFAULT_USER_ID,
        flightCode: ext.flightCode,
        flightId: flight.id,
        passengerName: ext.passengerName || 'Traveler',
        numberOfSeats: seats,
        totalPrice,
        status: isPaid ? 'CONFIRMED' : (ext.status || 'BOOKED'),
        paymentStatus: isPaid ? 'PAID' : 'UNPAID',
        paymentId: generatePaymentId(),
        externalBookingId: ext.id.toString()
      });

      try {
        await decreaseSeats(ext.flightCode, seats, context);
      } catch (e) {
        await booking.destroy();
        throw e;
      }

      return booking;
    }
  }
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  context: ({ req }) => {
    const authorization = req.headers.authorization || '';
    const apiKey = req.headers['x-api-key'];

    if (!authorization) {
      return {
        isAuthenticated: false,
        userId: null,
        userRole: null,
        authorization: '',
        apiKey
      };
    }

    try {
      const token = authorization.replace(/^Bearer\s+/i, '');
      const decoded = jwt.verify(token, JWT_SECRET);

      return {
        isAuthenticated: true,
        userId: decoded.id ?? decoded.userId ?? null,
        userRole: decoded.role ?? null,
        authorization: `Bearer ${token}`,
        apiKey
      };
    } catch (e) {
      return {
        isAuthenticated: false,
        userId: null,
        userRole: null,
        authorization,
        apiKey
      };
    }
  }
});

server.listen({ port: 4003, host: '0.0.0.0' }).then(({ url }) => {
  console.log(`🚀 Flight Booking Service ready at ${url}`);
});

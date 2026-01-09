// auth-service/index.js
const { ApolloServer, gql } = require('apollo-server');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { connectDB } = require('./db');
const User = require('./models/User');

connectDB();

const JWT_SECRET = process.env.JWT_SECRET || 'RAHASIA_NEGARA';

const typeDefs = gql`
  type User @key(fields: "id") {
    id: ID!
    username: String!
    fullName: String!
    email: String!
    role: String!
    status: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  extend type Query {
    userById(id: ID!): User
    me: User
  }

  extend type Mutation {
    register(username: String!, fullName: String!, email: String!, password: String!, role: String): User
    login(username: String!, password: String!): AuthPayload
  }
`;

const resolvers = {
  Query: {
    userById: async (_, { id }) => {
      const user = await User.findByPk(id);
      if (!user) throw new Error('User tidak ditemukan');
      return user;
    },
    me: async (_, __, context) => {
      if (!context.userId) throw new Error('Unauthorized');
      const user = await User.findByPk(context.userId);
      if (!user) throw new Error('User tidak ditemukan');
      return user;
    }
  },
  Mutation: {
    register: async (_, { username, fullName, email, password, role = 'USER' }) => {
      // Cek apakah username atau email sudah ada
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ username }, { email }]
        }
      });
      
      if (existingUser) {
        throw new Error('Username atau email sudah terdaftar');
      }

      const user = await User.create({
        username,
        fullName,
        email,
        password,
        role
      });

      // Hapus password dari response
      user.password = undefined;
      return user;
    },
    login: async (_, { username, password }) => {
      const user = await User.findOne({ where: { username } });
      
      if (!user) {
        throw new Error('Username atau password salah');
      }

      if (user.status !== 'ACTIVE') {
        throw new Error('Akun tidak aktif');
      }

      const isValidPassword = await user.verifyPassword(password);
      
      if (!isValidPassword) {
        throw new Error('Username atau password salah');
      }

      // Generate JWT Token
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Hapus password dari response
      user.password = undefined;

      return {
        token,
        user
      };
    }
  }
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  context: ({ req }) => {
    const token = req.headers.authorization || '';
    if (token) {
      try {
        const actualToken = token.replace('Bearer ', '');
        const decoded = jwt.verify(actualToken, JWT_SECRET);
        return { userId: decoded.id, userRole: decoded.role };
      } catch (e) {
        // Token tidak valid, biarkan saja
      }
    }
    return {};
  }
});

server.listen({ port: 4001 }).then(({ url }) => {
  console.log(`🚀 Auth Service ready at ${url}`);
});


# Dokumentasi Integrasi External Booking Service

## Overview

Dokumen ini menjelaskan integrasi dengan External Booking Service dari kelompok lain yang telah ditambahkan ke sistem JMK AIR.

## Konfigurasi yang Telah Dilakukan

### 1. External Booking Service

**Lokasi**: `external-booking-service/`

**Port**: 
- Internal (Docker): `4000`
- External (Host): `5000` (mapped untuk menghindari conflict dengan gateway)

**Database**: 
- Name: `booking_db`
- User: `user`
- Password: `pass`
- Host: `external-booking-db`

**Schema GraphQL**:
```graphql
type Booking {
  id: ID!
  userId: String
  type: String      # FLIGHT atau HOTEL
  hotelName: String
  flightCode: String
  passengerName: String
  status: String
}

type Query {
  myBookings: [Booking]
  bookingById(id: ID!): Booking  # Ditambahkan untuk integrasi
}

type Mutation {
  createBooking(
    type: String
    flightCode: String
    hotelName: String
    passengerName: String!
  ): Booking
  updateBookingStatus(id: ID!, status: String!): Booking
}
```

### 2. Docker Compose Configuration

External Booking Service telah ditambahkan ke `docker-compose.yml`:

```yaml
external-booking-db:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: booking_db
    POSTGRES_USER: user
    POSTGRES_PASSWORD: pass
  networks:
    - jmkair-network

external-booking-service:
  build: ./external-booking-service
  ports:
    - "5000:4000"
  environment:
    DB_NAME: booking_db
    DB_USER: user
    DB_PASS: pass
    DB_HOST: external-booking-db
  networks:
    - jmkair-network
```

### 3. Flight Booking Service Integration

**Environment Variable**:
```yaml
EXTERNAL_BOOKING_SERVICE: http://external-booking-service:4000
```

**Query yang Tersedia**:
- `externalBookingById(externalBookingId: ID!): ExternalBookingInfo` - Mengambil booking dari external service
- `syncExternalBooking(externalBookingId: ID!): Booking` - Sinkronisasi booking dari external service

## Cara Menggunakan

### 1. Menjalankan Service

```bash
docker-compose up --build
```

Pastikan semua service running termasuk:
- `external-booking-db`
- `external-booking-service`

### 2. Mengambil Booking dari External Service

**Query GraphQL**:
```graphql
query {
  externalBookingById(externalBookingId: "1") {
    id
    bookingCode
    passengerName
    status
    createdAt
  }
}
```

**Headers yang diperlukan**:
```
Authorization: Bearer <jwt_token>
```

### 3. Sinkronisasi Booking dari External Service

**Mutation GraphQL**:
```graphql
mutation {
  syncExternalBooking(externalBookingId: "1") {
    id
    flightCode
    passengerName
    status
    externalBookingId
  }
}
```

**Headers yang diperlukan**:
```
Authorization: Bearer <jwt_token>
```

## Perubahan yang Dilakukan

### 1. External Booking Service (`external-booking-service/index.js`)

**Ditambahkan**:
- Query `bookingById(id: ID!): Booking` untuk integrasi lintas kelompok
- Resolver untuk `bookingById` yang dapat diakses tanpa auth (untuk integrasi)

### 2. Flight Booking Service (`flight-booking-service/index.js`)

**Diupdate**:
- Helper function `getExternalBooking()` untuk menyesuaikan dengan schema external service
- Query `externalBookingById` untuk mengambil booking dari external service
- Mutation `syncExternalBooking` untuk sinkronisasi booking

**Schema yang disesuaikan**:
- Menggunakan `id`, `type`, `hotelName`, `flightCode`, `passengerName`, `status` dari external service
- Mapping `bookingCode` menggunakan `id` dari external service
- Default `createdAt` menggunakan timestamp saat ini

### 3. Docker Compose (`docker-compose.yml`)

**Ditambahkan**:
- Service `external-booking-db` (PostgreSQL database)
- Service `external-booking-service` (GraphQL service)
- Volume `external_booking_db_data` untuk persistence
- Dependency di `flight-booking-service` untuk `external-booking-service`

## Testing

### Test 1: Cek External Service Running

```bash
# Cek dari host
curl -X POST http://localhost:5000 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { bookingById(id: \"1\") { id passengerName status } }"
  }'
```

### Test 2: Test dari Gateway

1. Login untuk mendapatkan token:
```graphql
mutation {
  login(username: "testuser", password: "password123") {
    token
  }
}
```

2. Query external booking:
```graphql
query {
  externalBookingById(externalBookingId: "1") {
    id
    bookingCode
    passengerName
    status
  }
}
```

3. Sync external booking:
```graphql
mutation {
  syncExternalBooking(externalBookingId: "1") {
    id
    flightCode
    passengerName
    status
  }
}
```

## Troubleshooting

### Error: Connection Refused

**Penyebab**: External booking service belum running

**Solusi**:
```bash
docker-compose ps
docker-compose logs external-booking-service
```

### Error: Booking tidak ditemukan

**Penyebab**: ID booking tidak ada di external service

**Solusi**: Pastikan booking ID valid. Buat booking terlebih dahulu di external service.

### Error: Unauthorized

**Penyebab**: Token tidak valid atau tidak ada

**Solusi**: Pastikan menggunakan token yang valid dari login dan set header `Authorization: Bearer <token>`

## Catatan Penting

1. **Port Mapping**: External service di-map ke port 5000 di host untuk menghindari conflict dengan gateway (port 4000)

2. **Authentication**: 
   - Query `bookingById` di external service dapat diakses tanpa auth untuk integrasi
   - Query `myBookings` di external service memerlukan `user-id` header

3. **Schema Compatibility**: 
   - External service menggunakan `userId: String` (bukan Int)
   - External service memiliki field `type` dan `hotelName` yang tidak ada di JMK AIR booking
   - Mapping dilakukan di resolver untuk kompatibilitas

4. **Network**: Semua service berada di network `jmkair-network` untuk komunikasi internal

## Endpoint Summary

| Service | Internal URL | External URL | Port |
|---------|-------------|--------------|------|
| External Booking Service | http://external-booking-service:4000 | http://localhost:5000 | 4000/5000 |
| GraphQL Gateway | http://graphql-gateway:4000 | http://localhost:4000 | 4000 |

## Next Steps

1. **Testing**: Test semua query dan mutation dengan data real
2. **Error Handling**: Tambahkan error handling yang lebih robust
3. **Logging**: Tambahkan logging untuk monitoring
4. **Documentation**: Update dokumentasi utama dengan informasi ini

---

**Last Updated**: 2025-01-15
**Status**: ✅ Integrated


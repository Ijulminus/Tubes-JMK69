# Dokumentasi Integrasi Dua Arah - Kelompok 1 & Kelompok 2

## Overview

Dokumen ini menjelaskan integrasi dua arah antara:
- **Kelompok 1 (TUBES js v2)**: Flight Booking Service mengambil data dari Booking Service Kelompok 2
- **Kelompok 2 (IAE_TuBes-main)**: Booking Service mengambil data dari Flight Schedule Service Kelompok 1

## Arsitektur Integrasi

```
┌─────────────────────────────────┐         ┌─────────────────────────────────┐
│   KELOMPOK 1 (TUBES js v2)      │         │   KELOMPOK 2 (IAE_TuBes-main)   │
│                                 │         │                                 │
│  ┌───────────────────────────┐  │         │  ┌───────────────────────────┐  │
│  │ Flight Schedule Service   │  │◄────────┤  │   Booking Service          │  │
│  │ Port: 4002                │  │         │  │   Port: 4003              │  │
│  └───────────────────────────┘  │         │  └───────────────────────────┘  │
│           ▲                     │         │                                 │
│           │                     │         │                                 │
│  ┌───────────────────────────┐  │         │                                 │
│  │ Flight Booking Service     │  │────────►│                                 │
│  │ Port: 4003                 │  │         │                                 │
│  └───────────────────────────┘  │         │                                 │
└─────────────────────────────────┘         └─────────────────────────────────┘
```

## 1. Integrasi Kelompok 1 → Kelompok 2

### 1.1 Flight Booking Service (Kelompok 1) Mengambil Data dari Booking Service (Kelompok 2)

**Endpoint Kelompok 2**: `http://host.docker.internal:4003`

**Query yang Ditambahkan**:
```graphql
query {
  kelompok2BookingById(bookingId: "1") {
    id
    status
    flightScheduleId
    passengerName
  }
}
```

**Implementation**:
- Helper function: `getKelompok2Booking(bookingId, userId)`
- Query resolver: `kelompok2BookingById`
- Environment variable: `KELOMPOK2_BOOKING_SERVICE`

**File yang Diubah**:
- `flight-booking-service/index.js`
- `docker-compose.yml` (Kelompok 1)

### 1.2 Schema GraphQL Kelompok 2

```graphql
type Booking {
  id: ID!
  status: String
  flightScheduleId: String
  passengerName: String
}

type Query {
  myBookings: [Booking]
  bookingById(id: ID!): Booking  # Ditambahkan untuk integrasi
}
```

## 2. Integrasi Kelompok 2 → Kelompok 1

### 2.1 Booking Service (Kelompok 2) Mengambil Data dari Flight Schedule Service (Kelompok 1)

**Endpoint Kelompok 1**: `http://host.docker.internal:4002`

**Query yang Ditambahkan**:
```graphql
query {
  kelompok1FlightSchedule(flightCode: "JMK001") {
    id
    flightCode
    departureLocation
    destinationLocation
    departureTime
    arrivalTime
    price
    availableSeats
    status
  }
}
```

**Implementation**:
- Helper function: `getKelompok1FlightSchedule(flightCode)`
- Query resolver: `kelompok1FlightSchedule`
- Validasi di `createBooking` untuk memvalidasi flight schedule dari Kelompok 1
- Environment variable: `KELOMPOK1_FLIGHT_SCHEDULE_SERVICE`

**File yang Diubah**:
- `booking-service/index.js` (Kelompok 2)
- `docker-compose.yml` (Kelompok 2)

### 2.2 Schema GraphQL Kelompok 1

```graphql
type FlightSchedule {
  id: ID!
  flightCode: String!
  departureLocation: String!
  destinationLocation: String!
  departureTime: String!
  arrivalTime: String!
  price: Float!
  availableSeats: Int!
  status: String!
}

type Query {
  flightByCode(flightCode: String!): FlightSchedule
  flightById(id: ID!): FlightSchedule
  flightSchedules(...): [FlightSchedule]
}
```

## 3. Konfigurasi

### 3.1 Docker Compose - Kelompok 1

```yaml
flight-booking-service:
  environment:
    KELOMPOK2_BOOKING_SERVICE: http://host.docker.internal:4003
```

### 3.2 Docker Compose - Kelompok 2

```yaml
booking-service:
  environment:
    KELOMPOK1_FLIGHT_SCHEDULE_SERVICE: http://host.docker.internal:4002
```

**Catatan**: Menggunakan `host.docker.internal` untuk komunikasi lintas docker-compose yang berjalan di host yang sama.

## 4. Cara Menggunakan

### 4.1 Menjalankan Service

**Kelompok 1**:
```bash
cd "C:\KAMPUS\SEMESTER 5\EAI\TUBES js v2"
docker-compose up --build
```

**Kelompok 2**:
```bash
cd "C:\KAMPUS\SEMESTER 5\IAE_TuBes-main"
docker-compose up --build
```

**Penting**: Pastikan kedua kelompok berjalan secara bersamaan!

### 4.2 Test Integrasi Kelompok 1 → Kelompok 2

**1. Login di Kelompok 1**:
```graphql
mutation {
  login(username: "testuser", password: "password123") {
    token
  }
}
```

**2. Query booking dari Kelompok 2**:
```graphql
query {
  kelompok2BookingById(bookingId: "1") {
    id
    status
    flightScheduleId
    passengerName
  }
}
```

**Headers**:
```
Authorization: Bearer <token>
```

### 4.3 Test Integrasi Kelompok 2 → Kelompok 1

**1. Login di Kelompok 2** (melalui membership service)

**2. Query flight schedule dari Kelompok 1**:
```graphql
query {
  kelompok1FlightSchedule(flightCode: "JMK001") {
    id
    flightCode
    departureLocation
    destinationLocation
    price
    availableSeats
    status
  }
}
```

**3. Create booking dengan validasi flight schedule**:
```graphql
mutation {
  createBooking(
    flightScheduleId: "JMK001"  # Flight code dari Kelompok 1
    passengerName: "John Doe"
  ) {
    id
    status
    passengerName
  }
}
```

## 5. Error Handling

### 5.1 Connection Refused

**Penyebab**: Service kelompok lain belum running atau port salah

**Solusi**:
1. Pastikan kedua kelompok berjalan secara bersamaan
2. Cek port yang digunakan:
   - Kelompok 1 Flight Schedule: Port 4002
   - Kelompok 2 Booking Service: Port 4003
3. Test koneksi:
   ```bash
   # Dari host
   curl http://localhost:4002
   curl http://localhost:4003
   ```

### 5.2 Timeout

**Penyebab**: Service kelompok lain lambat merespons

**Solusi**:
- Timeout sudah diset ke 5 detik
- Pastikan network tidak ada masalah
- Cek resource server

### 5.3 Authentication Error

**Penyebab**: Token tidak valid atau tidak ada

**Solusi**:
- Pastikan menggunakan token yang valid
- Set header `Authorization: Bearer <token>`
- Untuk query `bookingById` di Kelompok 2, tidak memerlukan auth (untuk integrasi)

## 6. Network Configuration

### 6.1 Menggunakan host.docker.internal

Kedua kelompok menggunakan `host.docker.internal` untuk komunikasi lintas docker-compose:

- **Windows/Mac**: `host.docker.internal` otomatis tersedia
- **Linux**: Perlu menambahkan `extra_hosts` di docker-compose.yml:
  ```yaml
  extra_hosts:
    - "host.docker.internal:host-gateway"
  ```

### 6.2 Alternatif: Shared Network

Jika kedua kelompok dijalankan di docker-compose yang sama, bisa menggunakan shared network:

```yaml
networks:
  shared-network:
    external: true
```

## 7. Testing Checklist

### Kelompok 1
- [ ] Flight Booking Service dapat mengambil booking dari Kelompok 2
- [ ] Query `kelompok2BookingById` berfungsi
- [ ] Error handling bekerja dengan baik
- [ ] Timeout handling bekerja

### Kelompok 2
- [ ] Booking Service dapat mengambil flight schedule dari Kelompok 1
- [ ] Query `kelompok1FlightSchedule` berfungsi
- [ ] Validasi flight schedule di `createBooking` bekerja
- [ ] Error handling bekerja dengan baik

## 8. Troubleshooting

### Problem: Connection Refused

**Checklist**:
1. Apakah kedua kelompok sudah running?
2. Apakah port sudah benar?
3. Apakah menggunakan `host.docker.internal` dengan benar?
4. Apakah firewall memblokir koneksi?

### Problem: Timeout

**Checklist**:
1. Apakah service kelompok lain merespons?
2. Apakah network lambat?
3. Cek logs service untuk error

### Problem: Schema Mismatch

**Checklist**:
1. Pastikan query sesuai dengan schema
2. Cek field yang di-request
3. Update query jika schema berubah

## 9. Best Practices

1. **Error Handling**: Selalu handle error dengan baik
2. **Timeout**: Set timeout yang wajar (5 detik)
3. **Logging**: Log semua request ke service eksternal
4. **Validation**: Validasi data sebelum digunakan
5. **Documentation**: Dokumentasikan semua endpoint

## 10. Endpoint Summary

| Service | Kelompok | Internal Port | External Port | URL |
|---------|---------|---------------|---------------|-----|
| Flight Schedule Service | 1 | 4002 | 4002 | http://host.docker.internal:4002 |
| Flight Booking Service | 1 | 4003 | 4003 | http://localhost:4003 |
| Booking Service | 2 | 4000 | 4003 | http://host.docker.internal:4003 |

## 11. Next Steps

1. **Testing**: Test semua query dan mutation dengan data real
2. **Monitoring**: Tambahkan monitoring untuk request lintas kelompok
3. **Caching**: Pertimbangkan caching untuk mengurangi beban
4. **Security**: Tambahkan authentication yang lebih robust jika diperlukan

---

**Last Updated**: 2025-01-15
**Status**: ✅ Integrated (Two-way)


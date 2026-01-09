# Dokumentasi Integrasi dengan Kelompok 2 (IAE_TuBes-front-end) - Update

## 📋 Overview

Dokumen ini menjelaskan integrasi terbaru antara **Kelompok 1 (TUBES js v2)** dengan **Kelompok 2 (IAE_TuBes-front-end)**.

## 🔄 Perubahan dari Versi Sebelumnya

### Perubahan Utama

1. **Folder Kelompok 2**: Berubah dari `IAE_TuBes-main` menjadi `IAE_TuBes-front-end`
2. **Schema Booking Kelompok 2**: Menggunakan schema baru dengan field `type`, `hotelName`, `flightCode`
3. **Query Booking**: Hanya memerlukan `bookingId`, tidak perlu payment service atau payment id
4. **Validasi Flight Schedule**: Kelompok 2 dapat memvalidasi flight schedule dari Kelompok 1 saat create booking

---

## 🔗 Integrasi Dua Arah

### 1. Kelompok 1 → Kelompok 2

**Flight Booking Service (Kelompok 1) mengambil data dari Booking Service (Kelompok 2)**

#### Endpoint
- **URL**: `http://host.docker.internal:4003`
- **Service**: Booking Service (IAE_TuBes-front-end)

#### Schema Booking Kelompok 2

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
```

#### Query yang Tersedia

```graphql
query {
  kelompok2BookingById(bookingId: "1") {
    id
    userId
    type
    hotelName
    flightCode
    passengerName
    status
  }
}
```

**Headers**:
```json
{
  "Authorization": "Bearer <token>"
}
```

#### Implementation

**File**: `flight-booking-service/index.js`

- Helper function: `getKelompok2Booking(bookingId, userId)`
- Query resolver: `kelompok2BookingById`
- Environment variable: `KELOMPOK2_BOOKING_SERVICE`

**Konfigurasi**:
```yaml
# docker-compose.yml
flight-booking-service:
  environment:
    KELOMPOK2_BOOKING_SERVICE: http://host.docker.internal:4003
```

---

### 2. Kelompok 2 → Kelompok 1

**Booking Service (Kelompok 2) mengambil data dari Flight Schedule Service (Kelompok 1)**

#### Endpoint
- **URL**: `http://host.docker.internal:4002`
- **Service**: Flight Schedule Service (TUBES js v2)

#### Query yang Tersedia

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

#### Validasi Otomatis di Create Booking

Saat membuat booking dengan `flightCode`, Booking Service Kelompok 2 akan:
1. Memanggil Flight Schedule Service Kelompok 1
2. Memvalidasi:
   - Status harus `ACTIVE`
   - Available seats harus >= 1
3. Jika valid, booking dibuat
4. Jika tidak valid, error dikembalikan

**Contoh Mutation**:
```graphql
mutation {
  createBooking(
    type: "FLIGHT"
    flightCode: "JMK001"  # Akan divalidasi dari Kelompok 1
    passengerName: "John Doe"
  ) {
    id
    status
    flightCode
    passengerName
  }
}
```

#### Implementation

**File**: `booking-service/index.js` (Kelompok 2)

- Helper function: `getKelompok1FlightSchedule(flightCode)`
- Query resolver: `kelompok1FlightSchedule`
- Validasi di `createBooking` mutation
- Environment variable: `KELOMPOK1_FLIGHT_SCHEDULE_SERVICE`

**Konfigurasi**:
```yaml
# docker-compose.yml (Kelompok 2)
booking-service:
  environment:
    - KELOMPOK1_FLIGHT_SCHEDULE_SERVICE=http://host.docker.internal:4002
```

---

## 🚀 Cara Menggunakan

### Prasyarat

1. **Jalankan Kelompok 1**:
   ```bash
   cd "C:\KAMPUS\SEMESTER 5\EAI\TUBES js v2"
   docker-compose up --build
   ```

2. **Jalankan Kelompok 2**:
   ```bash
   cd "C:\KAMPUS\SEMESTER 5\IAE_TuBes-front-end"
   docker-compose up --build
   ```

**⚠️ Penting**: Pastikan kedua kelompok berjalan secara bersamaan!

---

### Test 1: Query Booking dari Kelompok 2 (Kelompok 1)

**Endpoint**: http://localhost:4000/graphql (Gateway Kelompok 1)

**Step 1: Login**
```graphql
mutation {
  login(username: "testuser", password: "password123") {
    token
  }
}
```

**Step 2: Query Booking dari Kelompok 2**
```graphql
query {
  kelompok2BookingById(bookingId: "1") {
    id
    userId
    type
    hotelName
    flightCode
    passengerName
    status
  }
}
```

**Headers**:
```json
{
  "Authorization": "Bearer <token>"
}
```

---

### Test 2: Query Flight Schedule dari Kelompok 1 (Kelompok 2)

**Endpoint**: http://localhost:4000/graphql (Gateway Kelompok 2)

**Step 1: Login di Kelompok 2**

**Step 2: Query Flight Schedule**
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

---

### Test 3: Create Booking dengan Validasi (Kelompok 2)

**Mutation**:
```graphql
mutation {
  createBooking(
    type: "FLIGHT"
    flightCode: "JMK001"
    passengerName: "Test User"
  ) {
    id
    status
    flightCode
    passengerName
  }
}
```

**Catatan**: Booking Service akan otomatis memvalidasi flight schedule dari Kelompok 1 sebelum membuat booking.

---

## 📊 Schema Mapping

### Booking Kelompok 2 → Kelompok 1

| Field Kelompok 2 | Field Kelompok 1 | Keterangan |
|------------------|-------------------|------------|
| id | id | Booking ID |
| userId | userId | User ID |
| type | - | Type booking (FLIGHT/HOTEL) |
| hotelName | - | Nama hotel (jika type HOTEL) |
| flightCode | flightCode | Flight code (jika type FLIGHT) |
| passengerName | passengerName | Nama penumpang |
| status | status | Status booking |

---

## 🔧 Troubleshooting

### Error: Connection Refused

**Penyebab**: Service kelompok lain belum running

**Solusi**:
1. Pastikan kedua kelompok running:
   ```bash
   # Kelompok 1
   docker-compose ps
   
   # Kelompok 2
   docker-compose ps
   ```

2. Cek port:
   - Kelompok 1 Flight Schedule: Port 4002
   - Kelompok 2 Booking Service: Port 4003

3. Test koneksi:
   ```bash
   curl http://localhost:4002
   curl http://localhost:4003
   ```

### Error: Booking tidak ditemukan

**Penyebab**: Booking ID tidak ada di Kelompok 2

**Solusi**:
1. Buat booking terlebih dahulu di Kelompok 2
2. Gunakan ID booking yang valid
3. Cek database Kelompok 2

### Error: Flight tidak aktif / Kursi tidak tersedia

**Penyebab**: Validasi flight schedule gagal

**Solusi**:
1. Pastikan flight schedule ada di Kelompok 1
2. Pastikan status flight adalah `ACTIVE`
3. Pastikan available seats >= 1

---

## 📝 Checklist Integrasi

### Kelompok 1
- [x] Environment variable `KELOMPOK2_BOOKING_SERVICE` sudah ditambahkan
- [x] Helper function `getKelompok2Booking()` sudah dibuat
- [x] Query `kelompok2BookingById` sudah diimplementasikan
- [x] Schema `Kelompok2BookingInfo` sudah disesuaikan dengan schema baru

### Kelompok 2
- [x] Environment variable `KELOMPOK1_FLIGHT_SCHEDULE_SERVICE` sudah ditambahkan
- [x] Helper function `getKelompok1FlightSchedule()` sudah dibuat
- [x] Query `bookingById` sudah ditambahkan untuk integrasi
- [x] Query `kelompok1FlightSchedule` sudah diimplementasikan
- [x] Validasi di `createBooking` sudah ditambahkan
- [x] Package.json sudah include `axios`

---

## 🔄 Perbedaan dengan Versi Sebelumnya

| Aspek | Versi Lama (IAE_TuBes-main) | Versi Baru (IAE_TuBes-front-end) |
|-------|----------------------------|----------------------------------|
| Schema Booking | `flightScheduleId` | `type`, `hotelName`, `flightCode` |
| Query Booking | Perlu payment info | Hanya booking ID |
| Validasi | Tidak ada | Validasi flight schedule otomatis |
| Type Booking | Hanya FLIGHT | FLIGHT atau HOTEL |

---

## 📚 Referensi

- Dokumentasi lengkap: `INTEGRASI_DENGAN_KELOMPOK2.md`
- Dokumentasi umum: `INTEGRASI_LINTAS_KELOMPOK.md`

---

**Last Updated**: 2025-01-15  
**Status**: ✅ Updated  
**Version**: 2.0.0


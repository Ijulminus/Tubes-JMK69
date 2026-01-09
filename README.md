# Sistem Integrasi Aplikasi Enterprise JMK AIR

Sistem Aplikasi Integrasi JMK AIR berbasis airline yang dibangun menggunakan pendekatan microservices dan berkomunikasi melalui GraphQL di atas HTTP, serta di deploy secara terisolasi menggunakan Docker.

## Arsitektur Sistem

Sistem terdiri dari 5 microservices utama:

1. **Auth Service** (Port 4001) - Pusat autentikasi dan manajemen pengguna dengan JWT
2. **Flight Schedule Service** (Port 4002) - Pengelolaan jadwal penerbangan dan ketersediaan kursi
3. **Flight Booking Service** (Port 4003) - Pemesanan tiket dan proses pembayaran
4. **Parcel Service** (Port 4004) - Layanan pengiriman logistik udara
5. **Onboard Service** (Port 4005) - Pemesanan layanan dalam penerbangan (makanan/minuman)

**GraphQL Gateway** (Port 4000) - Gateway terpusat untuk mengakses semua service

## Teknologi yang Digunakan

- **Node.js** dengan **Apollo Server** dan **GraphQL**
- **PostgreSQL** sebagai database untuk setiap service
- **Docker** dan **Docker Compose** untuk deployment
- **JWT** untuk autentikasi
- **Sequelize** sebagai ORM

## Struktur Proyek

```
TUBES js/
├── auth-service/              # Auth Service
│   ├── models/
│   │   └── User.js
│   ├── db.js
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
├── flight-schedule-service/   # Flight Schedule Service
│   ├── models/
│   │   └── FlightSchedule.js
│   ├── db.js
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
├── flight-booking-service/    # Flight Booking Service
│   ├── models/
│   │   └── Booking.js
│   ├── db.js
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
├── parcel-service/           # Parcel Service
│   ├── models/
│   │   └── ParcelOrder.js
│   ├── db.js
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
├── onboard-service/          # Onboard Service
│   ├── models/
│   │   ├── OnboardOrder.js
│   │   └── MenuItem.js
│   ├── db.js
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
├── graphql-gateway/          # GraphQL Gateway
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
├── schemas/                  # GraphQL Schema Files
│   ├── auth.graphql
│   ├── flight-schedule.graphql
│   ├── flight-booking.graphql
│   ├── parcel.graphql
│   └── onboard.graphql
├── queries/                   # Example Queries
│   └── example-queries.graphql
├── docker-compose.yml
└── README.md
```

## Cara Menjalankan

### Prasyarat

- Docker dan Docker Compose terinstall
- Port 4000-4005 tersedia

### Langkah-langkah

1. Clone atau download repository ini

2. Jalankan semua service dengan Docker Compose:
```bash
docker-compose up --build
```

3. Tunggu hingga semua service siap (biasanya 30-60 detik)

4. Akses GraphQL Gateway di:
   - **URL**: http://localhost:4000
   - **GraphQL Playground**: http://localhost:4000/graphql

5. Akses individual service (opsional):
   - Auth Service: http://localhost:4001/graphql
   - Flight Schedule Service: http://localhost:4002/graphql
   - Flight Booking Service: http://localhost:4003/graphql
   - Parcel Service: http://localhost:4004/graphql
   - Onboard Service: http://localhost:4005/graphql

## Contoh Penggunaan

### 1. Register User

```graphql
mutation {
  register(
    username: "johndoe"
    fullName: "John Doe"
    email: "john@example.com"
    password: "password123"
  ) {
    id
    username
    email
  }
}
```

### 2. Login

```graphql
mutation {
  login(username: "johndoe", password: "password123") {
    token
    user {
      id
      username
      role
    }
  }
}
```

### 3. Create Flight Schedule (dengan token)

```graphql
mutation {
  createFlightSchedule(
    flightCode: "JMK001"
    aircraftType: "Boeing 737"
    departureLocation: "Jakarta"
    destinationLocation: "Bandung"
    departureTime: "2025-01-15T08:00:00Z"
    arrivalTime: "2025-01-15T09:30:00Z"
    price: 500000
    totalSeats: 150
  ) {
    id
    flightCode
    availableSeats
  }
}
```

### 4. Create Booking (dengan token)

Set header Authorization:
```
Authorization: Bearer <token_dari_login>
```

```graphql
mutation {
  createBooking(
    flightCode: "JMK001"
    passengerName: "John Doe"
    numberOfSeats: 2
  ) {
    id
    flightCode
    totalPrice
    status
  }
}
```

## Integrasi Lintas Kelompok

Sistem ini dirancang untuk mendukung integrasi lintas kelompok:

- **Sebagai Consumer**: Flight Booking Service dapat mengkonsumsi External Booking Service dari kelompok lain untuk mengambil dan sinkronisasi booking
- **Sebagai Provider**: 
  - Auth Service menyediakan endpoint GraphQL untuk validasi identitas pengguna lintas sistem
  - Flight Booking Service menyediakan endpoint untuk melihat booking yang dibuat di sistem JMK AIR

### Dokumentasi Lengkap

Lihat file **[INTEGRASI_LINTAS_KELOMPOK.md](./INTEGRASI_LINTAS_KELOMPOK.md)** untuk dokumentasi lengkap tentang:
- Cara mengkonsumsi endpoint dari kelompok lain
- Cara menyediakan endpoint untuk kelompok lain
- Contoh queries dan mutations
- Konfigurasi network dan environment variables
- Troubleshooting

### Contoh Integrasi sebagai Consumer

Flight Booking Service dapat mengambil booking dari kelompok lain:

```graphql
# Mengambil booking dari kelompok lain
query {
  externalBookingById(externalBookingId: "123") {
    id
    bookingCode
    passengerName
    status
  }
}

# Sinkronisasi booking dari kelompok lain
mutation {
  syncExternalBooking(externalBookingId: "123") {
    id
    passengerName
    status
    externalBookingId
  }
}
```

### Contoh Endpoint sebagai Provider

Auth Service menyediakan endpoint untuk kelompok lain:

```graphql
query {
  userById(id: "1") {
    id
    username
    fullName
    role
  }
}
```

## Database

Setiap service memiliki database PostgreSQL terpisah:

- `auth_db` - Auth Service
- `flight_schedule_db` - Flight Schedule Service
- `flight_booking_db` - Flight Booking Service
- `parcel_db` - Parcel Service
- `onboard_db` - Onboard Service

Data akan persisten dalam Docker volumes.

## Environment Variables

Default environment variables sudah diset di `docker-compose.yml`. Untuk production, disarankan menggunakan file `.env` atau secrets management.

## Testing

Untuk testing, gunakan GraphQL Playground di http://localhost:4000/graphql dan ikuti contoh queries di folder `queries/`.

## Troubleshooting

1. **Service tidak bisa connect ke database**: Pastikan database container sudah healthy sebelum service container start
2. **Port sudah digunakan**: Ubah port di `docker-compose.yml` jika diperlukan
3. **Token tidak valid**: Pastikan menggunakan token yang valid dari login dan set header `Authorization: Bearer <token>`

## Kontributor

- Ahmad Dzulfikar (102022300009)
- Jhonata Fernanda (102022300052)
- Keiko Kesha Zakir Heryadi (102022300071)
- Zahran Athallah Syafiq (102022300081)

## License

Proyek ini dibuat untuk keperluan akademik.


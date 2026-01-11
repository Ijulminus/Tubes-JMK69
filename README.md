# TUBES JS v2.5 (Maskapai) — Dokumentasi Final

Repo ini berisi sistem **Maskapai** berbasis **microservices** (Node.js + PostgreSQL) yang terhubung lewat **Apollo GraphQL Federation**.

Komponen:
- **graphql-gateway**: 1 endpoint GraphQL gabungan
- Subgraph services:
  - **auth-service** (JWT)
  - **flight-schedule-service** (jadwal penerbangan)
  - **flight-booking-service** (booking + pembayaran + sinkronisasi booking partner)
  - **parcel-service** (pengiriman paket)
  - **onboard-service** (menu & order makanan dalam pesawat)
- **external-booking-service**: service GraphQL terpisah (bukan bagian federation) untuk simulasi/partner eksternal
- **edge-proxy (nginx)**: reverse proxy opsional untuk mempermudah expose via internet (ngrok)

---

## 1) Prasyarat
- Docker Desktop (Windows/Mac/Linux) + Docker Compose
- Port tidak bentrok: `4000-4005`, `5000`, `8080`
- (Opsional, untuk integrasi jarak jauh) akun **ngrok** + ngrok agent

---

## 2) Struktur Folder (ringkas)
- `docker-compose.yml` — menjalankan semua service + DB
- `graphql-gateway/` — Apollo Gateway (federation)
- `auth-service/` — login/register JWT
- `flight-schedule-service/` — jadwal penerbangan
- `flight-booking-service/` — booking flight + sync partner
- `parcel-service/` — parcel order
- `onboard-service/` — onboard menu & order
- `external-booking-service/` — mock/partner booking service
- `edge-proxy/` — nginx config untuk port 8080

---

## 3) Daftar Service & Port

| Service | Host Port | Keterangan |
|---|---:|---|
| graphql-gateway | `4000` | Endpoint utama untuk client (federation) |
| auth-service | `4001` | Register/Login + Query user |
| flight-schedule-service | `4002` | Jadwal penerbangan |
| flight-booking-service | `4003` | Booking + pembayaran + sinkronisasi partner |
| parcel-service | `4004` | Parcel order |
| onboard-service | `4005` | Menu & order onboard |
| external-booking-service | `5000` | Mock/partner booking service (container:4000) |
| edge-proxy (nginx) | `8080` | Reverse proxy `/schedule/` & `/booking/` + `/healthz` |

Semua service GraphQL (kecuali nginx) memakai endpoint HTTP di root path `/`.

---

## 4) Konfigurasi Environment (.env)

Di root repo, buat file `.env` dari `.env.example`:

```bash
# Windows PowerShell
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

Isi penting:
- `JWT_SECRET` — secret JWT (harus sama antara `auth-service` dan `graphql-gateway`)
- `PARTNER_API_KEY` — dipakai untuk query partner di `flight-booking-service` (header `x-api-key`)
- `KELOMPOK2_BOOKING_SERVICE` — URL booking service partner (Travel App / kelompok lain)
- `EXTERNAL_DEFAULT_USER_ID` — default `userId` untuk booking yang di-import (jika sumber tidak punya userId)

> Catatan: `external-booking-service` default jalan di docker network, jadi `flight-booking-service` mengaksesnya lewat `http://external-booking-service:4000` (sudah di-set di docker-compose).

---

## 5) Menjalankan Semua Service (Docker)

Jalankan dari folder yang berisi `docker-compose.yml`:

```bash
docker compose up --build
```

Cek container:

```bash
docker compose ps
```

Cek edge-proxy healthcheck:
- Buka `http://localhost:8080/healthz` → harusnya menampilkan `ok`

> Kalau `http://localhost:8080/healthz` malah 404 dari Apache/IIS, berarti port 8080 dipakai service lain. Matikan dulu (contoh: Apache di XAMPP).

---

## 6) Cara Mengakses GraphQL

### Opsi A — via Gateway (disarankan)
- Endpoint: `http://localhost:4000/`
- Untuk operasi yang butuh login, kirim header:
  - `Authorization: Bearer <TOKEN_JWT>`

Gateway akan decode JWT dan meneruskan `user-id` ke subgraph yang butuh.

### Opsi B — akses subgraph langsung (untuk debug)
Kalau hit endpoint subgraph secara langsung, beberapa service **tidak** decode JWT, jadi Anda perlu kirim header:
- `user-id: <angka>`

Service yang biasanya butuh `user-id`:
- `flight-booking-service` (untuk `createBooking`, `bookings`, dll)
- `parcel-service`
- `onboard-service`
- `external-booking-service`

### Opsi C — Apollo Sandbox
Buka `https://studio.apollographql.com/sandbox/explorer`, lalu ganti endpoint ke salah satu URL di atas.

---

## 7) Header Penting

| Header | Dipakai untuk | Contoh |
|---|---|---|
| `Authorization` | Gateway (JWT) | `Bearer eyJ...` |
| `user-id` | Akses subgraph langsung / external-booking-service | `1` |
| `x-api-key` | Query partner (flight-booking-service) | `PARTNER_SECRET` |

---

## 8) Referensi Query/Mutation Lengkap

### 8.1 Auth Service (juga tersedia lewat Gateway)
Endpoint (direct): `http://localhost:4001/`

#### Register
```graphql
mutation {
  register(
    fullName: "Budi"
    username: "budi"
    email: "budi@mail.com"
    password: "123456"
    role: "USER"
  ) {
    token
    user { id fullName username email role }
  }
}
```

#### Login
```graphql
mutation {
  login(username: "budi", password: "123456") {
    token
    user { id fullName username email role }
  }
}
```

#### Me (butuh Authorization)
```graphql
query {
  me { id fullName username email role }
}
```

#### userById
```graphql
query {
  userById(id: 1) { id fullName username email role }
}
```

---

### 8.2 Flight Schedule Service (juga tersedia lewat Gateway)
Endpoint (direct): `http://localhost:4002/`

#### Lihat semua jadwal
```graphql
query {
  airlineFlightSchedules {
    id
    flightCode
    origin
    destination
    departureTime
    arrivalTime
    price
    seatsAvailable
    status
  }
}
```

#### Ambil jadwal by code
```graphql
query {
  airlineFlightByCode(flightCode: "GA-123") {
    id
    flightCode
    origin
    destination
    seatsAvailable
    status
  }
}
```

#### Cari jadwal (origin + destination)
```graphql
query {
  searchFlightSchedules(origin: "CGK", destination: "DPS") {
    flightCode
    departureTime
    price
    seatsAvailable
  }
}
```

#### Tambah jadwal (admin/opsional)
```graphql
mutation {
  addFlightSchedule(
    input: {
      flightCode: "GA-123"
      origin: "CGK"
      destination: "DPS"
      departureTime: "2026-01-15T08:00:00Z"
      arrivalTime: "2026-01-15T10:00:00Z"
      price: 1200000
      seatsAvailable: 180
      status: "ACTIVE"
    }
  ) {
    id
    flightCode
  }
}
```

#### Update status flight
```graphql
mutation {
  updateFlightStatus(flightCode: "GA-123", status: "DELAYED") {
    flightCode
    status
  }
}
```

> `decreaseSeats(flightCode, seats)` biasanya dipanggil internal dari booking service.

---

### 8.3 Flight Booking Service (juga tersedia lewat Gateway)
Endpoint (direct): `http://localhost:4003/`

> Jika akses **via gateway**: gunakan `Authorization: Bearer <token>`.
> Jika akses **langsung** ke 4003: gunakan `user-id: <id>` untuk operasi yang butuh user.

#### Membuat booking
```graphql
mutation {
  createBooking(
    flightCode: "GA-123"
    passengerName: "Budi"
    numberOfSeats: 1
  ) {
    id
    flightCode
    passengerName
    numberOfSeats
    totalPrice
    status
    paymentStatus
  }
}
```

#### List booking milik user
```graphql
query {
  bookings {
    id
    flightCode
    passengerName
    status
    paymentStatus
    externalBookingId
  }
}
```

#### bookingById
```graphql
query {
  bookingById(id: 1) {
    id
    flightCode
    passengerName
    status
    paymentStatus
  }
}
```

#### bookingByFlightCode
```graphql
query {
  bookingByFlightCode(flightCode: "GA-123") {
    id
    passengerName
    status
  }
}
```

#### Update status booking
```graphql
mutation {
  updateBookingStatus(id: 1, status: "CANCELLED") {
    id
    status
  }
}
```

#### Konfirmasi pembayaran
```graphql
mutation {
  confirmPayment(id: 1) {
    id
    status
    paymentStatus
  }
}
```

#### Sinkronisasi booking dari External Booking Service (mock/partner)
- Prasyarat: booking sudah ada di `external-booking-service`.

```graphql
mutation {
  syncExternalBooking(externalBookingId: "3") {
    id
    flightCode
    passengerName
    externalBookingId
    status
  }
}
```

#### Sinkronisasi booking dari Kelompok2/Travel App
- Pastikan `.env` mengarah ke GraphQL booking partner, contoh:
  - `KELOMPOK2_BOOKING_SERVICE=http://IP_LAPTOP_TRAVEL:4003/` (LAN)
  - atau `KELOMPOK2_BOOKING_SERVICE=https://xxxxx.ngrok-free.app/booking/` (via edge-proxy)

```graphql
mutation {
  syncKelompok2Booking(externalBookingId: 3) {
    id
    flightCode
    passengerName
    externalBookingId
    status
  }
}
```

#### Query partnerImportedBookings (butuh x-api-key)
Header:
- `x-api-key: <PARTNER_API_KEY>`

```graphql
query {
  partnerImportedBookings {
    id
    flightCode
    passengerName
    externalBookingId
    status
  }
}
```

#### partnerBookingByExternalId (butuh x-api-key)
```graphql
query {
  bookingByExternalId(externalBookingId: "3") {
    id
    flightCode
    passengerName
    status
  }
}
```

> `externalBookingById` dan `kelompok2BookingById` biasanya untuk debug (cek data sumber).

---

### 8.4 Parcel Service (juga tersedia lewat Gateway)
Endpoint (direct): `http://localhost:4004/`

Header:
- via gateway: `Authorization: Bearer <token>`
- direct: `user-id: <id>`

#### Buat parcel order
```graphql
mutation {
  createParcelOrder(
    bookingId: 1
    receiverName: "Andi"
    receiverAddress: "Jl. Mawar No. 1"
    itemDescription: "Laptop"
    weight: 2.5
  ) {
    id
    status
  }
}
```

#### List parcel order user
```graphql
query {
  myParcelOrders {
    id
    receiverName
    receiverAddress
    itemDescription
    weight
    status
    bookingId
  }
}
```

#### Update status parcel
```graphql
mutation {
  updateParcelOrderStatus(id: 1, status: "IN_TRANSIT") {
    id
    status
  }
}
```

---

### 8.5 Onboard Service (juga tersedia lewat Gateway)
Endpoint (direct): `http://localhost:4005/`

Header:
- via gateway: `Authorization: Bearer <token>`
- direct: `user-id: <id>`

#### Lihat menu
```graphql
query {
  menus {
    id
    name
    price
  }
}
```

#### Tambah menu item
```graphql
mutation {
  createMenuItem(name: "Nasi Goreng", price: 35000) {
    id
    name
    price
  }
}
```

#### Buat order onboard
```graphql
mutation {
  createOnboardOrder(bookingId: 1, menuId: 1, quantity: 2) {
    id
    bookingId
    menuId
    quantity
    totalPrice
    status
  }
}
```

#### List order user
```graphql
query {
  onboardOrders {
    id
    menuId
    quantity
    totalPrice
    status
  }
}
```

#### Update status order
```graphql
mutation {
  updateOnboardOrderStatus(id: 1, status: "SERVED") {
    id
    status
  }
}
```

> Onboard order akan valid jika `bookingId` milik user dan status booking sudah sesuai aturan di service.

---

### 8.6 External Booking Service (Mock/Partner) — Endpoint Terpisah
Endpoint: `http://localhost:5000/`

Header wajib:
- `user-id: <id>` (contoh `1`)

#### Create booking (di partner/mock)
```graphql
mutation {
  createBooking(type: "FLIGHT", flightCode: "GA-123", passengerName: "Budi") {
    id
    type
    status
    flightCode
    passengerName
  }
}
```

#### List booking user (di partner/mock)
```graphql
query {
  myBookings {
    id
    flightCode
    passengerName
    status
  }
}
```

> Setelah ada booking di sini, Anda bisa tarik ke sistem maskapai memakai `syncExternalBooking` di flight-booking-service.

---

## 9) Integrasi Jarak Jauh via Internet (Ngrok)

Ada 2 cara umum:

### Cara 1 — Expose langsung port service
- `ngrok http 4002` untuk schedule
- `ngrok http 4003` untuk booking

Lalu di Travel App set:
- `AIRLINE_FLIGHT_SCHEDULE_SERVICE=<URL_NGROK_4002>`
- `AIRLINE_FLIGHT_BOOKING_SERVICE=<URL_NGROK_4003>`

### Cara 2 — Expose 1 port lewat edge-proxy (lebih rapi)
Repo ini menyediakan nginx `edge-proxy` di port `8080`:
- `http://localhost:8080/healthz` → ok
- `http://localhost:8080/schedule/` → proxy ke schedule service
- `http://localhost:8080/booking/` → proxy ke booking service

Expose dengan ngrok:
```bash
ngrok http 8080
```

Di Travel App set:
- `AIRLINE_FLIGHT_SCHEDULE_SERVICE=https://<NGROK_BASE>/schedule/`
- `AIRLINE_FLIGHT_BOOKING_SERVICE=https://<NGROK_BASE>/booking/`

---

## 10) Troubleshooting

### `Unauthorized partner`
- Pastikan header `x-api-key` dikirim.
- Pastikan nilainya sama dengan `.env` → `PARTNER_API_KEY`.

### `ERR_NGROK_8012` / `connection refused`
- Service belum jalan / port salah.
- Cek `docker compose ps` dan pastikan portnya LISTEN.

### `http://localhost:8080/healthz` 404 tapi servernya Apache/IIS
- Port 8080 dipakai Apache/XAMPP/IIS.
- Matikan service itu, lalu restart docker compose.

### Query kosong (array `[]`)
- Itu berarti tidak ada data untuk user tersebut (cek `user-id`/JWT yang dipakai).
- Untuk booking partner, pastikan sudah menjalankan `syncExternalBooking` / `syncKelompok2Booking` terlebih dahulu.

---

## 11) Catatan
- Banyak file dokumentasi versi lama sudah dihapus dari paket ini agar tidak membingungkan.
- Bila ingin demo cepat: pakai gateway (`http://localhost:4000/`) + flow register → login → gunakan token untuk query/mutation lainnya.

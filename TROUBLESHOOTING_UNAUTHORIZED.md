# Troubleshooting: Error "Unauthorized" saat Create Parcel Order

## 🔴 Masalah

Saat mencoba create parcel order, muncul error:
```
Booking tidak valid: Unauthorized
```

## 🔍 Penyebab

Error ini terjadi karena:

1. **Parcel Service** memanggil **Flight Booking Service** untuk validasi booking
2. **Flight Booking Service** memerlukan header `user-id` untuk query `bookingById`
3. Header `user-id` tidak terkirim dengan benar karena:
   - Header `Content-Type` tidak ada
   - Format axios.post salah (headers harus sebagai parameter terpisah)

## ✅ Solusi yang Sudah Diterapkan

### 1. Perbaikan di Parcel Service

**File**: `parcel-service/index.js`

**Sebelum** (Salah):
```javascript
const response = await axios.post(`${FLIGHT_BOOKING_SERVICE}`, {
  query: `...`,
  headers: {
    'user-id': userId.toString()
  }
});
```

**Sesudah** (Benar):
```javascript
const headers = {
  'Content-Type': 'application/json',
  'user-id': userId.toString()
};

const response = await axios.post(
  `${FLIGHT_BOOKING_SERVICE}`,
  {
    query: `...`
  },
  { headers }
);
```

### 2. Perbaikan di Onboard Service

**File**: `onboard-service/index.js`

Perbaikan yang sama juga diterapkan di onboard service.

## 🧪 Testing

### Step 1: Pastikan Sudah Login

**Query**:
```graphql
mutation {
  login(username: "testuser", password: "password123") {
    token
    user {
      id
    }
  }
}
```

**Simpan token!**

### Step 2: Create Flight Schedule

**Query**:
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

### Step 3: Create Booking

**Query**:
```graphql
mutation {
  createBooking(
    flightCode: "JMK001"
    passengerName: "Test User"
    numberOfSeats: 2
  ) {
    id
    flightCode
    status
  }
}
```

**Simpan booking ID!**

### Step 4: Confirm Payment

**Query**:
```graphql
mutation {
  confirmPayment(bookingId: "1", paymentId: "PAY12345") {
    id
    status
    paymentStatus
  }
}
```

**⚠️ Penting**: Booking harus dalam status `CONFIRMED` untuk bisa create parcel order!

### Step 5: Create Parcel Order

**Query**:
```graphql
mutation {
  createParcelOrder(
    bookingId: 1
    flightCode: "JMK001"
    senderName: "Test User"
    senderAddress: "Jakarta"
    receiverName: "Receiver"
    receiverAddress: "Bandung"
    weight: 5.5
    dimensions: "30x20x15"
  ) {
    id
    flightCode
    cost
    status
  }
}
```

**Headers**:
```json
{
  "Authorization": "Bearer <token_dari_step_1>"
}
```

## 🔧 Checklist Troubleshooting

Jika masih error, cek:

- [ ] Sudah login dan mendapatkan token?
- [ ] Header `Authorization: Bearer <token>` sudah diset?
- [ ] Booking sudah dibuat?
- [ ] Booking status sudah `CONFIRMED` (sudah confirm payment)?
- [ ] Booking ID yang digunakan benar?
- [ ] Flight Booking Service sudah running?
- [ ] Network antara Parcel Service dan Flight Booking Service terhubung?

## 📝 Catatan Penting

1. **Booking Status**: Parcel order hanya bisa dibuat jika booking status = `CONFIRMED`
2. **Payment**: Harus confirm payment dulu sebelum create parcel order
3. **User ID**: Header `user-id` harus sesuai dengan user yang membuat booking

## 🔄 Alur yang Benar

```
1. Login → Dapat token
2. Create Flight Schedule
3. Create Booking → Status: BOOKED
4. Confirm Payment → Status: CONFIRMED
5. Create Parcel Order → ✅ Berhasil
```

## 🐛 Error Lain yang Mungkin Terjadi

### Error: "Booking harus dalam status CONFIRMED"

**Penyebab**: Booking belum di-confirm payment

**Solusi**: Confirm payment terlebih dahulu:
```graphql
mutation {
  confirmPayment(bookingId: "1", paymentId: "PAY12345") {
    id
    status
    paymentStatus
  }
}
```

### Error: "Booking tidak ditemukan"

**Penyebab**: Booking ID tidak ada atau salah

**Solusi**: 
1. Cek booking ID yang digunakan
2. Pastikan booking dibuat oleh user yang sama yang login
3. Query myBookings untuk melihat booking yang ada:
```graphql
query {
  myBookings {
    id
    flightCode
    status
  }
}
```

### Error: "Tidak dapat terhubung ke flight booking service"

**Penyebab**: Flight Booking Service belum running

**Solusi**:
1. Cek service sudah running:
   ```bash
   docker-compose ps
   ```
2. Restart service:
   ```bash
   docker-compose restart flight-booking-service
   ```

---

**Last Updated**: 2025-01-15  
**Status**: ✅ Fixed


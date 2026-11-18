# SkillSwap FE

Frontend SkillSwap: **React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router**.
Desain mengikuti file Figma *SkillSwap* dan datanya dari BE di folder `../BE`.

## Menjalankan

```bash
# 1. Jalankan BE dulu (default http://localhost:3000)
cd BE
npm install
npm run dev

# 2. Jalankan FE
cd FE
npm install
npm run dev        # http://localhost:5173
```

FE memanggil API lewat prefix `/api`, dan Vite meneruskannya ke BE (lihat `vite.config.ts`),
jadi BE **tidak perlu CORS** saat development. Kalau BE jalan di port lain, buat `FE/.env`:

```env
VITE_BACKEND_URL=http://localhost:3100
```

Script lain: `npm run build` (typecheck + build ke `dist/`), `npm run typecheck`, `npm run preview`.

## Halaman

| Figma | Route | Endpoint BE |
| --- | --- | --- |
| Start Page / Landing | `/` | – |
| Home | `/home` | `GET /user/:id/sessions`, `GET /user/:id/coins`, `POST /user/:id/daily-login` |
| Skill Setup | `/setup` | `GET /skill`, `GET /category`, `GET/POST /user/:id/skill(s)`, `DELETE /user-skill/:id` |
| Matches | `/browse` | `GET /users` *(baru)*, `GET /user/:id/skills` |
| Profile | `/users/:id`, `/profile` (punya sendiri) | `GET/PUT /user/:id`, `GET /user/:id/ratings`, `GET /user/:id/sessions` |
| Create Swap | `/swap/new?with=:userId` | `POST /user/:id/session` (TWO_WAY / ONE_WAY) |
| Review | `/sessions/:id/review` | `GET /session/:id`, `POST /session/:id/rating` |
| Certificate | `/sessions/:id/certificate` | `GET /session/:id/certificate` |

Halaman tambahan (tidak ada di Figma, tapi dibutuhkan fitur BE; gaya visualnya mengikuti Figma):
`/login`, `/register`, `/sessions` (start/selesai/batal sesi), `/certificates`, `/wallet`
(saldo, klaim harian, subscription, riwayat koin), `/about`.

## Struktur

```
src/
  assets/illustrations/   ilustrasi dari Figma (webp)
  components/             Header, SplitLayout, Avatar, Chip, Stepper, CertificateCard, ...
  context/AuthContext.tsx token JWT + data user (localStorage)
  hooks/useAsync.ts       helper fetch + loading/error
  lib/api.ts              semua endpoint BE (typed)
  lib/matching.ts         hitung "% Skill Match"
  pages/                  satu file per halaman
  index.css               design token Tailwind (@theme) dari Figma
```

## Catatan

- **Perubahan BE:** ditambah `GET /users` (protected) di `BE/src/handler/user.ts` untuk halaman
  Matches, karena sebelumnya tidak ada endpoint untuk melihat user lain beserta skill-nya.
  Respons tidak menyertakan email/password.
- **% Skill Match** dihitung di FE: skill yang sama = cocok penuh, kategori sama = setengah.
- Bar "Prototype screens" di bagian bawah Figma adalah navigasi prototype, jadi tidak dibuat.
- Filter **Online** dan menu **Blog** tidak dibuat karena tidak ada datanya di BE.
- User belum punya kolom bio, jadi bagian **About** di profil disusun dari skill & tanggal gabung.
- **Download Certificate** memakai dialog print browser (pilih "Save as PDF").

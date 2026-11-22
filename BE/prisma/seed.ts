import { PrismaClient } from "@prisma/client"
import "dotenv/config"

const prisma = new PrismaClient()

const data: Record<string, { icon: string; skills: [string, string][] }> = {
    Programming: {
        icon: "💻",
        skills: [
            ["React.js", "Frontend web development"],
            ["Python", "Backend & Data Science"],
            ["Node.js", "Backend JavaScript runtime"],
            ["JavaScript", "Dasar hingga lanjutan JavaScript"],
            ["TypeScript", "JavaScript dengan type safety"],
            ["Java", "Pemrograman berorientasi objek"],
            ["SQL & Database", "Query dan desain database"],
            ["Git & GitHub", "Version control dan kolaborasi tim"],
            ["HTML & CSS", "Dasar pembuatan tampilan web"],
            ["Flutter", "Pengembangan aplikasi mobile"],
            ["Laravel", "Framework web PHP"],
            ["Data Analysis", "Analisis dan visualisasi data"]
        ]
    },
    Musik: {
        icon: "🎸",
        skills: [
            ["Piano", "Instrumen tuts klasik dan pop"],
            ["Gitar", "Instrumen petik akustik dan elektrik"],
            ["Vokal", "Teknik bernyanyi"],
            ["Drum", "Dasar permainan drum"],
            ["Ukulele", "Instrumen petik untuk pemula"],
            ["Biola", "Instrumen gesek"]
        ]
    },
    Design: {
        icon: "🎨",
        skills: [
            ["UI/UX Design", "Desain antarmuka dan pengalaman pengguna"],
            ["Figma", "Desain dan prototipe di Figma"],
            ["Photoshop", "Edit foto dan desain grafis"],
            ["Illustrator", "Ilustrasi vektor dan logo"],
            ["Video Editing", "Editing video dan motion dasar"],
            ["Fotografi", "Teknik dasar fotografi"]
        ]
    },
    Bahasa: {
        icon: "🗣️",
        skills: [
            ["Bahasa Inggris", "Percakapan dan tulisan bahasa Inggris"],
            ["Bahasa Jepang", "Percakapan dan huruf Jepang"],
            ["Bahasa Korea", "Percakapan dan Hangeul"],
            ["Bahasa Mandarin", "Percakapan dan Hanzi dasar"],
            ["Bahasa Arab", "Percakapan dan membaca Arab"],
            ["Bahasa Jerman", "Percakapan dasar bahasa Jerman"]
        ]
    },
    "Bisnis & Soft Skill": {
        icon: "💼",
        skills: [
            ["Public Speaking", "Berbicara di depan umum"],
            ["Digital Marketing", "Pemasaran lewat media digital"],
            ["Copywriting", "Menulis teks yang menjual"],
            ["Manajemen Waktu", "Produktivitas dan perencanaan"]
        ]
    },
    Akademik: {
        icon: "📚",
        skills: [
            ["Matematika", "Kalkulus, aljabar, dan logika"],
            ["Statistik", "Statistik dasar dan analisis data"],
            ["Penulisan Ilmiah", "Skripsi, jurnal, dan sitasi"]
        ]
    }
}

async function main() {
    console.log("Mulai melakukan seeding data master...")

    for (const [categoryName, { icon, skills }] of Object.entries(data)) {
        const category = await prisma.category.upsert({
            where: { name: categoryName },
            update: {},
            create: { name: categoryName, icon }
        })

        for (const [name, description] of skills) {
            await prisma.skill.upsert({
                where: { name },
                update: {},
                create: { name, description, categoryId: category.id }
            })
        }
    }

    // Paket koin: hanya dibuat jika tabel masih kosong (tanpa return)
    if ((await prisma.coinPackage.count()) === 0) {
        await prisma.coinPackage.createMany({
            data: [
                { name: "Starter", coins: 50, price: 10000 },
                { name: "Basic", coins: 120, price: 20000 },
                { name: "Plus", coins: 300, price: 45000 },
                { name: "Pro", coins: 700, price: 95000 }
            ]
        })
        console.log("Paket koin dibuat.")
    }

    console.log("Seeding selesai!")
}

main()
    .catch((e) => {
        console.error("Terjadi kesalahan saat seeding:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
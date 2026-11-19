import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
    console.log("Mulai melakukan seeding data master...");

    const programming = await prisma.category.upsert({
        where: { name: "Programming" },
        update: {},
        create: { name: "Programming", icon: "💻" },
    });

    const music = await prisma.category.upsert({
        where: { name: "Musik" },
        update: {},
        create: { name: "Musik", icon: "🎸" },
    });

    const design = await prisma.category.upsert({
        where: { name: "Design" },
        update: {},
        create: { name: "Design", icon: "🎨" },
    });

    const language = await prisma.category.upsert({
        where: { name: "Bahasa" },
        update: {},
        create: { name: "Bahasa", icon: "🗣️" },
    });

    await prisma.skill.upsert({
        where: { name: "React.js" },
        update: {},
        create: { name: "React.js", categoryId: programming.id, description: "Frontend web development" },
    });

    await prisma.skill.upsert({
        where: { name: "Python" },
        update: {},
        create: { name: "Python", categoryId: programming.id, description: "Backend & Data Science" },
    });

    await prisma.skill.upsert({
        where: { name: "Node.js" },
        update: {},
        create: { name: "Node.js", categoryId: programming.id, description: "Backend JavaScript runtime" },
    });

    await prisma.skill.upsert({
        where: { name: "Piano" },
        update: {},
        create: { name: "Piano", categoryId: music.id, description: "Instrumen tuts klasik dan pop" },
    });

    await prisma.skill.upsert({
        where: { name: "Gitar" },
        update: {},
        create: { name: "Gitar", categoryId: music.id, description: "Instrumen petik akustik dan elektrik" },
    });

    await prisma.skill.upsert({
        where: { name: "UI/UX Design" },
        update: {},
        create: { name: "UI/UX Design", categoryId: design.id, description: "Desain antarmuka dan pengalaman pengguna" },
    });

    await prisma.skill.upsert({
        where: { name: "Bahasa Inggris" },
        update: {},
        create: { name: "Bahasa Inggris", categoryId: language.id, description: "Percakapan dan tulisan bahasa Inggris" },
    });

    console.log("Seeding selesai! Kategori dan Skill berhasil ditambahkan.");
}

main()
    .catch((e) => {
        console.error("Terjadi kesalahan saat seeding:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

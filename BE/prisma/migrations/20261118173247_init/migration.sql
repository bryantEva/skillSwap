/*
  Warnings:

  - A unique constraint covering the columns `[sessionId,reviewerId]` on the table `ratings` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `ratings` DROP FOREIGN KEY `ratings_sessionId_fkey`;

-- DropIndex
DROP INDEX `ratings_sessionId_key` ON `ratings`;

-- CreateIndex
CREATE UNIQUE INDEX `ratings_sessionId_reviewerId_key` ON `ratings`(`sessionId`, `reviewerId`);

-- AddForeignKey
ALTER TABLE `coin_transactions` ADD CONSTRAINT `coin_transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

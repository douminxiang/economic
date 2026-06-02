-- CreateTable
CREATE TABLE `auth_sessions` (
    `id` VARCHAR(36) NOT NULL,
    `userId` INTEGER NOT NULL,
    `deviceId` VARCHAR(100) NULL,
    `deviceName` VARCHAR(100) NULL,
    `ip` VARCHAR(45) NULL,
    `refreshHash` VARCHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `lastActiveAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `auth_sessions_userId_idx`(`userId`),
    INDEX `auth_sessions_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `auth_sessions` ADD CONSTRAINT `auth_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

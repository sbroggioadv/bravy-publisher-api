-- AlterTable
ALTER TABLE "social_accounts" ADD COLUMN     "last_refreshed_at" TIMESTAMP(3),
ADD COLUMN     "provider_user_id" TEXT,
ADD COLUMN     "user_access_token" TEXT;

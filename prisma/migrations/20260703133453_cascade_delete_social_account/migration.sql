-- DropForeignKey
ALTER TABLE "analytics" DROP CONSTRAINT "analytics_publish_target_id_fkey";

-- DropForeignKey
ALTER TABLE "publish_targets" DROP CONSTRAINT "publish_targets_social_account_id_fkey";

-- AddForeignKey
ALTER TABLE "publish_targets" ADD CONSTRAINT "publish_targets_social_account_id_fkey" FOREIGN KEY ("social_account_id") REFERENCES "social_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_publish_target_id_fkey" FOREIGN KEY ("publish_target_id") REFERENCES "publish_targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

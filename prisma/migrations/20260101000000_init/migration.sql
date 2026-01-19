-- CreateTable
CREATE TABLE "Follower" (
    "id" SERIAL NOT NULL,
    "githubId" INTEGER NOT NULL,
    "login" TEXT NOT NULL,
    "avatarUrl" TEXT NOT NULL,
    "htmlUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Follower_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowerSnapshot" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "followerId" INTEGER NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowerSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitorConfig" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "lastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitorConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Follower_githubId_key" ON "Follower"("githubId");

-- CreateIndex
CREATE INDEX "Follower_githubId_idx" ON "Follower"("githubId");

-- CreateIndex
CREATE INDEX "Follower_login_idx" ON "Follower"("login");

-- CreateIndex
CREATE INDEX "FollowerSnapshot_username_snapshotDate_idx" ON "FollowerSnapshot"("username", "snapshotDate");

-- CreateIndex
CREATE INDEX "FollowerSnapshot_followerId_idx" ON "FollowerSnapshot"("followerId");

-- CreateIndex
CREATE UNIQUE INDEX "MonitorConfig_username_key" ON "MonitorConfig"("username");

-- CreateIndex
CREATE INDEX "MonitorConfig_username_idx" ON "MonitorConfig"("username");

-- AddForeignKey
ALTER TABLE "FollowerSnapshot" ADD CONSTRAINT "FollowerSnapshot_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "Follower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

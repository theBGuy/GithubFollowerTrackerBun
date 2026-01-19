-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "githubUsername" TEXT NOT NULL,
    "webhook_url" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follower" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "githubId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar_url" TEXT NOT NULL,

    CONSTRAINT "Follower_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_githubUsername_key" ON "User"("githubUsername");

-- CreateIndex
CREATE INDEX "User_githubUsername_idx" ON "User"("githubUsername");

-- CreateIndex
CREATE INDEX "Follower_githubId_idx" ON "Follower"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "Follower_userId_githubId_key" ON "Follower"("userId", "githubId");

-- AddForeignKey
ALTER TABLE "Follower" ADD CONSTRAINT "Follower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

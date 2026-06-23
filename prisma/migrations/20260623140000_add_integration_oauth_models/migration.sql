-- CreateTable
CREATE TABLE "IntegrationClient" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "redirectUris" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scopes" TEXT[],
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationToken" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "accessTokenHash" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationClient_clientId_key" ON "IntegrationClient"("clientId");

-- CreateIndex
CREATE INDEX "IntegrationGrant_userId_idx" ON "IntegrationGrant"("userId");

-- CreateIndex
CREATE INDEX "IntegrationGrant_clientId_idx" ON "IntegrationGrant"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationToken_accessTokenHash_key" ON "IntegrationToken"("accessTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationToken_refreshTokenHash_key" ON "IntegrationToken"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "IntegrationToken_grantId_idx" ON "IntegrationToken"("grantId");

-- AddForeignKey
ALTER TABLE "IntegrationGrant" ADD CONSTRAINT "IntegrationGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationGrant" ADD CONSTRAINT "IntegrationGrant_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "IntegrationClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationToken" ADD CONSTRAINT "IntegrationToken_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "IntegrationGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

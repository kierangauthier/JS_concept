-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'pdf',
    "page" INTEGER,
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_chunks_companyId_idx" ON "knowledge_chunks"("companyId");
CREATE INDEX "knowledge_chunks_source_idx" ON "knowledge_chunks"("source");

-- Full-text search index (French)
CREATE INDEX "knowledge_chunks_fts_idx" ON "knowledge_chunks"
  USING gin(to_tsvector('french', "content"));

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Question_categoryId_idx" ON "Question"("categoryId");

-- CreateIndex
CREATE INDEX "Question_type_idx" ON "Question"("type");

-- CreateIndex
CREATE INDEX "Question_categoryId_type_idx" ON "Question"("categoryId", "type");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

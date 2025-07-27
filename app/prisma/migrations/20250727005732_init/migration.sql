-- CreateTable
CREATE TABLE "DocumentType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentField" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "documentId" INTEGER NOT NULL,

    CONSTRAINT "DocumentField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "hiredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" SERIAL NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "desc" TEXT,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "employeeId" INTEGER NOT NULL,
    "documentTypeId" INTEGER NOT NULL,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocumentFieldValue" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "employeeDocumentId" INTEGER NOT NULL,
    "documentFieldId" INTEGER NOT NULL,

    CONSTRAINT "EmployeeDocumentFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentType_name_key" ON "DocumentType"("name");

-- CreateIndex
CREATE INDEX "DocumentType_id_name_idx" ON "DocumentType"("id", "name");

-- CreateIndex
CREATE INDEX "DocumentField_id_name_required_idx" ON "DocumentField"("id", "name", "required");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_cpf_key" ON "Employee"("cpf");

-- CreateIndex
CREATE INDEX "Employee_id_cpf_idx" ON "Employee"("id", "cpf");

-- CreateIndex
CREATE INDEX "EmployeeDocument_id_sent_required_employeeId_idx" ON "EmployeeDocument"("id", "sent", "required", "employeeId");

-- CreateIndex
CREATE INDEX "EmployeeDocumentFieldValue_id_employeeDocumentId_documentFi_idx" ON "EmployeeDocumentFieldValue"("id", "employeeDocumentId", "documentFieldId");

-- AddForeignKey
ALTER TABLE "DocumentField" ADD CONSTRAINT "DocumentField_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DocumentType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocumentFieldValue" ADD CONSTRAINT "EmployeeDocumentFieldValue_employeeDocumentId_fkey" FOREIGN KEY ("employeeDocumentId") REFERENCES "EmployeeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocumentFieldValue" ADD CONSTRAINT "EmployeeDocumentFieldValue_documentFieldId_fkey" FOREIGN KEY ("documentFieldId") REFERENCES "DocumentField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

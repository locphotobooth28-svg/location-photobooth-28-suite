ALTER TABLE "Material"
ADD COLUMN "defaultPrice" DECIMAL(10,2);

ALTER TABLE "EventMaterial"
ADD COLUMN "unitPrice" DECIMAL(10,2),
ADD COLUMN "pricingMode" TEXT NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "discountType" TEXT,
ADD COLUMN "discountValue" DECIMAL(10,2),
ADD COLUMN "discountReason" TEXT;

ALTER TABLE "Event"
ADD COLUMN "globalDiscountType" TEXT,
ADD COLUMN "globalDiscountValue" DECIMAL(10,2),
ADD COLUMN "globalDiscountReason" TEXT;

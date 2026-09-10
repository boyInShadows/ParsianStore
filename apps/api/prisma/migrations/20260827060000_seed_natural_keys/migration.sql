-- DropIndex
DROP INDEX "ShippingRate_methodCode_zone_minWeightGram_idx";

-- CreateIndex
CREATE UNIQUE INDEX "ShippingRate_methodCode_zone_minWeightGram_key" ON "ShippingRate"("methodCode", "zone", "minWeightGram");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleEngine_genId_code_key" ON "VehicleEngine"("genId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleGen_modelId_yearFrom_key" ON "VehicleGen"("modelId", "yearFrom");


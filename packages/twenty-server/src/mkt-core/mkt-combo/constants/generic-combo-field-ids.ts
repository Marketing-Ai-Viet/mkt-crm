/**
 * /!\ DO NOT EDIT THE IDS OF THIS FILE /!\
 * Field IDs for generic combo entities
 */

export const MKT_GENERIC_COMBO_FIELD_IDS = {
  mktGenericCombo: {
    // Basic fields
    comboCode: 'b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e',
    name: 'c2d3e4f5-a6b7-8c9d-0e1f-2a3b4c5d6e7f',
    description: 'd3e4f5a6-b7c8-9d0e-1f2a-3b4c5d6e7f8a',
    pricingType: 'e4f5a6b7-c8d9-0e1f-2a3b-4c5d6e7f8a9b',
    fixedPrice: 'f5a6b7c8-d9e0-1f2a-3b4c-5d6e7f8a9b0c',
    discountPercent: 'a6b7c8d9-e0f1-2a3b-4c5d-6e7f8a9b0c1d',
    currency: 'b7c8d9e0-f1a2-3b4c-5d6e-7f8a9b0c1d2e',
    isActive: 'c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f',
    validFrom: 'd9e0f1a2-b3c4-5d6e-7f8a-9b0c1d2e3f4a',
    validTo: 'e0f1a2b3-c4d5-6e7f-8a9b-0c1d2e3f4a5b',
    metadata: 'f1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
    // Audit fields
    version: 'a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d',
    lastModifiedById: 'b3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e',
    // Relations
    items: 'c4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f',
  },

  mktGenericComboItem: {
    // Discriminator
    itemType: 'd5e6f7a8-b9c0-1d2e-3f4a-5b6c7d8e9f0a',

    // Common fields
    displayName: 'e6f7a8b9-c0d1-2e3f-4a5b-6c7d8e9f0a1b',
    quantity: 'f7a8b9c0-d1e2-3f4a-5b6c-7d8e9f0a1b2c',
    overridePrice: 'a8b9c0d1-e2f3-4a5b-6c7d-8e9f0a1b2c3d',
    position: 'b9c0d1e2-f3a4-5b6c-7d8e-9f0a1b2c3d4e',

    // DIGITAL_EXTERNAL fields
    externalProductId: 'c0d1e2f3-a4b5-6c7d-8e9f-0a1b2c3d4e5f',
    externalProductCode: 'd1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a',
    externalPackageId: 'e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b',
    externalPackageCode: 'f3a4b5c6-d7e8-9f0a-1b2c-3d4e5f6a7b8c',

    // INTERNAL_PRODUCT fields
    mktProductId: 'a4b5c6d7-e8f9-0a1b-2c3d-4e5f6a7b8c9d',

    // INTERNAL_VARIANT fields
    mktVariantId: 'b5c6d7e8-f9a0-1b2c-3d4e-5f6a7b8c9d0e',

    // SERVICE fields
    serviceName: 'c6d7e8f9-a0b1-2c3d-4e5f-6a7b8c9d0e1f',
    serviceDescription: 'd7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a',
    servicePrice: 'e8f9a0b1-c2d3-4e5f-6a7b-8c9d0e1f2a3b',

    // CUSTOM fields
    customName: 'f9a0b1c2-d3e4-5f6a-7b8c-9d0e1f2a3b4c',
    customDescription: 'a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d',
    customPrice: 'b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e',

    // Parent relation
    genericComboId: 'c2d3e4f5-a6b7-8c9d-0e1f-2a3b4c5d6e7f',
  },
} as const;

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ServerDataStore } from './dataStore';

test('ServerDataStore persists, updates, and deletes quote requests with status enforcement', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'protec-store-quotes-'));
  try {
    const store = new ServerDataStore(tempDir);

    const created = store.createQuote({
      fullName: 'Karim Mansour',
      phone: '01012345678',
      governorate: 'Cairo',
      area: 'New Cairo',
      address: 'Fifth Settlement Villa 12',
      serviceType: 'landscape-design',
      projectAreaSqm: 420,
      description: 'Need full garden redesign and drip irrigation.',
      attachments: [
        {
          id: 'att-1',
          filename: '1234-site.jpg',
          originalName: 'garden.jpg',
          mimeType: 'image/jpeg',
          size: 204800,
          kind: 'image',
          url: '/api/quotes/media/1234-site.jpg',
        },
      ],
    });

    assert.equal(created.ok, true);
    if (!created.ok) return;

    assert.equal(created.quote.status, 'new');
    assert.equal(created.quote.attachments.length, 1);

    const list = store.listQuotes();
    assert.equal(list.length, 1);
    assert.equal(list[0].fullName, 'Karim Mansour');

    const updated = store.updateQuote(created.quote.id, 'scheduled', 'Site survey Thursday 10 AM');
    assert.equal(updated.ok, true);
    if (updated.ok) {
      assert.equal(updated.quote.status, 'scheduled');
      assert.equal(updated.quote.adminNotes, 'Site survey Thursday 10 AM');
    }

    assert.equal(store.updateQuote(created.quote.id, 'invalid-status', '').ok, false);
    assert.equal(store.deleteQuote(created.quote.id), true);
    assert.equal(store.listQuotes().length, 0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('ServerDataStore persists new offer with uploaded photo URL alongside default offers', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'protec-store-offers-'));
  try {
    const store = new ServerDataStore(tempDir);
    const saved = store.upsertOffer({
      id: 'off-custom-photo',
      titleAr: 'باقة فحص وحماية النخيل',
      titleEn: 'Palm Protection Spring Package',
      descriptionAr: 'فحص ومعالجة وقائية متكاملة ضد سوسة النخيل الحمراء.',
      descriptionEn: 'Complete preventive palm weevil inspection and treatment.',
      discountLabelAr: 'خصم 25%',
      discountLabelEn: '25% OFF',
      originalPrice: '4000 EGP',
      offerPrice: '3000 EGP',
      expiresAt: '2026-12-31',
      serviceType: 'plant-protection',
      imageUrl: '/uploads/public/1700000-offer.jpg',
      active: true,
    });

    assert.equal(saved.ok, true);
    const catalog = store.getPublicCatalog();
    assert.ok(catalog.offers && catalog.offers.length >= 2);
    const added = catalog.offers?.find((o) => o.id === 'off-custom-photo');
    assert.ok(added);
    assert.equal(added.imageUrl, '/uploads/public/1700000-offer.jpg');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

const path = require('path');
// Force override any existing env vars with values from .env
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });
const mongoose = require('mongoose');
console.log('[SEED] MONGODB_URI:', process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/:([^@]+)@/, ':***@') : 'NOT SET');

const User = require('../models/User.model');
const Tenant = require('../models/Tenant.model');
const Subscription = require('../models/Subscription.model');
const Maintenance = require('../models/Maintenance.model');
const Complaint = require('../models/Complaint.model');
const Visitor = require('../models/Visitor.model');
const Inventory = require('../models/Inventory.model');
const Parking = require('../models/Parking.model');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // ── CLEAN SLATE (drop all collections to reset indexes) ──────────
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      await db.dropCollection(col.name).catch(() => {});
    }
    // Re-sync indexes via Mongoose
    await Promise.all([
      User.syncIndexes(),
      Tenant.syncIndexes(),
      Subscription.syncIndexes(),
      Maintenance.syncIndexes(),
      Complaint.syncIndexes(),
      Visitor.syncIndexes(),
      Inventory.syncIndexes(),
      Parking.syncIndexes(),
    ]);
    console.log('🧹 Database cleared and indexes synced');

    // ── PLATFORM OWNER ──────────────────────────────────────────────
    const platformOwner = await User.create({
      name: 'Platform Owner',
      email: process.env.PLATFORM_OWNER_EMAIL || 'owner@societytracker.com',
      password: process.env.PLATFORM_OWNER_PASSWORD || 'PlatformOwner@2024!',
      role: 'PLATFORM_OWNER',
      tenantId: null,
      isEmailVerified: true,
    });
    console.log('👑 Platform Owner created:', platformOwner.email);

    // ── SUPER ADMIN ──────────────────────────────────────────────────
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@societytracker.com',
      password: 'SuperAdmin@2024!',
      role: 'SUPER_ADMIN',
      tenantId: null,
      isEmailVerified: true,
    });
    console.log('🛡️  Super Admin created:', superAdmin.email);

    // ── TENANT 1: GREEN VALLEY HOMES ─────────────────────────────────
    const tenant1 = await Tenant.create({
      name: 'Green Valley Homes',
      slug: 'green-valley-homes',
      contactEmail: 'admin@greenvalley.com',
      contactPhone: '9876543210',
      address: { street: '123, Green Avenue', city: 'Bangalore', state: 'Karnataka', pincode: '560001' },
      totalFlats: 48,
      totalBlocks: 4,
      subscription: {
        plan: 'PRO',
        status: 'active',
        flatLimit: 200,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      isActive: true,
    });
    console.log('🏢 Tenant 1 created:', tenant1.name);

    // ── TENANT 2: SUNRISE SOCIETY ────────────────────────────────────
    const tenant2 = await Tenant.create({
      name: 'Sunrise Society',
      slug: 'sunrise-society',
      contactEmail: 'admin@sunrisesociety.com',
      contactPhone: '9876543211',
      address: { street: '456, Sunrise Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
      totalFlats: 30,
      totalBlocks: 2,
      subscription: {
        plan: 'BASIC',
        status: 'active',
        flatLimit: 50,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      isActive: true,
    });
    console.log('🌅 Tenant 2 created:', tenant2.name);

    // ── SOCIETY ADMIN for Tenant 1 ───────────────────────────────────
    const societyAdmin1 = await User.create({
      name: 'Rajesh Kumar',
      email: 'admin@greenvalley.com',
      password: 'SocietyAdmin@2024!',
      role: 'SOCIETY_ADMIN',
      tenantId: tenant1._id,
      phone: '9876543210',
      isEmailVerified: true,
    });
    console.log('👔 Society Admin 1 created:', societyAdmin1.email);

    // ── SOCIETY ADMIN for Tenant 2 ───────────────────────────────────
    const societyAdmin2 = await User.create({
      name: 'Priya Singh',
      email: 'admin@sunrisesociety.com',
      password: 'SocietyAdmin@2024!',
      role: 'SOCIETY_ADMIN',
      tenantId: tenant2._id,
      phone: '9876543211',
      isEmailVerified: true,
    });

    // ── SUB ADMIN for Tenant 1 ───────────────────────────────────────
    const subAdmin1 = await User.create({
      name: 'Amit Sharma',
      email: 'security@greenvalley.com',
      password: 'SubAdmin@2024!',
      role: 'SUB_ADMIN',
      tenantId: tenant1._id,
      phone: '9876543212',
      isEmailVerified: true,
    });

    // ── RESIDENTS for Tenant 1 ───────────────────────────────────────
    const residentsData = [
      { name: 'Ankit Verma', email: 'ankit@resident.com', flatNumber: '101', block: 'A', phone: '9876543213' },
      { name: 'Sunita Patel', email: 'sunita@resident.com', flatNumber: '102', block: 'A', phone: '9876543214' },
      { name: 'Vikram Nair', email: 'vikram@resident.com', flatNumber: '103', block: 'A', phone: '9876543215' },
      { name: 'Meena Joshi', email: 'meena@resident.com', flatNumber: '201', block: 'B', phone: '9876543216' },
      { name: 'Deepak Gupta', email: 'deepak@resident.com', flatNumber: '202', block: 'B', phone: '9876543217' },
      { name: 'Kavitha Rao', email: 'kavitha@resident.com', flatNumber: '203', block: 'B', phone: '9876543218' },
    ];

    const residents = await User.insertMany(
      residentsData.map((r) => ({
        ...r,
        password: 'Resident@2024!',
        role: 'USER',
        tenantId: tenant1._id,
        isEmailVerified: true,
      }))
    );
    console.log(`👫 ${residents.length} Residents created for Tenant 1`);

    // ── SUBSCRIPTIONS ────────────────────────────────────────────────
    await Subscription.insertMany([
      {
        tenantId: tenant1._id,
        plan: 'PRO',
        status: 'active',
        flatLimit: 200,
        amount: 2999,
        currency: 'usd',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        tenantId: tenant2._id,
        plan: 'BASIC',
        status: 'active',
        flatLimit: 50,
        amount: 999,
        currency: 'usd',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    ]);

    // ── MAINTENANCE BILLS ────────────────────────────────────────────
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const maintenanceBills = [];

    for (const resident of residents) {
      maintenanceBills.push({
        tenantId: tenant1._id,
        userId: resident._id,
        flatNumber: resident.flatNumber,
        block: resident.block,
        month: currentMonth,
        year: currentYear,
        amount: 2500,
        dueDate: new Date(currentYear, currentMonth - 1, 5),
        status: Math.random() > 0.5 ? 'paid' : 'pending',
        paidDate: Math.random() > 0.5 ? new Date() : null,
      });
      // Previous month
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      maintenanceBills.push({
        tenantId: tenant1._id,
        userId: resident._id,
        flatNumber: resident.flatNumber,
        block: resident.block,
        month: prevMonth,
        year: prevYear,
        amount: 2500,
        dueDate: new Date(prevYear, prevMonth - 1, 5),
        status: 'paid',
        paidDate: new Date(),
        receiptNumber: `RCP-${Date.now() + Math.random()}-${resident.flatNumber}`,
      });
    }
    await Maintenance.insertMany(maintenanceBills);
    console.log(`💰 ${maintenanceBills.length} Maintenance bills created`);

    // ── COMPLAINTS ───────────────────────────────────────────────────
    const complaints = [
      {
        tenantId: tenant1._id,
        raisedBy: residents[0]._id,
        title: 'Water leakage in bathroom',
        description: 'There is a major water leakage from the ceiling of my bathroom. It has been dripping for 3 days now and causing damage to the floor.',
        category: 'plumbing',
        priority: 'high',
        status: 'open',
        flatNumber: residents[0].flatNumber,
        block: residents[0].block,
      },
      {
        tenantId: tenant1._id,
        raisedBy: residents[1]._id,
        title: 'Lift not working on 2nd floor',
        description: 'The lift is not stopping on the 2nd floor since morning. Elderly residents are having difficulty.',
        category: 'lift',
        priority: 'urgent',
        status: 'in_progress',
        assignedTo: subAdmin1._id,
        flatNumber: residents[1].flatNumber,
        block: residents[1].block,
      },
      {
        tenantId: tenant1._id,
        raisedBy: residents[2]._id,
        title: 'Noise from adjacent flat',
        description: 'The flat next to mine plays loud music late at night, affecting sleep. Requested multiple times but no action.',
        category: 'noise',
        priority: 'medium',
        status: 'open',
        flatNumber: residents[2].flatNumber,
        block: residents[2].block,
      },
      {
        tenantId: tenant1._id,
        raisedBy: residents[3]._id,
        title: 'Parking area light not working',
        description: 'The parking area light on the B block side is not working. It\'s a safety hazard at night.',
        category: 'electrical',
        priority: 'medium',
        status: 'resolved',
        resolution: 'Light bulb replaced. Issue resolved.',
        resolvedAt: new Date(),
        flatNumber: residents[3].flatNumber,
        block: residents[3].block,
      },
    ];
    await Complaint.insertMany(complaints);
    console.log(`📋 ${complaints.length} Complaints created`);

    // ── VISITORS ─────────────────────────────────────────────────────
    const visitorRecords = [
      {
        tenantId: tenant1._id,
        hostId: residents[0]._id,
        name: 'Ramesh Visitor',
        phone: '9800001111',
        purpose: 'personal',
        flatNumber: residents[0].flatNumber,
        block: residents[0].block,
        status: 'checked_in',
        checkInTime: new Date(),
        expectedDate: new Date(),
      },
      {
        tenantId: tenant1._id,
        hostId: residents[1]._id,
        name: 'Amazon Delivery',
        phone: '9800002222',
        purpose: 'delivery',
        flatNumber: residents[1].flatNumber,
        block: residents[1].block,
        status: 'checked_out',
        checkInTime: new Date(Date.now() - 3600000),
        checkOutTime: new Date(),
        expectedDate: new Date(),
      },
      {
        tenantId: tenant1._id,
        hostId: residents[2]._id,
        name: 'Suresh Plumber',
        phone: '9800003333',
        purpose: 'maintenance',
        flatNumber: residents[2].flatNumber,
        block: residents[2].block,
        status: 'pending',
        expectedDate: new Date(Date.now() + 86400000),
      },
    ];
    await Visitor.insertMany(visitorRecords);
    console.log(`🚪 ${visitorRecords.length} Visitor records created`);

    // ── INVENTORY ────────────────────────────────────────────────────
    const inventoryItems = [
      { tenantId: tenant1._id, name: 'LED Bulbs (9W)', category: 'electrical', quantity: 24, minimumStock: 10, unit: 'pieces', purchasePrice: 120, vendor: 'Electric House' },
      { tenantId: tenant1._id, name: 'Cleaning Liquid', category: 'cleaning', quantity: 8, minimumStock: 5, unit: 'liters', purchasePrice: 150, vendor: 'CleanCo' },
      { tenantId: tenant1._id, name: 'CCTV Camera', category: 'security', quantity: 2, minimumStock: 1, unit: 'pieces', purchasePrice: 3500, vendor: 'SecureTech' },
      { tenantId: tenant1._id, name: 'Garden Hose', category: 'garden', quantity: 3, minimumStock: 2, unit: 'pieces', purchasePrice: 800, vendor: 'GardenMart' },
      { tenantId: tenant1._id, name: 'Fire Extinguisher', category: 'security', quantity: 6, minimumStock: 6, unit: 'pieces', purchasePrice: 1200, vendor: 'FireSafe' },
      { tenantId: tenant1._id, name: 'Motor Oil (Lift)', category: 'electrical', quantity: 2, minimumStock: 3, unit: 'liters', purchasePrice: 450, vendor: 'TechLube' },
    ];
    await Inventory.insertMany(inventoryItems);
    console.log(`📦 ${inventoryItems.length} Inventory items created`);

    // ── PARKING SLOTS ────────────────────────────────────────────────
    const parkingSlots = [
      { tenantId: tenant1._id, slotNumber: 'A-01', parkingType: 'four_wheeler', status: 'occupied', assignedTo: residents[0]._id, vehicleNumber: 'KA01AB1234', monthlyCharge: 500 },
      { tenantId: tenant1._id, slotNumber: 'A-02', parkingType: 'four_wheeler', status: 'available', monthlyCharge: 500 },
      { tenantId: tenant1._id, slotNumber: 'A-03', parkingType: 'two_wheeler', status: 'occupied', assignedTo: residents[1]._id, vehicleNumber: 'KA01CD5678', monthlyCharge: 200 },
      { tenantId: tenant1._id, slotNumber: 'A-04', parkingType: 'two_wheeler', status: 'available', monthlyCharge: 200 },
      { tenantId: tenant1._id, slotNumber: 'V-01', parkingType: 'visitor', status: 'available', monthlyCharge: 0 },
      { tenantId: tenant1._id, slotNumber: 'V-02', parkingType: 'visitor', status: 'available', monthlyCharge: 0 },
      { tenantId: tenant1._id, slotNumber: 'B-01', parkingType: 'four_wheeler', status: 'occupied', assignedTo: residents[3]._id, vehicleNumber: 'KA02EF9012', monthlyCharge: 500 },
      { tenantId: tenant1._id, slotNumber: 'B-02', parkingType: 'four_wheeler', status: 'available', monthlyCharge: 500 },
    ];
    await Parking.insertMany(parkingSlots);
    console.log(`🚗 ${parkingSlots.length} Parking slots created`);

    console.log('\n====================================');
    console.log('🎉 SEED COMPLETE!');
    console.log('====================================');
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('─────────────────────────────────────');
    console.log('PLATFORM OWNER:');
    console.log(`  Email: ${process.env.PLATFORM_OWNER_EMAIL || 'owner@societytracker.com'}`);
    console.log(`  Password: ${process.env.PLATFORM_OWNER_PASSWORD || 'PlatformOwner@2024!'}`);
    console.log('\nSUPER ADMIN:');
    console.log('  Email: superadmin@societytracker.com');
    console.log('  Password: SuperAdmin@2024!');
    console.log('\nSOCIETY ADMIN (Green Valley Homes):');
    console.log('  Email: admin@greenvalley.com');
    console.log('  Password: SocietyAdmin@2024!');
    console.log('  Tenant ID:', tenant1._id.toString());
    console.log('\nSOCIETY ADMIN (Sunrise Society):');
    console.log('  Email: admin@sunrisesociety.com');
    console.log('  Password: SocietyAdmin@2024!');
    console.log('  Tenant ID:', tenant2._id.toString());
    console.log('\nRESIDENT:');
    console.log('  Email: ankit@resident.com');
    console.log('  Password: Resident@2024!');
    console.log('  Flat: A-101, Green Valley Homes');
    console.log('─────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

seed();

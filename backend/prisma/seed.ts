import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function setTime(date: Date, hour: number, minute: number = 0): Date {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log('Seeding database...');

  const existing = await prisma.user.count();
  if (existing > 0) {
    console.log('Database already seeded, skipping.');
    return;
  }

  const hashedAdmin = await bcrypt.hash('Admin123!', 10);
  const hashedStaff = await bcrypt.hash('Staff123!', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@nailsalon.com' },
    update: {},
    create: { email: 'admin@nailsalon.com', password: hashedAdmin, role: 'ADMIN', name: 'Admin User' },
  });

  const linaUser = await prisma.user.upsert({
    where: { email: 'lina@nailsalon.com' },
    update: {},
    create: { email: 'lina@nailsalon.com', password: hashedStaff, role: 'STAFF', name: 'Lina Nguyen' },
  });

  const milaUser = await prisma.user.upsert({
    where: { email: 'mila@nailsalon.com' },
    update: {},
    create: { email: 'mila@nailsalon.com', password: hashedStaff, role: 'STAFF', name: 'Mila Tran' },
  });

  const sophiaUser = await prisma.user.upsert({
    where: { email: 'sophia@nailsalon.com' },
    update: {},
    create: { email: 'sophia@nailsalon.com', password: hashedStaff, role: 'STAFF', name: 'Sophia Le' },
  });

  const adminStaff = await prisma.staff.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id, name: 'Admin User', phone: '555-000-0001', email: 'admin@nailsalon.com', hireDate: new Date('2020-01-15'), specialization: 'Management', commissionRate: 0.5, isActive: true },
  });

  const linaStaff = await prisma.staff.upsert({
    where: { userId: linaUser.id },
    update: {},
    create: { userId: linaUser.id, name: 'Lina Nguyen', phone: '555-100-2001', email: 'lina@nailsalon.com', hireDate: new Date('2021-03-10'), specialization: 'Gel Nails & Nail Art', commissionRate: 0.42, isActive: true },
  });

  const milaStaff = await prisma.staff.upsert({
    where: { userId: milaUser.id },
    update: {},
    create: { userId: milaUser.id, name: 'Mila Tran', phone: '555-100-2002', email: 'mila@nailsalon.com', hireDate: new Date('2022-06-01'), specialization: 'Classic Manicure & Pedicure', commissionRate: 0.40, isActive: true },
  });

  const sophiaStaff = await prisma.staff.upsert({
    where: { userId: sophiaUser.id },
    update: {},
    create: { userId: sophiaUser.id, name: 'Sophia Le', phone: '555-100-2003', email: 'sophia@nailsalon.com', hireDate: new Date('2023-01-20'), specialization: 'Acrylic & Dip Powder', commissionRate: 0.38, isActive: true },
  });

  console.log('Users and staff created.');

  const customers = await Promise.all([
    prisma.customer.create({ data: { name: 'Emma Johnson',    phone: '555-201-0001', email: 'emma.johnson@email.com',    birthday: new Date('1990-04-12'), notes: 'Prefers OPI polishes',         loyaltyPoints: 150 } }),
    prisma.customer.create({ data: { name: 'Olivia Smith',    phone: '555-201-0002', email: 'olivia.smith@email.com',    birthday: new Date('1988-07-23'), notes: 'Allergic to acrylic monomer',  loyaltyPoints: 80  } }),
    prisma.customer.create({ data: { name: 'Ava Williams',    phone: '555-201-0003', email: 'ava.williams@email.com',    birthday: new Date('1995-11-05'), notes: null,                           loyaltyPoints: 220 } }),
    prisma.customer.create({ data: { name: 'Isabella Brown',  phone: '555-201-0004', email: 'isabella.brown@email.com',  birthday: new Date('1993-02-18'), notes: 'VIP — always tip well',        loyaltyPoints: 400 } }),
    prisma.customer.create({ data: { name: 'Sophia Davis',    phone: '555-201-0005', email: 'sophia.davis@email.com',    birthday: new Date('1998-08-30'), notes: 'First visit discount applied', loyaltyPoints: 30  } }),
    prisma.customer.create({ data: { name: 'Mia Miller',      phone: '555-201-0006', email: 'mia.miller@email.com',      birthday: new Date('1985-12-01'), notes: null,                           loyaltyPoints: 110 } }),
    prisma.customer.create({ data: { name: 'Charlotte Wilson',phone: '555-201-0007', email: 'charlotte.w@email.com',     birthday: new Date('1992-06-14'), notes: 'Sensitive cuticles',           loyaltyPoints: 60  } }),
    prisma.customer.create({ data: { name: 'Amelia Moore',    phone: '555-201-0008', email: 'amelia.moore@email.com',    birthday: new Date('2000-03-27'), notes: null,                           loyaltyPoints: 20  } }),
    prisma.customer.create({ data: { name: 'Harper Taylor',   phone: '555-201-0009', email: 'harper.taylor@email.com',   birthday: new Date('1996-09-09'), notes: 'Prefers short nails',          loyaltyPoints: 180 } }),
    prisma.customer.create({ data: { name: 'Evelyn Anderson', phone: '555-201-0010', email: 'evelyn.a@email.com',        birthday: new Date('1991-01-22'), notes: 'Bi-weekly regular',            loyaltyPoints: 500 } }),
  ]);

  console.log('Customers created.');

  const services = await Promise.all([
    prisma.service.create({ data: { name: 'Classic Manicure',    description: 'Shaping, cuticle care, and polish',           duration: 30, price: 20, category: 'Manicure', isActive: true } }),
    prisma.service.create({ data: { name: 'Gel Manicure',        description: 'Long-lasting gel polish with UV curing',       duration: 45, price: 35, category: 'Manicure', isActive: true } }),
    prisma.service.create({ data: { name: 'Acrylic Full Set',    description: 'Full acrylic nail extensions with polish',     duration: 90, price: 55, category: 'Acrylic',  isActive: true } }),
    prisma.service.create({ data: { name: 'Acrylic Fill',        description: 'Fill-in for existing acrylic nails',           duration: 60, price: 35, category: 'Acrylic',  isActive: true } }),
    prisma.service.create({ data: { name: 'Classic Pedicure',    description: 'Foot soak, scrub, cuticle care, and polish',   duration: 45, price: 30, category: 'Pedicure', isActive: true } }),
    prisma.service.create({ data: { name: 'Deluxe Pedicure',     description: 'Classic pedicure + paraffin and massage',      duration: 70, price: 50, category: 'Pedicure', isActive: true } }),
    prisma.service.create({ data: { name: 'Dip Powder Manicure', description: 'Durable dip powder, no UV lamp required',      duration: 60, price: 45, category: 'Manicure', isActive: true } }),
    prisma.service.create({ data: { name: 'Nail Art (per nail)', description: 'Custom designs, gems, or stamping per nail',   duration: 10, price: 5,  category: 'Nail Art', isActive: true } }),
  ]);

  console.log('Services created.');

  const staffList = [linaStaff, milaStaff, sophiaStaff, adminStaff];

  type ApptDef = {
    daysBack: number; hour: number; custIdx: number; svcIdx: number; staffIdx: number;
    tip: number; status: string; pm: string | null; ps: string;
  };

  const appointmentDefs: ApptDef[] = [
    { daysBack: 28, hour: 10, custIdx: 0, svcIdx: 1, staffIdx: 0, tip: 5,  status: 'COMPLETED', pm: 'CARD',              ps: 'PAID'   },
    { daysBack: 25, hour: 11, custIdx: 1, svcIdx: 4, staffIdx: 1, tip: 4,  status: 'COMPLETED', pm: 'CASH',              ps: 'PAID'   },
    { daysBack: 22, hour: 14, custIdx: 2, svcIdx: 2, staffIdx: 2, tip: 8,  status: 'COMPLETED', pm: 'CARD',              ps: 'PAID'   },
    { daysBack: 20, hour: 10, custIdx: 3, svcIdx: 5, staffIdx: 0, tip: 10, status: 'COMPLETED', pm: 'CASH',              ps: 'PAID'   },
    { daysBack: 18, hour: 13, custIdx: 4, svcIdx: 0, staffIdx: 1, tip: 3,  status: 'COMPLETED', pm: 'CARD',              ps: 'PAID'   },
    { daysBack: 15, hour: 15, custIdx: 5, svcIdx: 6, staffIdx: 2, tip: 7,  status: 'COMPLETED', pm: 'CASH',              ps: 'PAID'   },
    { daysBack: 14, hour: 10, custIdx: 6, svcIdx: 3, staffIdx: 0, tip: 5,  status: 'COMPLETED', pm: 'CARD',              ps: 'PAID'   },
    { daysBack: 12, hour: 11, custIdx: 7, svcIdx: 1, staffIdx: 1, tip: 6,  status: 'COMPLETED', pm: 'GIFT_CERTIFICATE',  ps: 'PAID'   },
    { daysBack: 10, hour: 14, custIdx: 8, svcIdx: 4, staffIdx: 2, tip: 4,  status: 'COMPLETED', pm: 'CASH',              ps: 'PAID'   },
    { daysBack: 7,  hour: 10, custIdx: 9, svcIdx: 5, staffIdx: 0, tip: 10, status: 'COMPLETED', pm: 'CARD',              ps: 'PAID'   },
    { daysBack: 5,  hour: 11, custIdx: 0, svcIdx: 7, staffIdx: 1, tip: 2,  status: 'COMPLETED', pm: 'CASH',              ps: 'PAID'   },
    { daysBack: 3,  hour: 13, custIdx: 1, svcIdx: 2, staffIdx: 2, tip: 8,  status: 'COMPLETED', pm: 'CARD',              ps: 'PAID'   },
    { daysBack: -2, hour: 10, custIdx: 2, svcIdx: 1, staffIdx: 0, tip: 0,  status: 'CONFIRMED', pm: null,                ps: 'UNPAID' },
    { daysBack: -3, hour: 14, custIdx: 3, svcIdx: 5, staffIdx: 1, tip: 0,  status: 'CONFIRMED', pm: null,                ps: 'UNPAID' },
    { daysBack: 8,  hour: 15, custIdx: 4, svcIdx: 3, staffIdx: 2, tip: 0,  status: 'CANCELLED', pm: null,                ps: 'UNPAID' },
  ];

  const appointments: any[] = [];

  for (const def of appointmentDefs) {
    const baseDate = daysAgo(def.daysBack);
    const svc      = services[def.svcIdx];
    const staff    = staffList[def.staffIdx];
    const customer = customers[def.custIdx];
    const start    = setTime(baseDate, def.hour);
    const end      = new Date(start.getTime() + svc.duration * 60 * 1000);

    const appt = await prisma.appointment.create({
      data: {
        customerId: customer.id, staffId: staff.id, serviceId: svc.id,
        date: baseDate, startTime: start, endTime: end,
        status: def.status, totalPrice: svc.price, tip: def.tip,
        paymentMethod: def.pm, paymentStatus: def.ps, notes: null,
      },
    });
    appointments.push(appt);
  }

  console.log('Appointments created.');

  const completedAppts = appointments.filter((_, i) => appointmentDefs[i].status === 'COMPLETED');

  for (let i = 0; i < completedAppts.length; i++) {
    const appt = completedAppts[i];
    const def  = appointmentDefs[i];

    await prisma.revenue.create({
      data: { date: appt.date, appointmentId: appt.id, amount: appt.totalPrice, type: 'SERVICE', paymentMethod: def.pm!, notes: `Service for appt ${appt.id}` },
    });

    if (appt.tip > 0) {
      await prisma.revenue.create({
        data: { date: appt.date, appointmentId: appt.id, amount: appt.tip, type: 'TIP', paymentMethod: def.pm!, notes: `Tip for appt ${appt.id}` },
      });
    }
  }

  console.log('Revenue records created.');

  for (let i = 0; i < completedAppts.length; i++) {
    const appt    = completedAppts[i];
    const def     = appointmentDefs[i];
    const staff   = staffList[def.staffIdx];
    const rate    = staff.commissionRate;
    const baseDate = daysAgo(def.daysBack);
    const period  = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}`;

    await prisma.commission.create({
      data: {
        staffId: staff.id, appointmentId: appt.id,
        amount: parseFloat((appt.totalPrice * rate).toFixed(2)),
        rate, period,
        isPaid: def.daysBack > 14,
        paidAt: def.daysBack > 14 ? daysAgo(def.daysBack - 7) : null,
      },
    });
  }

  console.log('Commissions created.');

  await prisma.supply.createMany({
    data: [
      { name: 'OPI Nail Polish — Bubble Bath', category: 'Polish',    quantity: 12, unit: 'bottle', reorderLevel: 3,  costPerUnit: 8.50,  supplier: 'OPI Professional',   lastRestocked: daysAgo(10) },
      { name: 'Acetone (Pure)',                category: 'Chemical',  quantity: 4,  unit: 'liter',  reorderLevel: 1,  costPerUnit: 6.00,  supplier: 'Beauty Supply Co',   lastRestocked: daysAgo(5)  },
      { name: 'Acrylic Liquid Monomer',        category: 'Chemical',  quantity: 2,  unit: 'liter',  reorderLevel: 1,  costPerUnit: 18.00, supplier: 'Nail Supply Pro',    lastRestocked: daysAgo(15) },
      { name: 'Acrylic Powder — Clear',        category: 'Powder',    quantity: 3,  unit: 'oz',     reorderLevel: 1,  costPerUnit: 12.00, supplier: 'Nail Supply Pro',    lastRestocked: daysAgo(15) },
      { name: 'UV/LED Gel Top Coat',           category: 'Gel',       quantity: 8,  unit: 'bottle', reorderLevel: 2,  costPerUnit: 14.50, supplier: 'Gelish Wholesale',   lastRestocked: daysAgo(8)  },
      { name: 'Nail Files (180/240 grit)',     category: 'Tools',     quantity: 50, unit: 'piece',  reorderLevel: 10, costPerUnit: 0.50,  supplier: 'Beauty Supply Co',   lastRestocked: daysAgo(20) },
      { name: 'Cuticle Oil — Lavender',        category: 'Treatment', quantity: 10, unit: 'bottle', reorderLevel: 3,  costPerUnit: 5.00,  supplier: 'OPI Professional',   lastRestocked: daysAgo(12) },
      { name: 'Nitrile Gloves (Medium)',       category: 'PPE',       quantity: 2,  unit: 'box',    reorderLevel: 1,  costPerUnit: 9.00,  supplier: 'Medical Supply Inc', lastRestocked: daysAgo(3)  },
      { name: 'Foot Scrub — Peppermint',       category: 'Treatment', quantity: 5,  unit: 'jar',    reorderLevel: 2,  costPerUnit: 11.00, supplier: 'Spa Products Ltd',   lastRestocked: daysAgo(18) },
      { name: 'Dip Powder — Nude Rose',        category: 'Powder',    quantity: 6,  unit: 'jar',    reorderLevel: 2,  costPerUnit: 15.00, supplier: 'SNS Nails',          lastRestocked: daysAgo(7)  },
    ],
  });

  console.log('Supplies created.');

  const futureDate = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d; };

  await prisma.giftCertificate.createMany({
    data: [
      { code: 'GIFT-2026-001', originalAmount: 50,  remainingBalance: 50,  purchaserName: 'James Johnson', purchaserEmail: 'james.j@email.com',  recipientName: 'Emma Johnson',  expiresAt: futureDate(365), isActive: true, notes: 'Birthday gift' },
      { code: 'GIFT-2026-002', originalAmount: 75,  remainingBalance: 40,  purchaserName: 'Robert Smith',  purchaserEmail: 'robert.s@email.com', recipientName: 'Olivia Smith',  expiresAt: futureDate(180), isActive: true, notes: 'Anniversary gift — partially used' },
      { code: 'GIFT-2026-003', originalAmount: 100, remainingBalance: 100, purchaserName: 'Linda Moore',   purchaserEmail: 'linda.moore@email.com', recipientName: 'Amelia Moore', expiresAt: futureDate(90), isActive: true, notes: "Mother's Day gift" },
    ],
  });

  await prisma.revenue.createMany({
    data: [
      { amount: 50,  type: 'GIFT_CERT_PURCHASE', paymentMethod: 'CARD', notes: 'Gift cert GIFT-2026-001', date: daysAgo(20) },
      { amount: 75,  type: 'GIFT_CERT_PURCHASE', paymentMethod: 'CASH', notes: 'Gift cert GIFT-2026-002', date: daysAgo(45) },
      { amount: 100, type: 'GIFT_CERT_PURCHASE', paymentMethod: 'CARD', notes: 'Gift cert GIFT-2026-003', date: daysAgo(10) },
    ],
  });

  console.log('Gift certificates and revenue created.');
  console.log('Database seeding complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
